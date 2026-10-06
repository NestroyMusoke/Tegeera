import { z } from "zod";
import type { SceneState } from "../doodlescript/schema";
import { glyphKey, glyphSchema, previewNounKeys, type TegeeraGlyph } from "./glyph";
import { needsRuntimeGlyph } from "./runtimeEligibility";
import provisionalData from "./provisional-pack.json";

const entrySchema = z.object({
  noun: z.string().min(2).max(48),
  glyph: glyphSchema,
  provenance: z.object({
    source: z.literal("Quick, Draw! Dataset"), license: z.literal("CC BY 4.0"),
    sourceUrl: z.url(), drawingId: z.string().regex(/^\d{1,20}$/)
  }).strict(),
  screening: z.object({
    status: z.literal("provisional"), humanReviewed: z.literal(false),
    model: z.string().min(2), blindGuessAt64px: z.string().min(2)
  }).strict()
}).strict();

export const provisionalPackSchema = z.object({
  formatVersion: z.literal("1.0.0"), entries: z.array(entrySchema).max(2000)
}).strict().superRefine((pack, context) => {
  const nouns = new Set<string>();
  pack.entries.forEach((entry, index) => {
    const key = glyphKey(entry.noun);
    if (nouns.has(key)) context.addIssue({ code: "custom", path: ["entries", index, "noun"],
      message: `Duplicate provisional noun: ${entry.noun}` });
    nouns.add(key);
  });
});

export function createProvisionalCatalog(candidate: unknown): {
  preview: ReadonlyMap<string, TegeeraGlyph>;
  attributions: Array<{ noun: string; license: string; sourceUrl: string }>;
} {
  const pack = provisionalPackSchema.parse(candidate);
  return {
    preview: new Map(pack.entries.map((entry) => [glyphKey(entry.noun), entry.glyph])),
    attributions: pack.entries.map((entry) => ({ noun: entry.noun,
      license: entry.provenance.license, sourceUrl: entry.provenance.sourceUrl }))
  };
}

export const provisionalCatalog = createProvisionalCatalog(provisionalData);

export function provisionalPreviewFor(label: string,
  preview: ReadonlyMap<string, TegeeraGlyph> = provisionalCatalog.preview): TegeeraGlyph | undefined {
  for (const key of previewNounKeys(label)) {
    const exact = preview.get(key);
    if (exact) return exact;
    if (key.endsWith("ies") && preview.has(`${key.slice(0, -3)}y`)) return preview.get(`${key.slice(0, -3)}y`);
    if (key.endsWith("s") && !key.endsWith("ss") && preview.has(key.slice(0, -1))) return preview.get(key.slice(0, -1));
  }
  return undefined;
}

/** Mirrors the app's non-persistent preview tier for static visual probes. */
export function withProvisionalPreviews(scene: SceneState): SceneState {
  return { ...scene, entities: scene.entities.map((entity) => {
    if (!needsRuntimeGlyph(entity)) return entity;
    const glyph = provisionalPreviewFor(entity.label ?? "");
    return glyph ? { ...entity, glyph, glyphSource: "provisional" as const } : entity;
  }) };
}
