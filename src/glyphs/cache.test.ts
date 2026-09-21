import { describe, expect, it } from "vitest";
import { loadGlyphCache, rememberGlyph } from "./cache";

describe("private browser glyph cache", () => {
  it("degrades to a miss when IndexedDB is unavailable", async () => {
    expect(await loadGlyphCache()).toEqual(new Map());
    expect(await rememberGlyph("dragon", {
      schemaVersion: "1.0.0", viewBox: "0 0 100 100",
      parts: [{ id: "body", d: "M10 10 L90 90", fill: "none", stroke: "#2f3e46" }],
      anchors: { top: [50, 10], ground: [50, 90], front: [90, 50] }
    })).toBe(false);
  });

  it("rejects invalid data before touching storage", async () => {
    expect(await rememberGlyph("dragon", { parts: [{ d: "M10 10 L900 90" }] })).toBe(false);
    expect(await rememberGlyph("", {})).toBe(false);
  });
});
