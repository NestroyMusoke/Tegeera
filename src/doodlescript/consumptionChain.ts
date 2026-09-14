import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const clean = (value: string) => value.trim().replace(/^(?:a|an|the)\s+/, "");
const readable = (value: string) => value.length > 0 && value.length <= 28 && value.split(/\s+/).length <= 4 && /^[a-z][a-z0-9 '-]*$/.test(value);
export interface ConsumptionChainMatch { chainText: string; sourceText: string; firstText: string; secondText: string; thirdText: string }
const complete = (result: ConsumptionChainMatch) => Object.values(result).every(readable)
  && new Set([result.sourceText, result.firstText, result.secondText, result.thirdText]).size === 4;

export function matchConsumptionChain(text: string): ConsumptionChainMatch | null {
  const story = text.match(/^(?:the )?(.+?) starts with (.+?), then (?:a |an |the )?(.+?) eats it, then (?:a |an |the )?(.+?) eats (?:a |an |the )?(.+?), then (?:a |an |the )?(.+?) eats (?:a |an |the )?(.+)$/);
  if (story) {
    const firstText = clean(story[3]); const secondText = clean(story[4]);
    if (clean(story[5]) !== firstText || clean(story[7]) !== secondText) return null;
    const result = { chainText: clean(story[1]), sourceText: clean(story[2]), firstText, secondText, thirdText: clean(story[6]) };
    return complete(result) ? result : null;
  }
  const direct = text.match(/^(.+?) is eaten by (.+?), which is eaten by (.+?), which is eaten by (.+?)$/);
  if (!direct) return null;
  const result = { chainText: "consumption chain", sourceText: clean(direct[1]), firstText: clean(direct[2]), secondText: clean(direct[3]), thirdText: clean(direct[4]) };
  return complete(result) ? result : null;
}

export const isConsumptionChainRelation = (relation: SceneRelation) => relation.kind === "chainStartsWith" || relation.kind === "eatenBy";
export function consumptionChainGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const links = relations.filter(isConsumptionChainRelation); if (links.length !== 4) return null;
  const start = links.find(({ kind }) => kind === "chainStartsWith"); const eaten = links.filter(({ kind }) => kind === "eatenBy");
  if (!start || eaten.length !== 3) return null;
  const byId = new Map(entities.map((entity) => [entity.id, entity] as const)); const chain = byId.get(start.sourceIds[0]); const source = byId.get(start.targetIds[0]);
  const e1 = source && eaten.find(({ sourceIds }) => sourceIds[0] === source.id); const first = e1 && byId.get(e1.targetIds[0]);
  const e2 = first && eaten.find(({ sourceIds }) => sourceIds[0] === first.id); const second = e2 && byId.get(e2.targetIds[0]);
  const e3 = second && eaten.find(({ sourceIds }) => sourceIds[0] === second.id); const third = e3 && byId.get(e3.targetIds[0]);
  if (!chain || !source || !first || !second || !third || new Set([chain.id, source.id, first.id, second.id, third.id]).size !== 5) return null;
  if (chain.visualRole !== "chain-title" || source.visualRole !== "chain-source" || first.visualRole !== "chain-consumer-1" || second.visualRole !== "chain-consumer-2" || third.visualRole !== "chain-consumer-3") return null;
  if (!(source.x < first.x && first.x < second.x && second.x < third.x)) return null;
  return { chain, members: [source, first, second, third] as const };
}

export function planConsumptionChain(scene: SceneState, ids: { chainId: string; sourceId: string; firstId: string; secondId: string; thirdId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 5) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const)); if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const ordered = [ids.chainId, ids.sourceId, ids.firstId, ids.secondId, ids.thirdId]; const positions = [[10, 18], [14, 50], [38, 50], [62, 50], [86, 50]] as const;
  const candidate = ordered.map((id, i) => ({ ...byId.get(id)!, x: positions[i][0], y: positions[i][1] }));
  const planned: SceneRelation[] = [{ id: "s", kind: "chainStartsWith", sourceIds: [ids.chainId], targetIds: [ids.sourceId] }, { id: "e1", kind: "eatenBy", sourceIds: [ids.sourceId], targetIds: [ids.firstId] }, { id: "e2", kind: "eatenBy", sourceIds: [ids.firstId], targetIds: [ids.secondId] }, { id: "e3", kind: "eatenBy", sourceIds: [ids.secondId], targetIds: [ids.thirdId] }];
  const selected = selectLayoutCandidate(scene, [candidate], { family: "consumption-chain", validate: (projected) => Boolean(consumptionChainGeometry(planned, projected)) })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
