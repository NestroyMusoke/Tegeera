import type { SceneState } from "../doodlescript/schema";
import { forceDiagramGeometry, isForceRelation } from "../doodlescript/forceDiagram";

const BOARD_WIDTH = 1000;
const BOARD_HEIGHT = 620;
const MIN_VIEW_WIDTH = 760;

function fitBounds(minX: number, minY: number, maxX: number, maxY: number, minimumWidth: number): string | null {
  const width = Math.max(minimumWidth, maxX - minX, (maxY - minY) * BOARD_WIDTH / BOARD_HEIGHT);
  if (!Number.isFinite(width) || width >= BOARD_WIDTH) return null;
  const height = width * BOARD_HEIGHT / BOARD_WIDTH;
  const x = Math.max(0, Math.min(BOARD_WIDTH - width, (minX + maxX - width) / 2));
  const y = Math.max(0, Math.min(BOARD_HEIGHT - height, (minY + maxY - height) / 2));
  const tidy = (value: number) => Number(value.toFixed(1));
  return `${tidy(x)} ${tidy(y)} ${tidy(width)} ${tidy(height)}`;
}

/** Conservative camera crop for ordinary diagrams. Specialist renderers draw across
 * the full board and must retain their own frame. This never edits scene geometry. */
export function overviewFrame(scene: SceneState): string | null {
  if (scene.entities.length < 2 || scene.entities.length > 8
    || scene.entities.some((entity) => Boolean(entity.visualRole))) return null;
  const xs = scene.entities.map((entity) => entity.x * 10);
  const ys = scene.entities.map((entity) => entity.y * 6.2);
  const minX = Math.min(...xs) - 95, maxX = Math.max(...xs) + 95;
  // Include glyph tops, labels below objects, and short connector ornaments.
  const minY = Math.min(...ys) - 112, maxY = Math.max(...ys) + 112;
  return fitBounds(minX, minY, maxX, maxY, MIN_VIEW_WIDTH);
}

/** Fit a complete force diagram from the same geometry used to draw its arrows.
 * Unknown extra content or off-board evidence keeps the safe full-board view. */
export function forceOverviewFrame(scene: SceneState): string | null {
  const relations = scene.relations ?? [];
  if (scene.entities.length !== 4 || relations.length !== 3 || !relations.every(isForceRelation)) return null;
  const geometry = forceDiagramGeometry(relations, scene.entities);
  if (!geometry) return null;
  const horizontal = [geometry.bodyX - 205, geometry.bodyX + 205, geometry.appliedStartX,
    geometry.appliedEndX, geometry.opposingStartX, geometry.opposingEndX];
  const minX = Math.min(...horizontal) - 40, maxX = Math.max(...horizontal) + 40;
  const minY = geometry.bodyY - 105, maxY = geometry.contactY + 65;
  if (minX < 0 || maxX > BOARD_WIDTH || minY < 0 || maxY > BOARD_HEIGHT) return null;
  return fitBounds(minX, minY, maxX, maxY, 500);
}
