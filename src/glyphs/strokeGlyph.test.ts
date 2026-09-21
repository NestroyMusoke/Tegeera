import { describe, expect, it } from "vitest";
import { compileStrokeGlyph, strokeGlyphSchema, StrokeStreamParser } from "./strokeGlyph";

const house = { strokes: [
  { part: "walls", color: "#2f3e46", pts: [[10, 25], [10, 42], [40, 42], [40, 25], [10, 25]] },
  { part: "roof", color: "#e9c46a", pts: [[7, 26], [25, 8], [43, 26], [7, 26]] },
  { part: "door", color: "#52796f", pts: [[22, 42], [22, 32], [28, 32], [28, 42]] }
] };

describe("validated stroke glyph", () => {
  it("compiles coarse strokes into bounded, smoothed glyph paths", () => {
    const glyph = compileStrokeGlyph(house);
    expect(glyph.parts).toHaveLength(3);
    expect(glyph.parts[0].d).toContain("C");
    expect(glyph.parts[0].d).toContain("Z");
    expect(glyph.anchors.ground[1]).toBe(84);
  });

  it("rejects out-of-bounds, unsafe colors and excessive points", () => {
    expect(strokeGlyphSchema.safeParse({ strokes: [{ ...house.strokes[0], color: "red" }] }).success).toBe(false);
    expect(strokeGlyphSchema.safeParse({ strokes: [{ ...house.strokes[0], pts: [[0, 0], [4, 4], [5, 5], [6, 6]] }] }).success).toBe(false);
    expect(strokeGlyphSchema.safeParse({ strokes: [{ ...house.strokes[0], pts: Array.from({ length: 15 }, () => [10, 10]) }] }).success).toBe(false);
  });

  it("emits only completed and validated strokes across partial chunks", () => {
    const parser = new StrokeStreamParser();
    const json = JSON.stringify(house);
    const cut = json.indexOf('},{"part":"roof"') + 1;
    expect(parser.push(json.slice(0, cut))).toHaveLength(1);
    expect(parser.push(json.slice(cut, -2))).toHaveLength(2);
    expect(parser.push(json.slice(-2))).toHaveLength(0);
  });
});
