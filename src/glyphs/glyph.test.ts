import { describe, expect, it } from "vitest";
import { glyphSchema, isSafeGlyphPath, resolveGlyph, type TegeeraGlyph } from "./glyph";

const glyph: TegeeraGlyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [{ id: "body", d: "M10 50 C10 20 90 20 90 50 Q90 85 50 88 L10 50 Z", fill: "#84a98c", stroke: "#2f3e46" }],
  anchors: { top: [50, 20], ground: [50, 88], front: [90, 50] }
};

describe("safe noun glyph contract", () => {
  it("accepts bounded contours and rejects injection, relative commands, and out-of-box coordinates", () => {
    expect(glyphSchema.safeParse(glyph).success).toBe(true);
    expect(isSafeGlyphPath("M10 10 L90 90 Z")).toBe(true);
    expect(isSafeGlyphPath("M10 10 L190 90 Z")).toBe(false);
    expect(isSafeGlyphPath("M10 10 l20 20 Z")).toBe(false);
    expect(isSafeGlyphPath('M10 10 Z" onload="alert(1)')).toBe(false);
    expect(glyphSchema.safeParse({ ...glyph, parts: [glyph.parts[0], glyph.parts[0]] }).success).toBe(false);
  });

  it("resolves hero rig, pack, emoji, cache, generation, and sticker in deterministic order", () => {
    const pack = new Map([["dragon", glyph]]); const emoji = new Map([["dragon", { ...glyph }]]);
    const cache = new Map([["dragon", { ...glyph }]]); const synonyms = new Map([["wyrm", "dragon"]]);
    expect(resolveGlyph({ noun: "dragon", kind: "tree", pack, emoji, cache, generated: glyph }).source).toBe("hero-rig");
    expect(resolveGlyph({ noun: "Dragon!", kind: "generic", pack, emoji, cache, generated: glyph }).source).toBe("glyph-pack");
    expect(resolveGlyph({ noun: "wyrm", kind: "generic", pack, synonyms }).source).toBe("glyph-pack");
    expect(resolveGlyph({ noun: "dragon", kind: "generic", emoji, cache, generated: glyph }).source).toBe("emoji");
    expect(resolveGlyph({ noun: "dragon", kind: "generic", cache, generated: glyph }).source).toBe("cache");
    expect(resolveGlyph({ noun: "dragon", kind: "generic", generated: glyph }).source).toBe("generated");
    expect(resolveGlyph({ noun: "dragon", kind: "generic", generated: { ...glyph, parts: [] } as TegeeraGlyph }).source).toBe("sticker");
    expect(resolveGlyph({ noun: "dragon", kind: "generic" }).source).toBe("sticker");
  });
});
