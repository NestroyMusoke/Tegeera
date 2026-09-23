import { z } from "zod";
import { glyphKey, glyphSchema, type TegeeraGlyph } from "./glyph";
import offlinePackData from "./offline-pack.json";

const entrySchema = z.object({
  noun: z.string().min(2).max(48),
  aliases: z.array(z.string().min(2).max(48)).max(12).default([]),
  glyph: glyphSchema,
  provenance: z.object({
    source: z.enum(["tegeera-original", "model-assisted", "licensed-third-party"]),
    author: z.string().min(1).max(100),
    license: z.string().min(1).max(80),
    sourceUrl: z.url().optional()
  }).strict(),
  review: z.object({
    reviewer: z.string().min(1).max(100),
    reviewedAt: z.iso.datetime(),
    readableAt64px: z.literal(true),
    subjectRecognizableWithoutLabel: z.literal(true),
    noUnwantedMeaning: z.literal(true),
    tegeeraStyleConsistent: z.literal(true)
  }).strict()
}).strict();

export const glyphPackSchema = z.object({
  formatVersion: z.literal("1.0.0"),
  entries: z.array(entrySchema).max(2000)
}).strict().superRefine((pack, context) => {
  const used = new Map<string, number>();
  pack.entries.forEach((entry, index) => {
    for (const name of [entry.noun, ...entry.aliases]) {
      const normalized = glyphKey(name);
      const previous = used.get(normalized);
      if (!normalized || previous !== undefined) context.addIssue({
        code: "custom", path: ["entries", index, "noun"],
        message: previous !== undefined ? `Duplicate glyph noun/alias: ${name}` : "Empty normalized glyph noun"
      });
      else used.set(normalized, index);
    }
    if (entry.provenance.source === "licensed-third-party" && !entry.provenance.sourceUrl) {
      context.addIssue({
        code: "custom", path: ["entries", index, "provenance", "sourceUrl"],
        message: "Third-party glyphs require a source URL."
      });
    }
  });
});

export type GlyphPack = z.infer<typeof glyphPackSchema>;

export function artworkAttributions(candidate: unknown): Array<{ noun: string; author: string; license: string; sourceUrl: string }> {
  return glyphPackSchema.parse(candidate).entries.flatMap((entry) => entry.provenance.sourceUrl
    ? [{ noun: entry.noun, author: entry.provenance.author, license: entry.provenance.license, sourceUrl: entry.provenance.sourceUrl }]
    : []);
}

export function createGlyphCatalog(candidate: unknown): {
  pack: ReadonlyMap<string, TegeeraGlyph>;
  synonyms: ReadonlyMap<string, string>;
} {
  const manifest = glyphPackSchema.parse(candidate);
  const pack = new Map<string, TegeeraGlyph>();
  const synonyms = new Map<string, string>();
  for (const entry of manifest.entries) {
    const canonical = glyphKey(entry.noun);
    pack.set(canonical, entry.glyph);
    for (const alias of entry.aliases) synonyms.set(glyphKey(alias), canonical);
  }
  return { pack, synonyms };
}

export const offlineGlyphCatalog = createGlyphCatalog(offlinePackData);
export const offlineArtworkAttributions = artworkAttributions(offlinePackData);
