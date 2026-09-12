import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const stripArticle = (value: string) => value.trim().replace(/^(?:a|an|the)\s+/, "");
const readable = (value: string) => value.length > 0 && value.length <= 36
  && value.split(/\s+/).length <= 5 && /^[a-z][a-z0-9 '-]*$/.test(value);

export interface IndexedCollectionMatch {
  collectionText: string;
  cellsText: string;
  valuesText: string;
  indexText: string;
  startIndex: 0 | 1;
}

/** Matches the topology of an indexed collection, independent of lesson domain. */
export function matchIndexedCollection(text: string): IndexedCollectionMatch | null {
  const match = text.match(/^(.+?) is (?:a |an |the )?(?:horizontal )?row of (boxes|cells|slots), each (?:one )?(?:holding|containing|storing) (?:a |an |the )?(.+?), (?:numbered|indexed) starting (?:from|at) (zero|one|0|1)$/);
  if (!match) return null;
  const collectionText = stripArticle(match[1]);
  const cellsText = `${collectionText} ${match[2]}`;
  const valuesText = stripArticle(match[3]);
  const startIndex = /^(?:zero|0)$/.test(match[4]) ? 0 : 1;
  const indexText = `index ${startIndex}`;
  const labels = [collectionText, cellsText, valuesText, indexText];
  if (!labels.every(readable) || new Set(labels).size !== labels.length) return null;
  return { collectionText, cellsText, valuesText, indexText, startIndex };
}

export const isIndexedCollectionRelation = (relation: SceneRelation) =>
  relation.kind === "containsCells" || relation.kind === "storesValues" || relation.kind === "startsIndexAt";

export function indexedCollectionGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const edges = relations.filter(isIndexedCollectionRelation);
  if (edges.length !== 3) return null;
  const contains = edges.find(({ kind }) => kind === "containsCells");
  const stores = edges.find(({ kind }) => kind === "storesValues");
  const starts = edges.find(({ kind }) => kind === "startsIndexAt");
  if (!contains || !stores || !starts || contains.targetIds[0] !== stores.sourceIds[0]
    || stores.sourceIds[0] !== starts.sourceIds[0]) return null;
  const collection = entities.find(({ id }) => id === contains.sourceIds[0]);
  const cells = entities.find(({ id }) => id === contains.targetIds[0]);
  const values = entities.find(({ id }) => id === stores.targetIds[0]);
  const index = entities.find(({ id }) => id === starts.targetIds[0]);
  if (!collection || !cells || !values || !index
    || collection.visualRole !== "indexed-collection" || cells.visualRole !== "indexed-cells"
    || values.visualRole !== "indexed-values" || index.visualRole !== "indexed-start") return null;
  const all = [collection, cells, values, index];
  const startIndex = index.label === "index 0" ? 0 : index.label === "index 1" ? 1 : null;
  if (startIndex === null || new Set(all.map(({ id }) => id)).size !== 4
    || !(collection.x + 12 < cells.x && cells.x + 12 < values.x && values.x + 12 < index.x)
    || Math.max(...all.map(({ y }) => y)) - Math.min(...all.map(({ y }) => y)) > 6) return null;
  return { collection, cells, values, index, startIndex };
}

export function planIndexedCollection(
  scene: SceneState,
  ids: { collectionId: string; cellsId: string; valuesId: string; indexId: string },
  movableIds: ReadonlySet<string>
) {
  const orderedIds = [ids.collectionId, ids.cellsId, ids.valuesId, ids.indexId];
  if (new Set(orderedIds).size !== 4) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (orderedIds.some((id) => !byId.has(id))) return null;
  const positions = [[14, 76], [38, 76], [62, 76], [86, 76]] as const;
  const candidate = orderedIds.map((id, position) => ({ ...byId.get(id)!, x: positions[position][0], y: positions[position][1] }));
  const relations: SceneRelation[] = [
    { id: "planned-cells", kind: "containsCells", sourceIds: [ids.collectionId], targetIds: [ids.cellsId], predicate: "containsCells" },
    { id: "planned-values", kind: "storesValues", sourceIds: [ids.cellsId], targetIds: [ids.valuesId], predicate: "storesValues" },
    { id: "planned-index", kind: "startsIndexAt", sourceIds: [ids.cellsId], targetIds: [ids.indexId], predicate: "startsIndexAt" }
  ];
  const selected = selectLayoutCandidate(scene, [candidate], {
    family: "indexed-row", validate: (entities) => Boolean(indexedCollectionGeometry(relations, entities))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
