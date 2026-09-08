import { entityVisualGeometry } from "./entityGeometry";
import type { SceneEntity, SceneRelation } from "./schema";

export const isEventRelation = (relation: SceneRelation): boolean => relation.kind === "before" || relation.kind === "causes";

/** Connector endpoints clear both registered silhouettes instead of crossing glyphs. */
export function eventFlowGeometry(relation: SceneRelation, entities: SceneEntity[]) {
  if (!isEventRelation(relation) || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const source = entities.find((entity) => entity.id === relation.sourceIds[0]);
  const target = entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!source || !target || source.y !== target.y || source.x >= target.x) return null;
  const sourceEdge = source.x * 10 + entityVisualGeometry[source.kind].contact.halfWidth * source.scale + 10;
  const targetEdge = target.x * 10 - entityVisualGeometry[target.kind].contact.halfWidth * target.scale - 10;
  if (targetEdge - sourceEdge < 26) return null;
  return { source, target, startX: sourceEdge, endX: targetEdge, y: source.y * 6.2 - 4 };
}

export function hasDirectedCycle(relations: SceneRelation[], kind: "before" | "causes"): boolean {
  const edges = relations.filter((relation) => relation.kind === kind);
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
