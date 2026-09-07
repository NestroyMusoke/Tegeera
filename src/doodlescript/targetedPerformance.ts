import { actionRegistry } from "./actionRegistry";
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
  const dx = (target.x - actor.x) * 10;
  const dy = (target.y - actor.y) * 6.2;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const direction = dx < 0 ? "left" as const : dx > 0 ? "right" as const : actor.direction;
  const localAngle = clamp(Math.atan2(dy, Math.max(1, Math.abs(dx))) * 180 / Math.PI, -75, 75);
  const targetGeometry: CharacterPerformance = {
    headTilt: clamp(localAngle * 0.16, -12, 12),
    expression: { gazeX: 1, gazeY: clamp(dy / distance, -1, 1) }
  };
  if (action.targeting.gesture === "point") targetGeometry.rightArm = { upper: localAngle, joint: 0 };
  return {
    ...actor,
    direction,
    performance: mergePerformance(actor.performance ?? action.performance, targetGeometry)
  };
}
