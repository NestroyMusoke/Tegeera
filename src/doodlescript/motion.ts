import type { SceneEntity, SceneRelation } from "./schema";

export const isMotion = (relation: SceneRelation) => relation.kind === "toward" || relation.kind === "away";

export const relationLabel = (relation: SceneRelation): string => ({
  shares: "share", owns: "owns", toward: "moves toward", away: "moves away from", queuedFor: "waits for CPU"
})[relation.kind];

// A directional illustration, not a physical simulation or a collision trajectory.
export function motionGeometry(actor: SceneEntity, target: SceneEntity, kind: "toward" | "away") {
  if (actor.y !== target.y || actor.x === target.x) return null;
  const sign = Math.sign(target.x - actor.x) * (kind === "toward" ? 1 : -1);
  const startX = actor.x * 10;
  const endX = kind === "toward" ? target.x * 10 : startX + sign * Math.min(120, sign < 0 ? startX - 20 : 980 - startX);
  if (Math.abs(endX - startX) < 35) return null;
  const y = actor.y * 6.2 - 85 * actor.scale;
  if (y < 30) return null;
  return { startX, endX, y, direction: sign < 0 ? "left" as const : "right" as const };
}
