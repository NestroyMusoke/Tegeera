import { layoutPositions, overlaps, withinCanvas } from "./layout";
import { selectLayoutCandidate } from "./layoutPlanner";
import { contactPairIsVisuallySafe, solveContactArm } from "./contactGeometry";
import type { SceneEntity, SceneState } from "./schema";

export interface StagedMove {
  targetId: string;
  x: number;
  y: number;
}

const withPosition = (entity: SceneEntity, position: { x: number; y: number }): SceneEntity => ({ ...entity, ...position });

function placementScore(actor: SceneEntity, target: SceneEntity): number {
  const verticalPenalty = Math.abs(actor.y - target.y) * 8;
  const distancePenalty = Math.abs(Math.abs(actor.x - target.x) - 22) * 2;
  const readingDirectionPenalty = target.x < actor.x ? 3 : 0;
  return verticalPenalty + distancePenalty + readingDirectionPenalty;
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
  const actorPositions = movableIds.has(actorId) ? layoutPositions : [{ x: originalActor.x, y: originalActor.y }];
  const targetPositions = movableIds.has(targetId) ? layoutPositions : [{ x: originalTarget.x, y: originalTarget.y }];
  const candidates = actorPositions.flatMap((actorPosition) => targetPositions.map((targetPosition) => [
    withPosition(originalActor, actorPosition), withPosition(originalTarget, targetPosition)
  ]));
  const best = selectLayoutCandidate(scene, candidates, {
    family: "contact",
    preference: (planned) => placementScore(
      planned.find((entity) => entity.id === actorId)!,
      planned.find((entity) => entity.id === targetId)!
    )
  })?.entities;
  if (!best) return [];
  return best
    .filter((entity) => movableIds.has(entity.id))
    .filter((entity) => {
      const original = entity.id === actorId ? originalActor : originalTarget;
      return entity.x !== original.x || entity.y !== original.y;
    })
    .map(({ id, x, y }) => ({ targetId: id, x, y }));
}

const contactAxis = Array.from({ length: 177 }, (_, index) => 6 + index * 0.5);

/** Finds a close but non-overlapping pair whose target surface is arm-reachable. */
export function stageContactPair(scene: SceneState, actorId: string, targetId: string, movableIds: ReadonlySet<string>): StagedMove[] {
  const originalActor = scene.entities.find((entity) => entity.id === actorId);
  const originalTarget = scene.entities.find((entity) => entity.id === targetId);
  if (!originalActor || !originalTarget || actorId === targetId || !movableIds.size) return [];
  const obstacles = scene.entities.filter((entity) => entity.id !== actorId && entity.id !== targetId);
  const actorPositions = movableIds.has(actorId)
    ? [...layoutPositions, ...(!movableIds.has(targetId)
      ? [originalTarget.y - 4, originalTarget.y, originalTarget.y + 4].flatMap((y) => contactAxis.map((x) => ({ x, y })))
      : [])]
    : [{ x: originalActor.x, y: originalActor.y }];
  let best: { actor: SceneEntity; target: SceneEntity; score: number } | undefined;

  for (const actorPosition of actorPositions) {
    const actor = withPosition(originalActor, actorPosition);
    if (!withinCanvas(actor) || obstacles.some((entity) => overlaps(actor, entity))) continue;
    const targetPositions = movableIds.has(targetId)
      ? [actor.y - 4, actor.y, actor.y + 4].flatMap((y) => contactAxis.map((x) => ({ x, y })))
      : [{ x: originalTarget.x, y: originalTarget.y }];
    for (const targetPosition of targetPositions) {
      const target = withPosition(originalTarget, targetPosition);
      if (!withinCanvas(target) || obstacles.some((entity) => overlaps(target, entity))) continue;
      const contact = solveContactArm(actor, target, actor.performance?.bodyLean ?? 0);
      if (!contact.solution.reachable || !contactPairIsVisuallySafe(actor, target)) continue;
      const movement = Math.abs(actor.x - originalActor.x) + Math.abs(actor.y - originalActor.y)
        + Math.abs(target.x - originalTarget.x) + Math.abs(target.y - originalTarget.y);
      const score = Math.abs(contact.solution.distance - 40) * 3
        + Math.abs(target.y - actor.y) * 0.75
        + (target.x < actor.x ? 3 : 0) + movement * 0.15;
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

/** Restores ordinary spacing when a close contact relationship ends. */
export function releaseContactPair(scene: SceneState, actorId: string, targetId: string): StagedMove[] {
  const target = scene.entities.find((entity) => entity.id === targetId);
  if (!target) return [];
  const obstacles = scene.entities.filter((entity) => entity.id !== targetId);
  const candidates = layoutPositions
    .map((position) => withPosition(target, position))
    .filter((candidate) => withinCanvas(candidate) && !obstacles.some((entity) => overlaps(candidate, entity)))
    .sort((a, b) => {
      const aDistance = Math.abs(a.x - target.x) + Math.abs(a.y - target.y);
      const bDistance = Math.abs(b.x - target.x) + Math.abs(b.y - target.y);
      return aDistance - bDistance;
    });
  const best = candidates[0];
  if (!best || (best.x === target.x && best.y === target.y)) return [];
  // actorId is part of the signature to make the release contract explicit and
  // prevent accidentally treating an unrelated overlap as a contact transition.
  if (!scene.entities.some((entity) => entity.id === actorId)) return [];
  return [{ targetId, x: best.x, y: best.y }];
}
