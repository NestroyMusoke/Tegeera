import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const stripArticle = (value: string) => value.trim().replace(/^(?:a|an|the)\s+/, "");
const singular = (value: string) => value.endsWith("ies") ? `${value.slice(0, -3)}y`
  : value.endsWith("s") && !/(?:ss|us)$/.test(value) ? value.slice(0, -1) : value;
const readable = (value: string) => value.length > 0 && value.length <= 32
  && value.split(/\s+/).length <= 4 && /^[a-z][a-z0-9 '-]*$/.test(value);

export interface LinkedChainMatch {
  collectionText: string;
  itemText: string;
  firstText: string;
  middleText: string;
  finalText: string;
}

/** Extracts a linked topology while deliberately discarding literal chain analogy. */
export function matchLinkedChain(text: string): LinkedChainMatch | null {
  const patterns = [
    /^(.+?) is (?:like )?(?:a |an |the )?(?:linked )?(?:chain|sequence) (?:where|—) each (.+?) (?:(?:points|links) to|references) (?:the )?next (?:one|item|node|element|entry)$/,
    /^(.+?) forms (?:a |an |the )?(?:linked )?(?:chain|sequence), each (.+?) (?:(?:pointing|linking) to|referencing) (?:the )?next (?:one|item|node|element|entry)$/
  ];
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (!match) return null;
  const collectionText = stripArticle(match[1]);
  const itemText = singular(stripArticle(match[2]));
  const firstText = `${itemText} 1`;
  const middleText = `${itemText} 2`;
  const finalText = `${itemText} 3`;
  const labels = [collectionText, itemText, firstText, middleText, finalText];
  if (!labels.every(readable) || new Set([collectionText, firstText, middleText, finalText]).size !== 4) return null;
  return { collectionText, itemText, firstText, middleText, finalText };
}

export const isLinkedChainRelation = (relation: SceneRelation) =>
  relation.kind === "hasFirstNode" || relation.kind === "pointsNext";

export function linkedChainGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const edges = relations.filter(isLinkedChainRelation);
  if (edges.length !== 3) return null;
  const head = edges.find(({ kind }) => kind === "hasFirstNode");
  const next = edges.filter(({ kind }) => kind === "pointsNext");
  if (!head || next.length !== 2) return null;
  const firstId = head.targetIds[0];
  const firstEdge = next.find(({ sourceIds }) => sourceIds[0] === firstId);
  const secondEdge = firstEdge && next.find(({ sourceIds }) => sourceIds[0] === firstEdge.targetIds[0]);
  if (!firstEdge || !secondEdge) return null;
  const collection = entities.find(({ id }) => id === head.sourceIds[0]);
  const first = entities.find(({ id }) => id === firstId);
  const middle = entities.find(({ id }) => id === firstEdge.targetIds[0]);
  const final = entities.find(({ id }) => id === secondEdge.targetIds[0]);
  if (!collection || !first || !middle || !final
    || collection.visualRole !== "linked-collection" || first.visualRole !== "linked-first"
    || middle.visualRole !== "linked-middle" || final.visualRole !== "linked-final") return null;
  const nodes = [first, middle, final];
  if (new Set([collection.id, ...nodes.map(({ id }) => id)]).size !== 4
    || !(collection.x + 14 < first.x && first.x + 18 < middle.x && middle.x + 18 < final.x)
    || Math.max(...nodes.map(({ y }) => y)) - Math.min(...nodes.map(({ y }) => y)) > 5) return null;
  return { collection, first, middle, final, nodes };
}

export function planLinkedChain(
  scene: SceneState,
  ids: { collectionId: string; firstId: string; middleId: string; finalId: string },
  movableIds: ReadonlySet<string>
) {
  const orderedIds = [ids.collectionId, ids.firstId, ids.middleId, ids.finalId];
  if (new Set(orderedIds).size !== 4) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (orderedIds.some((id) => !byId.has(id))) return null;
  const positions = [[8, 76], [30, 48], [56, 48], [82, 48]] as const;
  const candidate = orderedIds.map((id, index) => ({ ...byId.get(id)!, x: positions[index][0], y: positions[index][1] }));
  const relations: SceneRelation[] = [
    { id: "planned-head", kind: "hasFirstNode", sourceIds: [ids.collectionId], targetIds: [ids.firstId], predicate: "hasFirstNode" },
    { id: "planned-next-1", kind: "pointsNext", sourceIds: [ids.firstId], targetIds: [ids.middleId], predicate: "pointsNext" },
    { id: "planned-next-2", kind: "pointsNext", sourceIds: [ids.middleId], targetIds: [ids.finalId], predicate: "pointsNext" }
  ];
  const selected = selectLayoutCandidate(scene, [candidate], {
    family: "linked-chain", validate: (entities) => Boolean(linkedChainGeometry(relations, entities))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
