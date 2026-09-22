import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetGlyph, loadGlyphCache, rememberGlyph } from "./cache";

afterEach(() => vi.unstubAllGlobals());

describe("private browser glyph cache", () => {
  it("degrades to a miss when IndexedDB is unavailable", async () => {
    expect(await loadGlyphCache()).toEqual(new Map());
    expect(await rememberGlyph("dragon", {
      schemaVersion: "1.0.0", viewBox: "0 0 100 100",
      parts: [{ id: "body", d: "M10 10 L90 90", fill: "none", stroke: "#2f3e46" }],
      anchors: { top: [50, 10], ground: [50, 90], front: [90, 50] }
    })).toBe(false);
    expect(await forgetGlyph("dragon")).toBe(false);
  });

  it("rejects invalid data before touching storage", async () => {
    expect(await rememberGlyph("dragon", { parts: [{ d: "M10 10 L900 90" }] })).toBe(false);
    expect(await rememberGlyph("", {})).toBe(false);
    expect(await forgetGlyph("")).toBe(false);
  });

  it("ignores valid but unreviewed glyphs left by older releases", async () => {
    const glyph = {
      schemaVersion: "1.0.0", viewBox: "0 0 100 100",
      parts: [{ id: "body", d: "M10 10 L90 90", fill: "none", stroke: "#2f3e46" }],
      anchors: { top: [50, 10], ground: [50, 90], front: [90, 50] }
    };
    const rows = [
      { noun: "old draft", glyph, updatedAt: 1 },
      { noun: "approved draft", glyph, updatedAt: 2, approved: true }
    ];
    vi.stubGlobal("indexedDB", { open: () => {
      const database = {
        objectStoreNames: { contains: () => true }, close: () => undefined,
        transaction: () => ({ objectStore: () => ({ getAll: () => {
          const request = { result: rows, onsuccess: null as null | (() => void) };
          queueMicrotask(() => request.onsuccess?.());
          return request;
        } }) })
      };
      const request = { result: database, onsuccess: null as null | (() => void) };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    } });
    const loaded = await loadGlyphCache();
    expect([...loaded.keys()]).toEqual(["approved draft"]);
  });
});
