import { z } from "zod";
import type { EntityKind } from "../doodlescript/schema";

export const TEGEERA_GLYPH_PALETTE = [
  "#2f3e46", "#52796f", "#84a98c", "#f4a261", "#e9c46a", "#cad2c5"
] as const;

const commandArity = { M: 2, L: 2, C: 6, Q: 4, Z: 0 } as const;

/** Strictly validates a tiny absolute-path language; no SVG/XML is ever parsed. */
export function isSafeGlyphPath(value: string): boolean {
  if (!value || value.length > 800 || !/^[MLCQZ0-9.,\s-]+$/.test(value)) return false;
  const tokens = value.match(/[MLCQZ]|-?(?:\d+(?:\.\d+)?|\.\d+)/g);
  if (!tokens || tokens.join("") !== value.replace(/[\s,]/g, "") || tokens[0] !== "M") return false;
  let index = 0;
  while (index < tokens.length) {
    const command = tokens[index++] as keyof typeof commandArity;
    if (!(command in commandArity)) return false;
    const arity = commandArity[command];
    for (let count = 0; count < arity; count += 1) {
      const token = tokens[index++];
      if (token === undefined || /^[MLCQZ]$/.test(token)) return false;
      const number = Number(token);
      if (!Number.isFinite(number) || number < 0 || number > 100) return false;
    }
    if (index < tokens.length && !/^[MLCQZ]$/.test(tokens[index])) return false;
  }
  return true;
}

const coordinate = z.number().min(0).max(100);
const anchor = z.tuple([coordinate, coordinate]);
export const glyphPartSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,29}$/),
  d: z.string().max(800).refine(isSafeGlyphPath, "Unsafe or malformed glyph path"),
  fill: z.enum(["none", ...TEGEERA_GLYPH_PALETTE]),
  stroke: z.enum(TEGEERA_GLYPH_PALETTE)
}).strict();

export const glyphSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  viewBox: z.literal("0 0 100 100"),
  parts: z.array(glyphPartSchema).min(1).max(12),
  anchors: z.object({ top: anchor, ground: anchor, front: anchor }).strict()
}).strict().superRefine((glyph, context) => {
  const ids = new Set<string>();
  glyph.parts.forEach((part, index) => {
    if (ids.has(part.id)) context.addIssue({
      code: "custom",
      path: ["parts", index, "id"],
      message: `Duplicate glyph part id: ${part.id}`
    });
    ids.add(part.id);
  });
});

export type TegeeraGlyph = z.infer<typeof glyphSchema>;
export type GlyphSource = "hero-rig" | "glyph-pack" | "emoji" | "cache" | "generated" | "sticker";

export interface GlyphResolution {
  source: GlyphSource;
  glyph?: TegeeraGlyph;
}

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const validFrom = (source: GlyphSource, candidate?: unknown): GlyphResolution | undefined => {
  if (!candidate) return undefined;
  const parsed = glyphSchema.safeParse(candidate);
  return parsed.success ? { source, glyph: parsed.data } : undefined;
};

function lookup(
  noun: string,
  source: GlyphSource,
  collection?: ReadonlyMap<string, TegeeraGlyph>,
  synonyms?: ReadonlyMap<string, string>
) {
  const canonical = synonyms?.get(noun) ?? noun;
  return validFrom(source, collection?.get(canonical));
}

/** Source-neutral resolver. Packs and IndexedDB snapshots plug in without renderer changes. */
export function resolveGlyph(options: {
  noun: string;
  kind: EntityKind;
  pack?: ReadonlyMap<string, TegeeraGlyph>;
  emoji?: ReadonlyMap<string, TegeeraGlyph>;
  cache?: ReadonlyMap<string, TegeeraGlyph>;
  generated?: TegeeraGlyph;
  synonyms?: ReadonlyMap<string, string>;
}): GlyphResolution {
  if (options.kind !== "generic") return { source: "hero-rig" };
  const noun = key(options.noun);
  const packed = lookup(noun, "glyph-pack", options.pack, options.synonyms);
  if (packed) return packed;
  const emoji = lookup(noun, "emoji", options.emoji, options.synonyms);
  if (emoji) return emoji;
  const cached = lookup(noun, "cache", options.cache, options.synonyms);
  if (cached) return cached;
  const generated = validFrom("generated", options.generated);
  if (generated) return generated;
  return { source: "sticker" };
}

export function glyphAnchor(entity: { x: number; y: number; scale: number; glyph?: TegeeraGlyph }, name: keyof TegeeraGlyph["anchors"]) {
  const anchorPoint = entity.glyph?.anchors[name] ?? [50, 50];
  return { x: entity.x * 10 + (anchorPoint[0] - 50) * entity.scale, y: entity.y * 6.2 + (anchorPoint[1] - 50) * entity.scale };
}
