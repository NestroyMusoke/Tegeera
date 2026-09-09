import type { SceneEntity, SceneRelation } from "./schema";
import { conceptSupports, sharedOrderedDomain } from "./conceptRegistry";
import { layoutPositions } from "./layout";
import { selectLayoutCandidate } from "./layoutPlanner";

export const isQueue = (relation: SceneRelation) => relation.kind === "queuedFor";

export function queueGeometry(relation: SceneRelation, entities: SceneEntity[]) {
  if (!isQueue(relation) || relation.targetIds.length !== 1) return null;
  const sources = relation.sourceIds.map((id) => entities.find((entity) => entity.id === id));
  const target = entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!target || sources.some((entity) => !entity)) return null;
  const members = sources as SceneEntity[];
  if (!conceptSupports(target.kind, "queue-target")
    || members.some((entity) => !conceptSupports(entity.kind, "queue-member")
      || !sharedOrderedDomain(entity.kind, target.kind) || entity.y !== target.y)) return null;
  if (members.some((entity, index) => index > 0 && entity.x <= members[index - 1].x)) return null;
  if (members.at(-1)!.x >= target.x) return null;
  return { members, target, y: target.y * 6.2 + 92, startX: members[0].x * 10, endX: target.x * 10 - 62 };
}

/** Plans any compatible ordered members followed by one destination. */
export function planOrderedRow(scene: { entities: SceneEntity[]; relations?: SceneRelation[] }, relation: SceneRelation) {
  if (!isQueue(relation)) return null;
  const ids = [...relation.sourceIds, ...relation.targetIds];
  const originals = ids.map((id) => scene.entities.find((entity) => entity.id === id));
  if (originals.some((entity) => !entity)) return null;
  const rowEntities = originals as SceneEntity[];
  if (queueGeometry(relation, scene.entities)) return [];
  const columns = [...new Set(layoutPositions.map(({ x }) => x))].sort((a, b) => a - b);
  const rows = [...new Set([
    ...rowEntities.map(({ y }) => y),
    ...layoutPositions.map(({ y }) => y)
  ])].sort((a, b) => a - b);
  if (rowEntities.length > columns.length) return null;
  const candidates = rows.map((y) => rowEntities.map((entity, index) => ({
    ...entity, x: columns[index], y, direction: "right" as const
  })));
  const state = { sceneId: "ordered-layout", revision: 0, entities: scene.entities, relations: scene.relations };
  const best = selectLayoutCandidate(state, candidates, {
    family: "queue",
    validate: (projected) => Boolean(queueGeometry(relation, [...projected]))
  })?.entities;
  if (!best) return null;
  return best.filter((entity) => {
    const original = scene.entities.find((candidate) => candidate.id === entity.id)!;
    return entity.x !== original.x || entity.y !== original.y || entity.direction !== original.direction;
  }).map(({ id, x, y, direction }) => ({ targetId: id, x, y, direction }));
}
