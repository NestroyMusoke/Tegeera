import { overlaps, withinCanvas } from "./layout";
import { layoutFamilyFor, type LayoutFamilyId } from "./layoutFamilyRegistry";
import type { SceneEntity, SceneState } from "./schema";

export interface LayoutEdge {
  sourceId: string;
  targetId: string;
}

export interface LayoutCandidateScore {
  movement: number;
  connectorCrossings: number;
  preference: number;
  total: number;
}

export interface LayoutCandidateResult {
  entities: SceneEntity[];
  projected: SceneEntity[];
  score: LayoutCandidateScore;
}

export interface LayoutCandidateOptions {
  family: LayoutFamilyId;
  connectorEdges?: readonly LayoutEdge[];
  validate?: (projected: readonly SceneEntity[]) => boolean;
  preference?: (planned: readonly SceneEntity[], projected: readonly SceneEntity[]) => number;
}

function orientation(a: SceneEntity, b: SceneEntity, c: SceneEntity): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export function connectorSegmentsCross(
  first: readonly [SceneEntity, SceneEntity],
  second: readonly [SceneEntity, SceneEntity]
): boolean {
  if (first.some((entity) => second.some((other) => other.id === entity.id))) return false;
  const [a, b] = first;
  const [c, d] = second;
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

export function connectorCrossingCount(edges: readonly LayoutEdge[], entities: readonly SceneEntity[]): number {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const segments = edges.flatMap((edge) => {
    const source = byId.get(edge.sourceId);
    const target = byId.get(edge.targetId);
    return source && target ? [[[source, target] as const, edge] as const] : [];
  });
  let crossings = 0;
  for (let index = 0; index < segments.length; index += 1) {
    for (let other = index + 1; other < segments.length; other += 1) {
      if (connectorSegmentsCross(segments[index][0], segments[other][0])) crossings += 1;
    }
  }
  return crossings;
}

function signature(entities: readonly SceneEntity[]): string {
  return [...entities].sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, x, y }) => `${id}:${x.toFixed(3)}:${y.toFixed(3)}`).join("|");
}

/**
 * Shared hard gates and scoring for bounded layout families. Candidates may move
 * only the entities they contain; all other scene entities remain fixed obstacles.
 */
export function selectLayoutCandidate(
  scene: SceneState,
  candidates: readonly (readonly SceneEntity[])[],
  options: LayoutCandidateOptions
): LayoutCandidateResult | null {
  const family = layoutFamilyFor(options.family);
  const originalById = new Map(scene.entities.map((entity) => [entity.id, entity]));
  const accepted: LayoutCandidateResult[] = [];

  for (const candidate of candidates) {
    const ids = new Set(candidate.map((entity) => entity.id));
    if (ids.size !== candidate.length || candidate.some((entity) => !originalById.has(entity.id))) continue;
    const obstacles = scene.entities.filter((entity) => !ids.has(entity.id));
    if (candidate.some((entity) => !withinCanvas(entity)
      || obstacles.some((obstacle) => overlaps(entity, obstacle)))) continue;
    if (candidate.some((entity, index) => candidate.slice(index + 1).some((other) => overlaps(entity, other)))) continue;

    const plannedById = new Map(candidate.map((entity) => [entity.id, entity]));
    const projected = scene.entities.map((entity) => plannedById.get(entity.id) ?? entity);
    if (options.validate && !options.validate(projected)) continue;
    const movement = candidate.reduce((total, entity) => {
      const original = originalById.get(entity.id)!;
      return total + Math.abs(original.x - entity.x) + Math.abs(original.y - entity.y);
    }, 0);
    const connectorCrossings = connectorCrossingCount(options.connectorEdges ?? [], projected);
    const preference = Math.max(0, options.preference?.(candidate, projected) ?? 0);
    accepted.push({
      entities: [...candidate], projected,
      score: {
        movement, connectorCrossings, preference,
        total: connectorCrossings * family.connectorCrossingPenalty + movement * family.movementWeight + preference
      }
    });
  }

  return accepted.sort((a, b) => a.score.total - b.score.total
    || a.score.connectorCrossings - b.score.connectorCrossings
    || a.score.movement - b.score.movement
    || signature(a.entities).localeCompare(signature(b.entities)))[0] ?? null;
}
