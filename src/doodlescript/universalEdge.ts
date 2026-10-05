import { entityVisualGeometry } from "./entityGeometry";
import type { SceneEntity, SceneRelation } from "./schema";

type Point = { x: number; y: number };
type Box = { left: number; right: number; top: number; bottom: number };

const center = (entity: SceneEntity): Point => ({ x: entity.x * 10, y: entity.y * 6.2 });
const shape = (entity: SceneEntity) => ({
  rx: (entityVisualGeometry[entity.kind].contact.halfWidth + 13) * entity.scale,
  ry: 55 * entity.scale
});
const obstacle = (entity: SceneEntity): Box => {
  const { x, y } = center(entity);
  const { rx, ry } = shape(entity);
  return { left: x - rx - 9, right: x + rx + 9, top: y - ry - 9,
    bottom: y + Math.max(ry, 84 * entity.scale) + 9 };
};
const clipEllipse = (entity: SceneEntity, toward: Point, leaving = false): Point => {
  const from = center(entity);
  const { rx, ry } = shape(entity);
  const dx = toward.x - from.x; const dy = toward.y - from.y;
  // Object captions sit below the doodle. A downward connector must start
  // below that caption or its first stroke draws straight through the noun.
  if (leaving && dy > 0 && Math.abs(dx) < rx) return { x: from.x, y: from.y + 104 * entity.scale };
  const distance = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2) || 1;
  return { x: from.x + dx / distance, y: from.y + dy / distance };
};

