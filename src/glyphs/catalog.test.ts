import { describe, expect, it } from "vitest";
import { artworkAttributions, createGlyphCatalog, glyphPackSchema, offlineGlyphCatalog } from "./catalog";
import { resolveGlyph } from "./glyph";

const glyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [{ id: "body", d: "M10 10 L90 10 L90 90 L10 90 Z", fill: "#cad2c5", stroke: "#2f3e46" }],
  anchors: { top: [50, 10], ground: [50, 90], front: [90, 50] }
};

const entry = {
  noun: "teaching object", aliases: ["classroom object"], glyph,
  provenance: { source: "tegeera-original", author: "Tegeera", license: "MIT" },
  review: {
    reviewer: "Test reviewer", reviewedAt: "2026-09-21T00:00:00.000Z",
    readableAt64px: true, subjectRecognizableWithoutLabel: true,
    noUnwantedMeaning: true, tegeeraStyleConsistent: true
  }
};

describe("curated offline glyph catalog", () => {
  it("loads only validated, curated pack entries and never invents a noun lookup", () => {
    expect(offlineGlyphCatalog.pack.size).toBeGreaterThanOrEqual(0);
    expect(resolveGlyph({ noun: "a noun never approved for this pack", kind: "generic", ...offlineGlyphCatalog }).source).toBe("sticker");
  });

  it("validates provenance and indexes canonical nouns with aliases", () => {
    const catalog = createGlyphCatalog({ formatVersion: "1.0.0", entries: [entry] });
    expect(resolveGlyph({
      noun: "Classroom object", kind: "generic", ...catalog
    }).source).toBe("glyph-pack");
    expect(glyphPackSchema.safeParse({
      formatVersion: "1.0.0", entries: [{ ...entry, provenance: {
        source: "licensed-third-party", author: "Someone", license: "CC BY 4.0"
      } }]
    }).success).toBe(false);
    expect(artworkAttributions({ formatVersion: "1.0.0", entries: [{ ...entry, provenance: {
      source: "licensed-third-party", author: "Quick, Draw! contributor", license: "CC BY 4.0",
      sourceUrl: "https://storage.googleapis.com/quickdraw_dataset/full/simplified/house.ndjson#key_id=123"
    } }] })).toEqual([{ noun: "teaching object", author: "Quick, Draw! contributor", license: "CC BY 4.0",
      sourceUrl: "https://storage.googleapis.com/quickdraw_dataset/full/simplified/house.ndjson#key_id=123" }]);
  });

  it("rejects alias collisions and unsafe artwork before bundling", () => {
    expect(glyphPackSchema.safeParse({
      formatVersion: "1.0.0", entries: [entry, { ...entry, noun: "another object", aliases: ["classroom object"] }]
    }).success).toBe(false);
    expect(glyphPackSchema.safeParse({
      formatVersion: "1.0.0", entries: [{ ...entry, review: { ...entry.review, readableAt64px: false } }]
    }).success).toBe(false);
    expect(glyphPackSchema.safeParse({
      formatVersion: "1.0.0", entries: [{ ...entry, glyph: {
        ...glyph, parts: [{ ...glyph.parts[0], d: "M10 10 L900 90 Z" }]
      } }]
    }).success).toBe(false);
  });
});
