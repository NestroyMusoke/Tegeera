import { contactPairIsVisuallySafe, solveContactArm } from "./contactGeometry";
import { overlaps, withinCanvas } from "./layout";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";
import { applyTargetedPerformance } from "./targetedPerformance";

export const isHandover = (relation: SceneRelation): boolean => relation.kind === "handover";

export function handoverParticipants(relation: SceneRelation, entities: SceneEntity[]) {
  if (!isHandover(relation)) return undefined;
  const giver = entities.find((entity) => entity.id === relation.sourceIds[0]);
  const recipient = entities.find((entity) => entity.id === relation.targetIds[0]);
  const object = entities.find((entity) => entity.id === relation.objectIds?.[0]);
  return giver && recipient && object ? { giver, recipient, object } : undefined;
}

/** Gives either human endpoint an exact two-bone reach to the same visible object. */
export function applyHandoverPerformance(actor: SceneEntity, object: SceneEntity): SceneEntity {
  return applyTargetedPerformance(actor, object, {
    id: "derived-handover-contact",
    kind: "actsOn",
    predicate: "touch",
    sourceIds: [actor.id],
    targetIds: [object.id]
  });
}

export function handoverIsVisuallySafe(giver: SceneEntity, recipient: SceneEntity, object: SceneEntity): boolean {
  const peopleCenterGap = Math.abs(giver.x - recipient.x) * 10;
  const peopleLabelGap = Math.abs((giver.y - recipient.y) * 6.2);
  const labelHalf = (entity: SceneEntity) => Math.max(14, (entity.label ?? entity.kind).length * 4.5);
  const peopleClear = peopleCenterGap >= 22 * giver.scale + 22 * recipient.scale + 3
    && (peopleLabelGap >= 20 || peopleCenterGap >= labelHalf(giver) + labelHalf(recipient));
  return peopleClear
    && contactPairIsVisuallySafe(giver, object)
    && contactPairIsVisuallySafe(recipient, object)
    && solveContactArm(giver, object, giver.performance?.bodyLean ?? 0).solution.reachable
    && solveContactArm(recipient, object, recipient.performance?.bodyLean ?? 0).solution.reachable;
}

const rows = [28, 44, 60, 76];
const centers = Array.from({ length: 39 }, (_, index) => 12 + index * 2);
const gaps = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const actorOffsets = [-4, 0, 4];

/**
 * Stages a three-role transfer without cloning the object. The participants are
 * the only movable entities; all unrelated scene content remains an obstacle.
 */
export function stageHandover(scene: SceneState, giverId: string, objectId: string, recipientId: string) {
  const originalGiver = scene.entities.find((entity) => entity.id === giverId);
  const originalRecipient = scene.entities.find((entity) => entity.id === recipientId);
  const originalObject = scene.entities.find((entity) => entity.id === objectId);
  if (!originalGiver || !originalRecipient || !originalObject) return [];
  const obstacles = scene.entities.filter((entity) => ![giverId, recipientId, objectId].includes(entity.id));
  let best: { giver: SceneEntity; recipient: SceneEntity; object: SceneEntity; score: number } | undefined;

  for (const row of rows) {
    for (const center of centers) {
      for (const gap of gaps) {
        for (const actorOffset of actorOffsets) {
          for (const order of [1, -1]) {
            const object = { ...originalObject, x: center, y: row };
            const giver = { ...originalGiver, x: center - order * gap, y: row + actorOffset };
            const recipient = { ...originalRecipient, x: center + order * gap, y: row + actorOffset };
            const trio = [giver, recipient, object];
            if (trio.some((entity) => !withinCanvas(entity))) continue;
            if (trio.some((entity) => obstacles.some((obstacle) => overlaps(entity, obstacle)))) continue;
            if (!handoverIsVisuallySafe(giver, recipient, object)) continue;
            const movement = trio.reduce((total, entity) => {
              const original = entity.id === giverId ? originalGiver : entity.id === recipientId ? originalRecipient : originalObject;
              return total + Math.abs(entity.x - original.x) + Math.abs(entity.y - original.y);
            }, 0);
            const readingPenalty = giver.x > recipient.x ? 2 : 0;
            const reachPenalty = Math.abs(solveContactArm(giver, object).solution.distance - 38)
              + Math.abs(solveContactArm(recipient, object).solution.distance - 38);
            const score = movement + readingPenalty + reachPenalty * 0.2;
            if (!best || score < best.score) best = { giver, recipient, object, score };
          }
        }
      }
    }
  }
  if (!best) return [];
  return [best.giver, best.object, best.recipient]
    .filter((entity) => {
      const original = entity.id === giverId ? originalGiver : entity.id === recipientId ? originalRecipient : originalObject;
      return entity.x !== original.x || entity.y !== original.y;
    })
    .map(({ id, x, y }) => ({ targetId: id, x, y }));
}
