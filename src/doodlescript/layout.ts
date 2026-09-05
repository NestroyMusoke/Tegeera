import type { SceneEntity } from "./schema";

// Bounds include current SVG rigs and a short label.
export function overlaps(a: SceneEntity, b: SceneEntity): boolean {
  return Math.abs(a.x - b.x) < halfWidth(a) + halfWidth(b) &&
    Math.abs(a.y - b.y) < 13 * (a.scale + b.scale);
}

function halfWidth(entity: SceneEntity): number {
  return Math.max(7, (entity.label?.length ?? 0) * 0.45) * entity.scale;
}

export function withinCanvas(entity: SceneEntity): boolean {
  const half = halfWidth(entity);
  return entity.x - half >= 1 && entity.x + half <= 99 &&
    entity.y - 14 * entity.scale >= 1 && entity.y + 14 * entity.scale <= 99;
}

export function nextPosition(entities: SceneEntity[]): { x: number; y: number } | null {
  for (const y of [28, 60]) {
    for (const x of [12, 30, 48, 66, 84]) {
      const candidate: SceneEntity = {
        id: "candidate", kind: "generic", x, y, scale: 1,
        direction: "right", highlighted: false
      };
      if (!entities.some((entity) => overlaps(candidate, entity))) return { x, y };
    }
  }
  return null;
}
