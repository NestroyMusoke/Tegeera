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
const clipEllipse = (entity: SceneEntity, toward: Point): Point => {
  const from = center(entity);
  const { rx, ry } = shape(entity);
  const dx = toward.x - from.x; const dy = toward.y - from.y;
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

export interface UniversalEdgeGeometry {
  source: SceneEntity;
  target: SceneEntity;
  path: string;
  arrow: string;
  labelX: number;
  labelY: number;
  route: "direct" | "above" | "below" | "left" | "right";
  start: Point;
  end: Point;
}

/** Clip both ends to visible silhouettes; route around third-party symbols and labels. */
export function universalEdgeGeometry(relation: SceneRelation, entities: readonly SceneEntity[]): UniversalEdgeGeometry | null {
  if (relation.kind !== "relatesTo" || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const source = entities.find((entity) => entity.id === relation.sourceIds[0]);
  const target = entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!source || !target || source.id === target.id) return null;
  const startCenter = center(source); const endCenter = center(target);
  const blockers = entities.filter((entity) => entity.id !== source.id && entity.id !== target.id).map(obstacle);
  const candidates: { route: UniversalEdgeGeometry["route"]; via: Point[] }[] = [
    { route: "direct", via: [] },
    { route: "above", via: [{ x: startCenter.x, y: 72 }, { x: endCenter.x, y: 72 }] },
    { route: "below", via: [{ x: startCenter.x, y: 548 }, { x: endCenter.x, y: 548 }] },
    { route: "left", via: [{ x: 70, y: startCenter.y }, { x: 70, y: endCenter.y }] },
    { route: "right", via: [{ x: 930, y: startCenter.y }, { x: 930, y: endCenter.y }] }
  ];
  let best: { route: UniversalEdgeGeometry["route"]; points: Point[]; cost: number } | null = null;
  for (const { route, via } of candidates) {
    const first = via[0] ?? endCenter;
    const last = via.at(-1) ?? startCenter;
    const points = [clipEllipse(source, first), ...via, clipEllipse(target, last)]
      .filter((point, index, array) => !index || length(point, array[index - 1]) > 1);
    if (points.length < 2 || points.some((point) => point.x < 12 || point.x > 988 || point.y < 12 || point.y > 608)) continue;
    const segments = points.slice(1).map((point, index) => [points[index], point] as const);
    if (segments.some(([a, b]) => blockers.some((box) => intersects(a, b, box)))) continue;
    const cost = segments.reduce((sum, [a, b]) => sum + length(a, b), 0) + via.length * 36;
    if (!best || cost < best.cost) best = { route, points, cost };
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
  const segments = points.slice(1).map((point, index) => [points[index], point] as const);
  const [labelStart, labelEnd] = segments.sort((a, b) => length(...b) - length(...a))[0];
  return { source, target, path: points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" "),
    arrow, labelX: (labelStart.x + labelEnd.x) / 2, labelY: (labelStart.y + labelEnd.y) / 2 - 12,
    route: best.route, start: points[0], end };
}
