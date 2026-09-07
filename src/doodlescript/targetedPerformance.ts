import { actionRegistry } from "./actionRegistry";
import { solveContactArm } from "./contactGeometry";
import { attentionAnchor, shoulderAnchor } from "./entityGeometry";
import type { CharacterPerformance, SceneEntity, SceneRelation } from "./schema";

export const isTargetedPerformance = (relation: SceneRelation): boolean => relation.kind === "actsOn";

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function mergePerformance(base: CharacterPerformance, geometry: CharacterPerformance): CharacterPerformance {
  return {
    ...base,
    ...geometry,
    expression: { ...base.expression, ...geometry.expression }
  };
}

/** Derives target-dependent pose parameters; no entity coordinates are mutated. */
export function applyTargetedPerformance(actor: SceneEntity, target: SceneEntity, relation: SceneRelation): SceneEntity {
  if (relation.kind !== "actsOn") return actor;
  const action = actionRegistry.find((candidate) => candidate.predicate === relation.predicate);
  if (!action?.targeting) return actor;
  const centerDx = (target.x - actor.x) * 10;
  const direction = centerDx < 0 ? "left" as const : centerDx > 0 ? "right" as const : actor.direction;
  const directed = { ...actor, direction };
  const basePerformance = actor.performance ?? action.performance;
  const bodyLean = basePerformance.bodyLean ?? 0;
  const contact = action.targeting.gesture === "contact" ? solveContactArm(directed, target, bodyLean) : undefined;
  const targetPoint = contact?.targetPoint ?? attentionAnchor(target);
  const shoulder = contact?.shoulder ?? shoulderAnchor(directed, bodyLean);
  const facing = direction === "left" ? -1 : 1;
  const localDx = (targetPoint.x - shoulder.x) * facing / actor.scale;
  const localDy = (targetPoint.y - shoulder.y) / actor.scale;
  const distance = Math.max(1, Math.hypot(localDx, localDy));
  const localAngle = clamp(Math.atan2(localDy, Math.max(1, localDx)) * 180 / Math.PI, -75, 75);
  const targetGeometry: CharacterPerformance = {
    headTilt: clamp(localAngle * 0.16, -12, 12),
    expression: { gazeX: 1, gazeY: clamp(localDy / distance, -1, 1) }
  };
  // The arm is nested inside the leaning torso, so subtract its rotation to
  // make the final world-space ray pass through the semantic target anchor.
  if (action.targeting.gesture === "point") targetGeometry.rightArm = { upper: localAngle - bodyLean, joint: 0 };
  if (contact?.solution.reachable) {
    targetGeometry.rightArm = {
      upper: contact.solution.upper - bodyLean,
      joint: contact.solution.joint
    };
  }
  return {
    ...actor,
    direction,
    performance: mergePerformance(basePerformance, targetGeometry)
  };
}
