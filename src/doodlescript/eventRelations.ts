import { entityVisualGeometry } from "./entityGeometry";
import { entityHalfWidth } from "./layout";
import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const isEventRelation = (relation: SceneRelation): boolean => relation.kind === "before" || relation.kind === "causes";

const stableOrder = (a: SceneEntity, b: SceneEntity) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);

function eventComponent(seedIds: string[], relations: SceneRelation[]): Set<string> {
  const ids = new Set(seedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const relation of relations.filter(isEventRelation)) {
      const members = [...relation.sourceIds, ...relation.targetIds];
      if (members.some((id) => ids.has(id))) for (const id of members) {
        if (!ids.has(id)) { ids.add(id); changed = true; }
      }
    }
  }
  return ids;
}

/**
 * Lays out the connected event component by topological rank. Unrelated scene
 * entities remain fixed obstacles; a null result means no safe bounded layout.
 */
export function planEventGraph(scene: SceneState, proposed: SceneRelation) {
  const relations = [...(scene.relations ?? []).filter(isEventRelation), proposed];
  if (hasDirectedCycle(relations)) return null;
  const componentIds = eventComponent([...proposed.sourceIds, ...proposed.targetIds], relations);
  const nodes = scene.entities.filter((entity) => componentIds.has(entity.id));
  if (nodes.length !== componentIds.size) return null;
  const edges = relations.filter((relation) => componentIds.has(relation.sourceIds[0]) && componentIds.has(relation.targetIds[0]));
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of edges) {
    incoming.set(edge.targetIds[0], (incoming.get(edge.targetIds[0]) ?? 0) + 1);
    outgoing.get(edge.sourceIds[0])?.push(edge.targetIds[0]);
  }
  const rank = new Map(nodes.map((node) => [node.id, 0]));
  const queue = nodes.filter((node) => incoming.get(node.id) === 0).sort(stableOrder);
  let visited = 0;
  while (queue.length) {
    const node = queue.shift()!;
    visited += 1;
    for (const targetId of [...(outgoing.get(node.id) ?? [])].sort()) {
      rank.set(targetId, Math.max(rank.get(targetId) ?? 0, (rank.get(node.id) ?? 0) + 1));
      incoming.set(targetId, (incoming.get(targetId) ?? 0) - 1);
      if (incoming.get(targetId) === 0) {
        queue.push(nodes.find((candidate) => candidate.id === targetId)!);
        queue.sort(stableOrder);
      }
    }
  }
  if (visited !== nodes.length) return null;

  const maxRank = Math.max(...rank.values());
  const layers = Array.from({ length: maxRank + 1 }, (_, layer) => nodes
    .filter((node) => rank.get(node.id) === layer)
    .sort(stableOrder));
  if (layers.some((layer) => layer.length > 3)) return null;
  // A valid linear explanation is already preserved exactly. Branches and
  // convergences opt into the topology layout below.
  if (layers.every((layer) => layer.length === 1)
    && edges.every((edge) => eventFlowGeometry(edge, scene.entities))) return [];
  const widths = layers.map((layer) => Math.max(...layer.map(entityHalfWidth)));
  const minimumCenters = [1 + widths[0]];
  for (let layer = 1; layer < layers.length; layer += 1) {
    minimumCenters.push(minimumCenters[layer - 1] + widths[layer - 1] + widths[layer] + 4);
  }
  const spare = 99 - widths.at(-1)! - minimumCenters.at(-1)!;
  if (spare < 0) return null;
  const gapBonus = maxRank ? spare / maxRank : 0;
  const xByLayer = minimumCenters.map((minimum, layer) => minimum + gapBonus * layer);
  const rowsFor = (count: number) => count === 1 ? [44] : count === 2 ? [27, 61] : [18, 46, 74];
  const plannedBase = layers.flatMap((layer, layerIndex) => layer.map((node, rowIndex) => ({
    ...node, x: xByLayer[layerIndex], y: rowsFor(layer.length)[rowIndex]
  })));
  const candidates = [0, 16, -16, 28, -28].map((offset) => plannedBase.map((entity) => ({ ...entity, y: entity.y + offset })))
  const planned = selectLayoutCandidate(scene, candidates, {
    connectorEdges: edges.map((edge) => ({ sourceId: edge.sourceIds[0], targetId: edge.targetIds[0] })),
    validate: (projected) => edges.every((edge) => Boolean(eventFlowGeometry(edge, [...projected])))
  })?.entities;
  if (!planned) return null;
  return planned.filter((entity) => {
    const original = scene.entities.find((candidate) => candidate.id === entity.id)!;
    return original.x !== entity.x || original.y !== entity.y;
  }).map(({ id, x, y }) => ({ targetId: id, x, y }));
}

/** Connector endpoints clear registered silhouettes and route long edges above nodes. */
export function eventFlowGeometry(relation: SceneRelation, entities: SceneEntity[]) {
  if (!isEventRelation(relation) || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const source = entities.find((entity) => entity.id === relation.sourceIds[0]);
  const target = entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!source || !target || source.x >= target.x) return null;
  const sourceEdge = source.x * 10 + entityVisualGeometry[source.kind].contact.halfWidth * source.scale + 10;
  const targetEdge = target.x * 10 - entityVisualGeometry[target.kind].contact.halfWidth * target.scale - 10;
  if (targetEdge - sourceEdge < 26) return null;
  const startY = source.y * 6.2 - 4;
  const endY = target.y * 6.2 - 4;
  const between = entities.filter((entity) => entity.id !== source.id && entity.id !== target.id
    && entity.x * 10 > sourceEdge && entity.x * 10 < targetEdge);
  const needsOuterLane = between.length > 0;
  const midX = (sourceEdge + targetEdge) / 2;
  const laneY = 34 + [...relation.id].reduce((total, character) => total + character.charCodeAt(0), 0) % 2 * 14;
  const path = needsOuterLane
    ? `M${sourceEdge} ${startY} C${sourceEdge + 18} ${startY} ${sourceEdge + 18} ${laneY} ${sourceEdge + 38} ${laneY} H${targetEdge - 38} C${targetEdge - 18} ${laneY} ${targetEdge - 18} ${endY} ${targetEdge} ${endY}`
    : `M${sourceEdge} ${startY} C${midX} ${startY} ${midX} ${endY} ${targetEdge} ${endY}`;
  return {
    source, target, startX: sourceEdge, startY, endX: targetEdge, endY, path,
    labelX: midX, labelY: needsOuterLane ? laneY - 10 : (startY + endY) / 2 - 14,
    route: needsOuterLane ? "outer" as const : source.y === target.y ? "straight" as const : "curve" as const
  };
}

export function hasDirectedCycle(relations: SceneRelation[], kind?: "before" | "causes"): boolean {
  const edges = relations.filter((relation) => isEventRelation(relation) && (!kind || relation.kind === kind));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) outgoing.set(edge.sourceIds[0], [...(outgoing.get(edge.sourceIds[0]) ?? []), edge.targetIds[0]]);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((outgoing.get(id) ?? []).some(visit)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...outgoing.keys()].some(visit);
}
