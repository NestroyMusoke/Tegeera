import { z } from "zod";
import {
  doodleScriptSchema,
  entityColorSchema,
  entityKindSchema,
  proceduralVisualSchema,
  type DoodleCommand,
  type DoodleScript,
  type SceneState
} from "../doodlescript/schema";
import { glyphSchema, resolveGlyph, type TegeeraGlyph } from "../glyphs/glyph";

export interface UniversalGlyphSources {
  pack?: ReadonlyMap<string, TegeeraGlyph>;
  emoji?: ReadonlyMap<string, TegeeraGlyph>;
  cache?: ReadonlyMap<string, TegeeraGlyph>;
  synonyms?: ReadonlyMap<string, string>;
}

export const universalSceneBlueprintSchema = z.object({
  blueprintVersion: z.literal("1.0"),
  mode: z.enum(["replace", "extend"]).default("replace"),
  confidence: z.number().min(0).max(1),
  objects: z.array(z.object({
    id: z.string().min(1).max(30),
    label: z.string().min(1).max(32),
    kind: entityKindSchema.default("generic"),
    color: entityColorSchema.optional(),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    glyph: glyphSchema.optional(),
    glyphSource: z.enum(["glyph-pack", "emoji", "cache", "generated"]).optional(),
    visual: proceduralVisualSchema.optional()
  })).min(1).max(8),
  connections: z.array(z.object({
    from: z.string().min(1).max(30),
    to: z.string().min(1).max(30),
    label: z.string().min(1).max(32)
  })).max(12).default([])
});

export type UniversalSceneBlueprint = z.infer<typeof universalSceneBlueprintSchema>;

const columns = [14, 38, 62, 86] as const;
const rows = [30, 68] as const;
const slots = rows.flatMap((y) => columns.map((x) => ({ x, y })));

const cleanId = (value: string, index: number) => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return cleaned || `object-${index + 1}`;
};

function assignedSlots(objects: UniversalSceneBlueprint["objects"], scene: SceneState, extend: boolean) {
  const remaining = new Set(slots.map((slot, index) => !extend || !scene.entities.some((entity) =>
    Math.abs(entity.x - slot.x) < 18 && Math.abs(entity.y - slot.y) < 22) ? index : -1).filter((index) => index >= 0));
  if (remaining.size < objects.length) throw new Error("The current scene has no safe room for that extension.");
  return objects.map((object) => {
    let chosen = -1;
    let distance = Number.POSITIVE_INFINITY;
    slots.forEach((slot, index) => {
      if (!remaining.has(index)) return;
      const candidate = Math.hypot(slot.x - object.x, slot.y - object.y);
      if (candidate < distance) { chosen = index; distance = candidate; }
    });
    remaining.delete(chosen);
    return slots[chosen];
  });
}

/** Converts untrusted high-level model output into deterministic, validator-safe DoodleScript. */
export function compileUniversalScene(
  candidate: unknown, scene: SceneState, sourceText: string, glyphSources: UniversalGlyphSources = {}
): DoodleScript {
  const existing = doodleScriptSchema.safeParse(candidate);
  if (existing.success) return existing.data;
  const hydrated = typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)
    ? {
      ...candidate,
      objects: Array.isArray((candidate as { objects?: unknown }).objects)
        ? (candidate as { objects: unknown[] }).objects.map((raw) => {
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
          const object = raw as Record<string, unknown>;
          if (typeof object.label !== "string") return raw;
          const kind = typeof object.kind === "string" ? object.kind : "generic";
          if (kind !== "generic") return { ...object, glyph: undefined, glyphSource: undefined };
          const resolved = resolveGlyph({
            noun: object.label, kind: "generic",
            ...glyphSources, generated: object.glyph as TegeeraGlyph | undefined
          });
          if (!resolved.glyph || resolved.source === "sticker" || resolved.source === "hero-rig") return raw;
          return { ...object, glyph: resolved.glyph, glyphSource: resolved.source };
        }) : (candidate as { objects?: unknown }).objects
    } : candidate;
  const parsedBlueprint = universalSceneBlueprintSchema.safeParse(hydrated);
  if (!parsedBlueprint.success) throw new Error("The model returned an incomplete visual blueprint. Try again or shorten the explanation.");
  const blueprint = parsedBlueprint.data;
  const positions = assignedSlots(blueprint.objects, scene, blueprint.mode === "extend");
  const sceneDensity = blueprint.objects.length + (blueprint.mode === "extend" ? scene.entities.length : 0);
  const visualScale = sceneDensity <= 2 ? 1.15 : sceneDensity <= 4 ? 0.92 : 0.72;
  const commands: DoodleCommand[] = [];
  if (blueprint.mode === "replace") commands.push({ action: "clear" });

  const idMap = new Map(blueprint.mode === "extend" ? scene.entities.map(({ id }) => [id, id] as const) : []);
  const used = new Set(blueprint.mode === "extend" ? scene.entities.map(({ id }) => id) : []);
  const createdIds: string[] = [];
  blueprint.objects.forEach((object, index) => {
    const base = cleanId(object.id, index);
    let id = base; let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id); idMap.set(object.id, id); createdIds.push(id);
    commands.push({ action: "create", entity: {
      id, kind: object.kind, label: object.label.trim(), ...positions[index], scale: visualScale,
      direction: "right", highlighted: false, color: object.color, glyph: object.glyph,
      glyphSource: object.glyphSource,
      ...(object.visual ? { visual: object.visual } : {})
    } });
  });
  blueprint.connections.forEach((connection, index) => {
    const sourceId = idMap.get(connection.from); const targetId = idMap.get(connection.to);
    if (!sourceId || !targetId || sourceId === targetId) return;
    let relationId = `universal-relation-${index + 1}`; let suffix = 2;
    while ((scene.relations ?? []).some(({ id }) => id === relationId)
      || commands.some((command) => command.action === "relate" && command.relation.id === relationId)) {
      relationId = `universal-relation-${index + 1}-${suffix++}`;
    }
    commands.push({ action: "relate", relation: {
      id: relationId, kind: "relatesTo", sourceIds: [sourceId], targetIds: [targetId],
      predicate: connection.label.trim()
    } });
  });
  return {
    schemaVersion: "2.27.0", sceneId: scene.sceneId, revision: scene.revision + 1,
    confidence: blueprint.confidence, sourceText, commands,
    context: { subjectIds: createdIds.slice(0, 1), objectIds: createdIds.slice(1) }
  };
}
