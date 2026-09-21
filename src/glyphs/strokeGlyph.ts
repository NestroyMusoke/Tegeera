import { z } from "zod";
import { glyphSchema, TEGEERA_GLYPH_PALETTE, type TegeeraGlyph } from "./glyph";

const point = z.tuple([z.number().int().min(3).max(47), z.number().int().min(3).max(47)]);
export const strokeSchema = z.object({
  part: z.string().regex(/^[a-z][a-z0-9-]{0,29}$/),
  color: z.enum(TEGEERA_GLYPH_PALETTE),
  pts: z.array(point).min(4).max(14)
}).strict();
export const strokeGlyphSchema = z.object({ strokes: z.array(strokeSchema).min(1).max(10) }).strict();
export type StrokeGlyph = z.infer<typeof strokeGlyphSchema>;
export type Stroke = z.infer<typeof strokeSchema>;

const round = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));
const isClosed = (points: Stroke["pts"]) => points[0][0] === points.at(-1)![0] && points[0][1] === points.at(-1)![1];

/** Catmull–Rom to cubic Bézier; controls are clamped before entering the safe SVG path language. */
function strokePath(points: Stroke["pts"]): string {
  const closed = isClosed(points);
  const vertices = closed ? points.slice(0, -1) : points;
  const xy = (index: number) => {
    const length = vertices.length;
    return closed ? vertices[(index + length) % length] : vertices[Math.max(0, Math.min(length - 1, index))];
  };
  const segments = [`M${vertices[0][0] * 2} ${vertices[0][1] * 2}`];
  const count = closed ? vertices.length : vertices.length - 1;
  for (let i = 0; i < count; i++) {
    const [x0, y0] = xy(i - 1), [x1, y1] = xy(i), [x2, y2] = xy(i + 1), [x3, y3] = xy(i + 2);
    const c1x = round(2 * (x1 + (x2 - x0) / 6));
    const c1y = round(2 * (y1 + (y2 - y0) / 6));
    const c2x = round(2 * (x2 - (x3 - x1) / 6));
    const c2y = round(2 * (y2 - (y3 - y1) / 6));
    segments.push(`C${c1x} ${c1y} ${c2x} ${c2y} ${x2 * 2} ${y2 * 2}`);
  }
  if (closed) segments.push("Z");
  return segments.join(" ");
}

/** Converts a whole or partial stroke sequence into the same validated runtime artifact as other glyph tiers. */
export function compileStrokeGlyph(candidate: unknown): TegeeraGlyph {
  const { strokes } = strokeGlyphSchema.parse(candidate);
  const allPoints = strokes.flatMap((stroke) => stroke.pts);
  const xs = allPoints.map(([x]) => x * 2), ys = allPoints.map(([, y]) => y * 2);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const glyph = {
    schemaVersion: "1.0.0" as const,
    viewBox: "0 0 100 100" as const,
    parts: strokes.map((stroke, index) => ({
      id: `${stroke.part.slice(0, 23)}-${index + 1}`,
      d: strokePath(stroke.pts),
      fill: "none" as const,
      stroke: stroke.color
    })),
    anchors: {
      top: [round((minX + maxX) / 2), minY],
      ground: [round((minX + maxX) / 2), maxY],
      front: [maxX, round((minY + maxY) / 2)]
    }
  };
  return glyphSchema.parse(glyph);
}

/** Extract only complete JSON stroke objects; incomplete network chunks never reach the renderer. */
export class StrokeStreamParser {
  private buffer = "";
  private emitted = 0;

  push(chunk: string): Stroke[] {
    this.buffer += chunk;
    if (this.buffer.length > 32_000) throw new Error("Stroke stream exceeds limit");
    const marker = this.buffer.indexOf('"strokes"');
    if (marker < 0) return [];
    const array = this.buffer.indexOf("[", marker + 9);
    if (array < 0) return [];
    const found: Stroke[] = [];
    let depth = 0, start = -1, quoted = false, escaped = false;
    for (let i = array + 1; i < this.buffer.length; i++) {
      const char = this.buffer[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') { quoted = true; continue; }
      if (char === "{") { if (depth++ === 0) start = i; }
      else if (char === "}" && --depth === 0 && start >= 0) {
        if (found.length < 10) {
          try { found.push(strokeSchema.parse(JSON.parse(this.buffer.slice(start, i + 1)))); }
          catch { /* A malformed partial stroke is ignored, never rendered. */ }
        }
      }
      else if (char === "]" && depth === 0) break;
    }
    const newStrokes = found.slice(this.emitted);
    this.emitted = found.length;
    return newStrokes;
  }
}
