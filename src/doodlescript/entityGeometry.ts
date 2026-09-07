import type { EntityKind, SceneEntity } from "./schema";

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface EntityVisualGeometry {
  /** The point a viewer naturally looks or points toward, in glyph coordinates. */
  attention: CanvasPoint;
  /** Horizontal silhouette extent and useful contact height, in glyph coordinates. */
  contact: { halfWidth: number; y: number };
}

// Geometry belongs to visual kinds, never to lesson sentences. This registry is
// exhaustive so every renderer has a stable semantic target even before a more
// detailed glyph-specific anchor is introduced.
export const entityVisualGeometry: Record<EntityKind, EntityVisualGeometry> = {
  person: { attention: { x: 0, y: -42 }, contact: { halfWidth: 22, y: -12 } },
  teacher: { attention: { x: 0, y: -42 }, contact: { halfWidth: 22, y: -12 } },
  student: { attention: { x: 0, y: -42 }, contact: { halfWidth: 22, y: -12 } },
  process: { attention: { x: 0, y: -4 }, contact: { halfWidth: 25, y: -4 } },
  cpu: { attention: { x: 0, y: 0 }, contact: { halfWidth: 42, y: 0 } },
  car: { attention: { x: 0, y: -8 }, contact: { halfWidth: 50, y: 0 } },
  book: { attention: { x: 0, y: -5 }, contact: { halfWidth: 45, y: 0 } },
  desk: { attention: { x: 0, y: 5 }, contact: { halfWidth: 48, y: 5 } },
  tree: { attention: { x: 0, y: -38 }, contact: { halfWidth: 35, y: -18 } },
  building: { attention: { x: 0, y: -15 }, contact: { halfWidth: 48, y: -5 } },
  generic: { attention: { x: 0, y: -7 }, contact: { halfWidth: 43, y: -7 } }
};

function toCanvas(entity: SceneEntity, local: CanvasPoint): CanvasPoint {
  return {
    x: entity.x * 10 + local.x * entity.scale,
    y: entity.y * 6.2 + local.y * entity.scale
  };
}

export function attentionAnchor(entity: SceneEntity): CanvasPoint {
  return toCanvas(entity, entityVisualGeometry[entity.kind].attention);
}

/** Returns the visible surface nearest the source, ready for later touch/hold IK. */
export function contactAnchor(entity: SceneEntity, sourceX: number): CanvasPoint {
  const geometry = entityVisualGeometry[entity.kind].contact;
  const side = sourceX <= entity.x * 10 ? -1 : 1;
  return toCanvas(entity, { x: side * geometry.halfWidth, y: geometry.y });
}

/** Shoulder position after the torso lean used by the articulated SVG rig. */
export function shoulderAnchor(entity: SceneEntity, bodyLean = 0): CanvasPoint {
  const radians = bodyLean * Math.PI / 180;
  const localX = 16 * Math.sin(radians);
  const localY = 4 - 16 * Math.cos(radians);
  const facing = entity.direction === "left" ? -1 : 1;
  return toCanvas(entity, { x: localX * facing, y: localY });
}
