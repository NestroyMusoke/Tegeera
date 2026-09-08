import type { SceneEntity } from "./schema";

// Bounds include current SVG rigs and a short label.
export function overlaps(a: SceneEntity, b: SceneEntity): boolean {
  return Math.abs(a.x - b.x) < entityHalfWidth(a) + entityHalfWidth(b) &&
    Math.abs(a.y - b.y) < 13 * (a.scale + b.scale);
}

export function entityHalfWidth(entity: SceneEntity): number {
  return Math.max(7, (entity.label?.length ?? 0) * 0.45) * entity.scale;
}

export function withinCanvas(entity: SceneEntity): boolean {
  const half = entityHalfWidth(entity);
  return entity.x - half >= 1 && entity.x + half <= 99 &&
    entity.y - 14 * entity.scale >= 1 && entity.y + 14 * entity.scale <= 99;
}

export const layoutPositions = [28, 60].flatMap((y) => [12, 30, 48, 66, 84].map((x) => ({ x, y })));

export function nextPositionFor(entities: SceneEntity[], kind: SceneEntity["kind"] = "generic", label?: string): { x: number; y: number } | null {
  for (const position of layoutPositions) {
    const candidate: SceneEntity = {
      id: "candidate", kind, label, ...position, scale: 1,
      direction: "right", highlighted: false
    };
    if (withinCanvas(candidate) && !entities.some((entity) => overlaps(candidate, entity))) return position;
  }
  return null;
}

export const nextPosition = (entities: SceneEntity[]) => nextPositionFor(entities);
