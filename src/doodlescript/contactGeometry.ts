import { contactAnchor, entityVisualGeometry, shoulderAnchor } from "./entityGeometry";
import { solveTwoBone } from "./inverseKinematics";
import type { SceneEntity } from "./schema";

export function solveContactArm(actor: SceneEntity, target: SceneEntity, bodyLean = 0) {
  const direction = target.x < actor.x ? "left" as const : target.x > actor.x ? "right" as const : actor.direction;
  const directed = { ...actor, direction };
  const shoulder = shoulderAnchor(directed, bodyLean);
  const targetPoint = contactAnchor(target, shoulder.x);
  const facing = direction === "left" ? -1 : 1;
  const localTarget = {
    x: (targetPoint.x - shoulder.x) * facing / actor.scale,
    y: (targetPoint.y - shoulder.y) / actor.scale
  };
  return { direction, shoulder, targetPoint, localTarget, solution: solveTwoBone(localTarget.x, localTarget.y) };
}

/** Narrow contact overlap exception: visible bodies and labels must still clear. */
export function contactPairIsVisuallySafe(actor: SceneEntity, target: SceneEntity): boolean {
  const centerGap = Math.abs(actor.x - target.x) * 10;
  const targetHalfWidth = entityVisualGeometry[target.kind].contact.halfWidth * target.scale;
  const actorCore = 22 * actor.scale;
  const labelHalf = (entity: SceneEntity) => Math.max(14, (entity.label ?? entity.kind).length * 4.5);
  const actorLabelY = actor.y * 6.2 + 84 * actor.scale;
  const targetLabelY = target.y * 6.2 + 84 * target.scale;
  const labelsClear = Math.abs(actorLabelY - targetLabelY) >= 20
    || centerGap >= labelHalf(actor) + labelHalf(target);
  return centerGap >= actorCore + targetHalfWidth + 3
    && labelsClear;
}
