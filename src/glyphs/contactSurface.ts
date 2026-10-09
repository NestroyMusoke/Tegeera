import { isSafeGlyphPath, type TegeeraGlyph } from "./glyph";

type Point = { x: number; y: number };
export interface GlyphContactSurface { left: Point; right: Point; halfWidth: number }
const surfaces = new WeakMap<TegeeraGlyph, GlyphContactSurface | null>();

/** Bounded, DOM-free sampling of the same allowlisted paths the renderer uses.
 * This finds visible ink, not a semantic grip (such as an umbrella handle).
 * Curves use 24 samples per segment; line intersections are exact.
 */
export function glyphContactSurface(glyph: TegeeraGlyph): GlyphContactSurface | undefined {
  if (surfaces.has(glyph)) return surfaces.get(glyph) ?? undefined;
  const points: Point[] = []; const crossings: Point[] = [];
  const height = 43;
  const segment = (a: Point, b: Point) => {
    if (a.x === b.x && a.y === b.y) return;
    points.push(a, b);
    if ((a.y <= height && b.y >= height || b.y <= height && a.y >= height) && a.y !== b.y) {
      const t = (height - a.y) / (b.y - a.y);
      crossings.push({ x: a.x + t * (b.x - a.x), y: height });
    }
  };
  if (glyph.parts.length > 12 || glyph.parts.some(({ d }) => d.length > 800 || !isSafeGlyphPath(d))) {
    surfaces.set(glyph, null); return undefined;
  }
  for (const { d } of glyph.parts) {
    const tokens = d.match(/[MLCQZ]|-?(?:\d+(?:\.\d+)?|\.\d+)/g)!;
    let index = 0; let current = { x: 0, y: 0 }; let start = current;
    const read = (): Point => ({ x: Number(tokens[index++]), y: Number(tokens[index++]) });
    while (index < tokens.length) {
      const command = tokens[index++];
      if (command === "M") { current = read(); start = current; continue; }
      if (command === "L" || command === "Z") {
        const end = command === "Z" ? start : read(); segment(current, end); current = end; continue;
      }
      const a = current; const b = read(); const c = read(); const end = command === "C" ? read() : c;
      for (let step = 1; step <= 24; step += 1) {
        const t = step / 24; const u = 1 - t;
        const next = command === "C"
          ? { x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * end.x,
            y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * end.y }
          : { x: u * u * a.x + 2 * u * t * b.x + t * t * end.x,
            y: u * u * a.y + 2 * u * t * b.y + t * t * end.y };
        segment(current, next); current = next;
      }
    }
  }
  if (!points.length) { surfaces.set(glyph, null); return undefined; }
  // Include the whole silhouette. A scanline alone can hit a narrow stem and
  // hide a wider canopy, making the arm reach through the object's clearance.
  const candidates = [...crossings, ...points];
  const pick = (side: -1 | 1) => candidates.reduce((best, point) => {
    const score = (p: Point) => (p.x - (side === -1 ? 0 : 100)) ** 2 + (p.y - height) ** 2;
    return score(point) < score(best) ? point : best;
  });
  const local = (point: Point) => ({ x: point.x - 50, y: point.y - 50 });
  const result = { left: local(pick(-1)), right: local(pick(1)),
    halfWidth: points.reduce((width, point) => Math.max(width, Math.abs(point.x - 50)), 0) };
  surfaces.set(glyph, result);
  return result;
}
