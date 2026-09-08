import { entityVisualGeometry } from "./entityGeometry";
import { entityHalfWidth, layoutPositions, overlaps, withinCanvas } from "./layout";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";
import { visualActionForPredicate } from "./visualActionRegistry";

export interface VisualPhraseMove { targetId: string; x: number; y: number }

export const isVisualAction = (relation: SceneRelation): boolean => relation.kind === "visualAction";
const phrasePositions = [
  ...layoutPositions,
  ...[12, 30, 48, 66, 84].map((x) => ({ x, y: 76 }))
];

function withPosition(entity: SceneEntity, position: { x: number; y: number }): SceneEntity {
  return { ...entity, ...position };
}

export function visualPhraseGeometry(relation: SceneRelation, entities: SceneEntity[]) {
  if (!isVisualAction(relation) || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const definition = visualActionForPredicate(relation.predicate);
  const subject = entities.find((entity) => entity.id === relation.sourceIds[0]);
  const object = entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!definition || !subject || !object || subject.id === object.id) return null;
  const from = definition.direction === "subject-to-object" ? subject : object;
  const to = definition.direction === "subject-to-object" ? object : subject;
  const direction = Math.sign(to.x - from.x);
  if (!direction) return null;
  const startX = from.x * 10 + direction * (entityVisualGeometry[from.kind].contact.halfWidth * from.scale + 10);
  const endX = to.x * 10 - direction * (entityVisualGeometry[to.kind].contact.halfWidth * to.scale + 10);
  if (Math.abs(endX - startX) < 28) return null;
  const startY = from.y * 6.2 - 4;
  const endY = to.y * 6.2 - 4;
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const corridorY = (startY + endY) / 2;
  const labelX = (startX + endX) / 2;
  const labelY = corridorY - 14;
  const controlX = (startX + endX) / 2;
  const obstacles = entities.filter((entity) => entity.id !== from.id && entity.id !== to.id
    && entity.x * 10 > left && entity.x * 10 < right);
  const samples = Array.from({ length: 17 }, (_, index) => (index + 1) / 18).map((time) => {
    const remaining = 1 - time;
    return {
      x: remaining ** 3 * startX + 3 * remaining ** 2 * time * controlX
        + 3 * remaining * time ** 2 * controlX + time ** 3 * endX,
      y: remaining ** 3 * startY + 3 * remaining ** 2 * time * startY
        + 3 * remaining * time ** 2 * endY + time ** 3 * endY
    };
  });
  const blocked = obstacles.some((entity) => samples.some((point) =>
    Math.abs(point.x - entity.x * 10) < entityVisualGeometry[entity.kind].contact.halfWidth * entity.scale + 8
    && Math.abs(point.y - entity.y * 6.2) < 62 * entity.scale));
  const labelHalfWidth = definition.label.length * 4.2;
  const labelBlocked = entities.some((entity) => entity.id !== from.id && entity.id !== to.id
    && Math.abs(entity.x * 10 - labelX) < entityHalfWidth(entity) * 10 + labelHalfWidth
    && Math.abs(entity.y * 6.2 + 84 * entity.scale - labelY) < 18);
  if (blocked || labelBlocked) return null;
  const path = `M${startX} ${startY} C${controlX} ${startY} ${controlX} ${endY} ${endX} ${endY}`;
  const arrow = `M${endX - direction * 11} ${endY - 8} L${endX} ${endY} L${endX - direction * 11} ${endY + 8}`;
  return {
    subject, object, definition, from, to, startX, startY, endX, endY, path, arrow,
    labelX, labelY,
    route: subject.y === object.y ? "straight" as const : "curve" as const
  };
}

/**
 * Searches deterministic candidate pairs while treating unrelated scene objects
 * as fixed obstacles. Only IDs created by the active utterance may move.
 */
export function planVisualPhrase(
  scene: SceneState,
  relation: SceneRelation,
  movableIds: ReadonlySet<string>
): VisualPhraseMove[] | null {
  const originalSubject = scene.entities.find((entity) => entity.id === relation.sourceIds[0]);
  const originalObject = scene.entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!originalSubject || !originalObject || originalSubject.id === originalObject.id) return null;
  const obstacles = scene.entities.filter((entity) => entity.id !== originalSubject.id && entity.id !== originalObject.id);
  const candidatePositions = (entity: SceneEntity) => movableIds.has(entity.id)
    ? [{ x: entity.x, y: entity.y }, ...phrasePositions.filter((position) => position.x !== entity.x || position.y !== entity.y)]
    : [{ x: entity.x, y: entity.y }];
  let best: { subject: SceneEntity; object: SceneEntity; score: number } | undefined;

  for (const subjectPosition of candidatePositions(originalSubject)) {
    const subject = withPosition(originalSubject, subjectPosition);
    if (!withinCanvas(subject) || obstacles.some((entity) => overlaps(subject, entity))) continue;
    for (const objectPosition of candidatePositions(originalObject)) {
      const object = withPosition(originalObject, objectPosition);
      if (!withinCanvas(object) || overlaps(subject, object) || obstacles.some((entity) => overlaps(object, entity))) continue;
      const projected = scene.entities.map((entity) => entity.id === subject.id ? subject : entity.id === object.id ? object : entity);
      if (!visualPhraseGeometry(relation, projected)) continue;
      const movement = Math.abs(subject.x - originalSubject.x) + Math.abs(subject.y - originalSubject.y)
        + Math.abs(object.x - originalObject.x) + Math.abs(object.y - originalObject.y);
      const score = Math.abs(subject.y - object.y) * 7
        + Math.abs(Math.abs(subject.x - object.x) - 28) * 1.5
        + (object.x < subject.x ? 4 : 0) + movement * 0.18;
      if (!best || score < best.score) best = { subject, object, score };
    }
  }
  if (!best) return null;
  return [best.subject, best.object]
    .filter((entity) => movableIds.has(entity.id))
    .filter((entity) => {
      const original = entity.id === originalSubject.id ? originalSubject : originalObject;
      return entity.x !== original.x || entity.y !== original.y;
    })
    .map(({ id, x, y }) => ({ targetId: id, x, y }));
}
