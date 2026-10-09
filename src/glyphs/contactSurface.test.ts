import { describe, expect, it } from "vitest";
import { glyphContactSurface } from "./contactSurface";
import type { TegeeraGlyph } from "./glyph";
import { contactAnchor } from "../doodlescript/entityGeometry";

const glyph = (d: string): TegeeraGlyph => ({ schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [{ id: "outline", d, fill: "none", stroke: "#2f3e46" }],
  anchors: { top: [50, 10], ground: [50, 90], front: [90, 50] } });

describe("glyph-aware contact surfaces", () => {
  it("uses narrow artwork instead of generic padding", () => {
    expect(glyphContactSurface(glyph("M40 10 L60 10 L60 90 L40 90 Z")))
      .toEqual({ left: { x: -10, y: -7 }, right: { x: 10, y: -7 }, halfWidth: 10 });
  });
  it("handles multiple subpaths without connecting invisible move segments", () => {
    const result = glyphContactSurface(glyph("M10 10 L20 20 M80 80 L90 90"))!;
    expect(result.left.y).not.toBe(-7);
    expect(result.right.y).not.toBe(-7);
  });
  it.each(["M50 10 Q90 50 50 90 Q10 50 50 10 Z", "M50 10 C90 10 90 90 50 90 C10 90 10 10 50 10 Z"])("samples curved ink symmetrically: %s", (d) => {
    const surface = glyphContactSurface(glyph(d))!;
    expect(surface.left.x).toBeCloseTo(-surface.right.x, 6);
    expect(Math.abs(surface.left.y + 7)).toBeLessThan(8);
    expect(surface.halfWidth).toBeGreaterThan(15);
  });
  it("caches repeated staging lookups by glyph identity", () => {
    const shape = glyph("M20 20 L80 80");
    expect(glyphContactSurface(shape)).toBe(glyphContactSurface(shape));
  });
  it("does not invent ink from an isolated move command", () => {
    expect(glyphContactSurface(glyph("M50 50"))).toBeUndefined();
  });
  it("does not mistake a narrow stem for the entire contact silhouette", () => {
    const surface = glyphContactSurface(glyph("M10 30 L90 30 M50 30 L50 90"))!;
    expect(surface.left).toEqual({ x: -40, y: -20 });
    expect(surface.right).toEqual({ x: 40, y: -20 });
  });
  it.each(["M0 0 L101 20", "M0 0 A10 10 0 0 0 20 20", "M0 0 LNaN 20"])("rejects unsafe paths: %s", (d) => {
    expect(glyphContactSurface(glyph(d))).toBeUndefined();
  });
  it("transforms contact into scaled canvas coordinates on either side", () => {
    const entity = { id: "test", kind: "generic" as const, x: 50, y: 50, scale: 2,
      direction: "right" as const, highlighted: false, glyph: glyph("M40 10 L60 10 L60 90 L40 90 Z") };
    expect(contactAnchor(entity, 100)).toEqual({ x: 480, y: 296 });
    expect(contactAnchor(entity, 900)).toEqual({ x: 520, y: 296 });
    // Native rigs ignore supplied glyphs in the renderer; geometry must agree.
    expect(contactAnchor({ ...entity, kind: "book" }, 100)).toEqual({ x: 410, y: 310 });
  });
});
