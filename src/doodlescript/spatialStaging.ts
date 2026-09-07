import { layoutPositions, overlaps, withinCanvas } from "./layout";
import type { SceneEntity, SceneState } from "./schema";

export interface StagedMove {
  targetId: string;
  x: number;
  y: number;
}

const withPosition = (entity: SceneEntity, position: { x: number; y: number }): SceneEntity => ({ ...entity, ...position });

function placementScore(actor: SceneEntity, target: SceneEntity, originalActor: SceneEntity, originalTarget: SceneEntity): number {
  const verticalPenalty = Math.abs(actor.y - target.y) * 8;
  const distancePenalty = Math.abs(Math.abs(actor.x - target.x) - 22) * 2;
  const readingDirectionPenalty = target.x < actor.x ? 3 : 0;
  const movementPenalty = (Math.abs(actor.x - originalActor.x) + Math.abs(actor.y - originalActor.y)
    + Math.abs(target.x - originalTarget.x) + Math.abs(target.y - originalTarget.y)) * 0.15;
  return verticalPenalty + distancePenalty + readingDirectionPenalty + movementPenalty;
}

/**
 * Scores the common two-part visual grammar: one performer and one target.
 * Existing entities are immovable anchors; only IDs explicitly marked movable
 * can be restaged. An empty result means the current safe placement is retained.
 */
export function stageTargetedPair(scene: SceneState, actorId: string, targetId: string, movableIds: ReadonlySet<string>): StagedMove[] {
  const originalActor = scene.entities.find((entity) => entity.id === actorId);
  const originalTarget = scene.entities.find((entity) => entity.id === targetId);
  if (!originalActor || !originalTarget || actorId === targetId || !movableIds.size) return [];
  // The endpoints are checked against each other below. Only unrelated scene
  // entities are obstacles; otherwise a fixed endpoint collides with itself.
  const obstacles = scene.entities.filter((entity) => entity.id !== actorId && entity.id !== targetId);
  const actorPositions = movableIds.has(actorId) ? layoutPositions : [{ x: originalActor.x, y: originalActor.y }];
  const targetPositions = movableIds.has(targetId) ? layoutPositions : [{ x: originalTarget.x, y: originalTarget.y }];
  let best: { actor: SceneEntity; target: SceneEntity; score: number } | undefined;

  for (const actorPosition of actorPositions) {
    const actor = withPosition(originalActor, actorPosition);
    if (!withinCanvas(actor) || obstacles.some((entity) => overlaps(actor, entity))) continue;
    for (const targetPosition of targetPositions) {
      const target = withPosition(originalTarget, targetPosition);
      if (!withinCanvas(target) || overlaps(actor, target) || obstacles.some((entity) => overlaps(target, entity))) continue;
      const score = placementScore(actor, target, originalActor, originalTarget);
      if (!best || score < best.score) best = { actor, target, score };
    }
  }
  if (!best) return [];
  return [best.actor, best.target]
    .filter((entity) => movableIds.has(entity.id))
    .filter((entity) => {
      const original = entity.id === actorId ? originalActor : originalTarget;
      return entity.x !== original.x || entity.y !== original.y;
    })
    .map(({ id, x, y }) => ({ targetId: id, x, y }));
}
