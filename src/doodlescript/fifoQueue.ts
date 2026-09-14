import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const clean = (value: string) => value.trim().replace(/^(?:a|an|the)\s+/, "");
const readable = (value: string) => value.length > 0 && value.length <= 30 && value.split(/\s+/).length <= 4 && /^[a-z][a-z0-9 '-]*$/.test(value);
export interface FifoQueueMatch { queueText: string; serviceText: string; firstText: string; secondText: string; thirdText: string }

/** Retains FIFO structure while deliberately discarding literal line/people analogies. */
export function matchFifoQueue(text: string): FifoQueueMatch | null {
  const patterns = [
    /^(.+?) works like (?:a |the )?line at (?:a |the )?(.+?) — first come, first served$/,
    /^in (?:a |the )?(.+?), (?:the )?first (?:item|entry|task|request) (?:in|to arrive) is (?:the )?first (?:served|out|processed)$/
  ];
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (!match) return null;
  const queueText = clean(match[1]); const serviceText = "service";
  const values = { queueText, serviceText, firstText: "item 1", secondText: "item 2", thirdText: "item 3" };
  return Object.values(values).every(readable) ? values : null;
}

export const isFifoRelation = (relation: SceneRelation) => relation.kind === "fifoBefore" || relation.kind === "servedBy";
export function fifoGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const edges = relations.filter(isFifoRelation); if (edges.length !== 3) return null;
  const orders = edges.filter(({ kind }) => kind === "fifoBefore"); const serve = edges.find(({ kind }) => kind === "servedBy");
  if (orders.length !== 2 || !serve) return null;
  const byId = new Map(entities.map((entity) => [entity.id, entity] as const));
  const first = byId.get(serve.sourceIds[0]); const service = byId.get(serve.targetIds[0]);
  const firstOrder = first && orders.find(({ sourceIds }) => sourceIds[0] === first.id);
  const second = firstOrder && byId.get(firstOrder.targetIds[0]);
  const secondOrder = second && orders.find(({ sourceIds }) => sourceIds[0] === second.id);
  const third = secondOrder && byId.get(secondOrder.targetIds[0]);
  if (!first || !second || !third || !service || first.visualRole !== "fifo-first" || second.visualRole !== "fifo-second" || third.visualRole !== "fifo-third" || service.visualRole !== "fifo-service" || new Set([first.id, second.id, third.id, service.id]).size !== 4 || !(third.x < second.x && second.x < first.x && first.x < service.x)) return null;
  return { first, second, third, service, members: [third, second, first] };
}

export function planFifoQueue(scene: SceneState, ids: { firstId: string; secondId: string; thirdId: string; serviceId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 4) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const)); if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const ordered = [ids.thirdId, ids.secondId, ids.firstId, ids.serviceId]; const positions = [[18, 48], [38, 48], [58, 48], [84, 48]] as const;
  const candidate = ordered.map((id, index) => ({ ...byId.get(id)!, x: positions[index][0], y: positions[index][1] }));
  const planned: SceneRelation[] = [{ id: "planned-1", kind: "fifoBefore", sourceIds: [ids.firstId], targetIds: [ids.secondId] }, { id: "planned-2", kind: "fifoBefore", sourceIds: [ids.secondId], targetIds: [ids.thirdId] }, { id: "planned-serve", kind: "servedBy", sourceIds: [ids.firstId], targetIds: [ids.serviceId] }];
  const selected = selectLayoutCandidate(scene, [candidate], { family: "fifo-queue", validate: (projected) => Boolean(fifoGeometry(planned, projected)) })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
