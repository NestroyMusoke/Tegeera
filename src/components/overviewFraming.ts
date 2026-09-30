import type { SceneState } from "../doodlescript/schema";

const BOARD_WIDTH = 1000;
const BOARD_HEIGHT = 620;
const MIN_VIEW_WIDTH = 760;

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
  const width = Math.max(MIN_VIEW_WIDTH, maxX - minX, (maxY - minY) * BOARD_WIDTH / BOARD_HEIGHT);
  if (!Number.isFinite(width) || width >= BOARD_WIDTH) return null;
  const height = width * BOARD_HEIGHT / BOARD_WIDTH;
  const x = Math.max(0, Math.min(BOARD_WIDTH - width, (minX + maxX - width) / 2));
  const y = Math.max(0, Math.min(BOARD_HEIGHT - height, (minY + maxY - height) / 2));
  const tidy = (value: number) => Number(value.toFixed(1));
  return `${tidy(x)} ${tidy(y)} ${tidy(width)} ${tidy(height)}`;
}