// Liang–Barsky clipping detects a path entering a third object's silhouette or label.
function intersects(a: Point, b: Point, box: Box): boolean {
  const dx = b.x - a.x; const dy = b.y - a.y;
  let entry = 0; let exit = 1;
  for (const [p, q] of [[-dx, a.x - box.left], [dx, box.right - a.x],
    [-dy, a.y - box.top], [dy, box.bottom - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) entry = Math.max(entry, t);
    else exit = Math.min(exit, t);
    if (entry > exit) return false;
  }
  return true;
}

const length = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** A relation's grammatical actor is not always the moving object. An
 * attraction moves the patient toward the actor, so its motion cue runs back
 * toward the actor while the graph retains actor -> patient semantics. */
export const attractionMotion = (predicate?: string): boolean =>
  /^(?:pull|pulls|pulling|attract|attracts|attracting)\b/i.test(predicate?.trim() ?? "");

/** The subject of "points away from X" is semantically linked to X, but the
 * visible direction cue starts at X and points outward toward the subject. */
export const awayFromMotion = (predicate?: string): boolean =>
  /\b(?:points?|faces?|extends?|moves?|travels?|flows?)\s+away\s+from\b/i.test(predicate?.trim() ?? "");

/** "X rises from Y" encodes X -> Y grammatically, but the visible motion
 * begins at the origin Y. Keep graph endpoints unchanged; reverse only ink. */
export const originMotion = (predicate?: string): boolean =>
  /^(?:rises?|ascends?|emerges?|flows?|falls?|descends?|drops?|comes?|moves?|travels?|drips?|pours?|escapes?)\s+from\b/i
    .test(readableRelationLabel(predicate));

/** Model relation IDs occasionally arrive as camelCase; captions are prose. */
export const readableRelationLabel = (predicate?: string): string =>
  (predicate ?? "relates to").replace(/([a-z])([A-Z])/g, (_, first: string, second: string) =>
    `${first} ${second.toLowerCase()}`).trim();

export interface UniversalEdgeGeometry {
  source: SceneEntity;
  target: SceneEntity;
  path: string;
  arrow: string;
  labelX: number;
  labelY: number;
  labelWidth: number;
  route: "direct" | "above" | "below" | "left" | "right";
  start: Point;
  end: Point;
  points: readonly Point[];
}

const labelBox = ({ labelX, labelY, labelWidth }: UniversalEdgeGeometry): Box => ({
  left: labelX - labelWidth / 2, right: labelX + labelWidth / 2,
  top: labelY - 18, bottom: labelY + 10
});

function crossing(a: Point, b: Point, c: Point, d: Point): { point: Point; overlap: boolean } | null {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const ex = d.x - c.x; const ey = d.y - c.y;
  const determinant = dx * ey - dy * ex;
  if (Math.abs(determinant) < 0.001) {
    const segmentLength = length(a, b);
    if (segmentLength < 0.001 || Math.abs((c.x - a.x) * dy - (c.y - a.y) * dx) > segmentLength) return null;
    const first = ((c.x - a.x) * dx + (c.y - a.y) * dy) / (segmentLength * segmentLength);
    const last = ((d.x - a.x) * dx + (d.y - a.y) * dy) / (segmentLength * segmentLength);
    const low = Math.max(0, Math.min(first, last));
    const high = Math.min(1, Math.max(first, last));
    if (high < low) return null;
    const middle = (low + high) / 2;
    return { point: { x: a.x + middle * dx, y: a.y + middle * dy },
      overlap: (high - low) * segmentLength > 4 };
  }
  const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / determinant;
  const u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / determinant;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
    ? { point: { x: a.x + t * dx, y: a.y + t * dy }, overlap: false } : null;
}

/** Clip both ends to visible silhouettes; route around third-party symbols and labels. */
export function universalEdgeGeometry(relation: SceneRelation, entities: readonly SceneEntity[],
  reserved: readonly UniversalEdgeGeometry[] = []): UniversalEdgeGeometry | null {
  if (relation.kind !== "relatesTo" || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const actor = entities.find((entity) => entity.id === relation.sourceIds[0]);
  const patient = entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!actor || !patient || actor.id === patient.id) return null;
  const reversedMotion = attractionMotion(relation.predicate) || awayFromMotion(relation.predicate)
    || originMotion(relation.predicate);
  const source = reversedMotion ? patient : actor;
  const target = reversedMotion ? actor : patient;
  const startCenter = center(source); const endCenter = center(target);
  const sourceBox = obstacle(source); const targetBox = obstacle(target);
  const blockers = entities.filter((entity) => entity.id !== source.id && entity.id !== target.id).map(obstacle);
  const candidates: { route: UniversalEdgeGeometry["route"]; via: Point[] }[] = [
    { route: "direct", via: [] },
    ...[72, 96, 120].map((y) => ({ route: "above" as const, via: [{ x: startCenter.x, y }, { x: endCenter.x, y }] })),
    ...[548, 524, 500].map((y) => ({ route: "below" as const, via: [{ x: startCenter.x, y }, { x: endCenter.x, y }] })),
    ...[70, 94, 118].map((x) => ({ route: "left" as const, via: [{ x, y: startCenter.y }, { x, y: endCenter.y }] })),
    ...[930, 906, 882].map((x) => ({ route: "right" as const, via: [{ x, y: startCenter.y }, { x, y: endCenter.y }] }))
  ];
  let best: { route: UniversalEdgeGeometry["route"]; points: Point[]; label: Point;
    labelWidth: number; cost: number } | null = null;
  for (const { route, via } of candidates) {
    const first = via[0] ?? endCenter;
    const last = via.at(-1) ?? startCenter;
    const points = [clipEllipse(source, first, true), ...via, clipEllipse(target, last)]
      .filter((point, index, array) => !index || length(point, array[index - 1]) > 1);
    if (points.length < 2 || points.some((point) => point.x < 12 || point.x > 988 || point.y < 12 || point.y > 608)) continue;
    const segments = points.slice(1).map((point, index) => [points[index], point] as const);
    if (segments.some(([a, b]) => blockers.some((box) => intersects(a, b, box)))) continue;
    // An endpoint may be touched only by its own terminal stroke. In compact
    // scenes a clipped "direct" stroke can otherwise run backwards or through
    // a different object's caption while still passing the blocker check.
    if (segments.some(([a, b], index) => (index !== 0 && intersects(a, b, sourceBox))
      || (index !== segments.length - 1 && intersects(a, b, targetBox)))) continue;
    if (segments.some(([a, b]) => reserved.some((edge) => {
      if (intersects(a, b, labelBox(edge))) return true;
      return edge.points.slice(1).some((point, index) => {
        const previous = edge.points[index];
        const hit = crossing(a, b, previous, point);
        if (!hit) return false;
        if (hit.overlap) return true;
        const shared = [source.id, target.id].filter((id) => id === edge.source.id || id === edge.target.id);
        return !shared.some((id) => length(hit.point, id === source.id ? startCenter : endCenter) < 95);
      });
    }))) continue;
    const start = points[0]; const end = points.at(-1)!;
    const afterStart = points[1]; const beforeEnd = points.at(-2)!;
    if ((afterStart.x - start.x) * (start.x - startCenter.x) + (afterStart.y - start.y) * (start.y - startCenter.y) <= 0
      || (end.x - beforeEnd.x) * (endCenter.x - end.x) + (end.y - beforeEnd.y) * (endCenter.y - end.y) <= 0
      || length(beforeEnd, end) < 18) continue;
    const labelWidth = Math.max(56, readableRelationLabel(relation.predicate).length * 8 + 16);
    const halfWidth = labelWidth / 2;
    const occupied = [sourceBox, targetBox, ...blockers];
    let label: Point | undefined;
    for (const [a, b] of [...segments].sort((left, right) => length(...right) - length(...left))) {
      const vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
      for (const fraction of [0.5, 0.25, 0.75]) {
        const midpoint = { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
        // Vertical captions must clear the *silhouettes and noun captions* of
        // both endpoints. A fixed half-width offset made short stacked links
        // unroutable and forced a long U-shaped detour around the whole scene.
        const verticalOffset = Math.max(sourceBox.right - startCenter.x,
          startCenter.x - sourceBox.left, targetBox.right - endCenter.x,
          endCenter.x - targetBox.left) + halfWidth + 12;
        const positions = vertical
          ? [{ x: midpoint.x + verticalOffset, y: midpoint.y + 5 },
            { x: midpoint.x - verticalOffset, y: midpoint.y + 5 }]
          : [{ x: midpoint.x, y: midpoint.y - 14 }, { x: midpoint.x, y: midpoint.y + 31 }];
        label = positions.find(({ x, y }) => {
          const box = { left: x - halfWidth, right: x + halfWidth, top: y - 18, bottom: y + 10 };
          return box.left >= 12 && box.right <= 988 && box.top >= 12 && box.bottom <= 608
            && occupied.every((item) => box.right < item.left || box.left > item.right
              || box.bottom < item.top || box.top > item.bottom)
            && reserved.every((edge) => {
              const prior = labelBox(edge);
              return (box.right < prior.left || box.left > prior.right
                || box.bottom < prior.top || box.top > prior.bottom)
                && edge.points.slice(1).every((point, index) => !intersects(edge.points[index], point, box));
            })
            && segments.every(([c, d]) => (c === a && d === b) || !intersects(c, d, box));
        });
        if (label) break;
      }
      if (label) break;
    }
    if (!label) continue;
    const cost = segments.reduce((sum, [a, b]) => sum + length(a, b), 0) + via.length * 36;
    if (!best || cost < best.cost) best = { route, points, label, labelWidth, cost };
  }
  if (!best) return null;
  const points = best.points;
  const end = points.at(-1)!;
  const beforeEnd = points.at(-2)!;
  const segmentLength = length(beforeEnd, end) || 1;
  const ux = (end.x - beforeEnd.x) / segmentLength;
  const uy = (end.y - beforeEnd.y) / segmentLength;
  const normal = { x: -uy * 9, y: ux * 9 };
  const arrow = `M${end.x - ux * 14 + normal.x} ${end.y - uy * 14 + normal.y} L${end.x} ${end.y} L${end.x - ux * 14 - normal.x} ${end.y - uy * 14 - normal.y}`;
  return { source: actor, target: patient, path: points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" "),
    arrow, labelX: best.label.x, labelY: best.label.y, labelWidth: best.labelWidth,
    route: best.route, start: points[0], end, points };
}

/** The planner and canvas use the same reservations, so accepted plans cannot
 * silently paint a different set of generic arrows from the one validated. */
export function universalSceneEdges(relations: readonly SceneRelation[], entities: readonly SceneEntity[]):
  ReadonlyMap<string, UniversalEdgeGeometry | null> {
  const result = new Map<string, UniversalEdgeGeometry | null>();
  const reserved: UniversalEdgeGeometry[] = [];
  for (const relation of relations) {
    if (relation.kind !== "relatesTo") continue;
    const geometry = universalEdgeGeometry(relation, entities, reserved);
    result.set(relation.id, geometry);
    if (geometry) reserved.push(geometry);
  }
  return result;
}
