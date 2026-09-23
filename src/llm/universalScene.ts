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
import { glyphKey, glyphSchema, resolveGlyph, type TegeeraGlyph } from "../glyphs/glyph";

export interface UniversalGlyphSources {
  pack?: ReadonlyMap<string, TegeeraGlyph>;
  emoji?: ReadonlyMap<string, TegeeraGlyph>;
  cache?: ReadonlyMap<string, TegeeraGlyph>;
  synonyms?: ReadonlyMap<string, string>;
}

// Small, composable visual grammar shared with the hosted protocol. No lesson nouns
// or scenario names appear here; unsupported relationships stay generic.
export const universalConnectionLabels = {
  partOf: "part of",
  flowsInto: "flows into",
  illuminates: "illuminates",
  before: "before",
  causes: "causes"
} as const;
type TypedConnectionKind = keyof typeof universalConnectionLabels;

const universalConnectionSchema = z.object({
  from: z.string().min(1).max(30),
  to: z.string().min(1).max(30),
  label: z.string().min(1).max(32),
  kind: z.enum(["relatesTo", "partOf", "flowsInto", "illuminates", "before", "causes"]).optional()
}).superRefine((connection, context) => {
  if (connection.kind && connection.kind !== "relatesTo"
    && connection.label.trim().toLowerCase() !== universalConnectionLabels[connection.kind as TypedConnectionKind]) {
    context.addIssue({ code: "custom", path: ["label"], message: "A typed visual relationship needs its exact registered label." });
  }
});

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
  connections: z.array(universalConnectionSchema).max(12).default([])
});

export type UniversalSceneBlueprint = z.infer<typeof universalSceneBlueprintSchema>;

const columns = [14, 38, 62, 86] as const;
const rows = [30, 68] as const;
const slots = rows.flatMap((y) => columns.map((x) => ({ x, y })));

const cleanId = (value: string, index: number) => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return cleaned || `object-${index + 1}`;
};

function assignedSlots(objects: UniversalSceneBlueprint["objects"], connections: UniversalSceneBlueprint["connections"], scene: SceneState, extend: boolean) {
  const available = slots.filter((slot) => !extend || !scene.entities.some((entity) =>
    Math.abs(entity.x - slot.x) < 18 && Math.abs(entity.y - slot.y) < 22));
  if (available.length < objects.length) throw new Error("The current scene has no safe room for that extension.");
  const distances = objects.map((object) => available.map((slot) =>
    ((slot.x - object.x) ** 2 + (slot.y - object.y) ** 2) / 100));
  const indexById = new Map(objects.map((object, index) => [object.id, index] as const));
  const current: number[] = [];
  let best: number[] = [];
  let bestCost = Number.POSITIVE_INFINITY;
  const place = (index: number, used: number, cost: number) => {
    if (cost >= bestCost) return;
    if (index === objects.length) { best = [...current]; bestCost = cost; return; }
    for (let slotIndex = 0; slotIndex < available.length; slotIndex += 1) {
      if (used & (1 << slotIndex)) continue;
      const slot = available[slotIndex];
      let nextCost = cost + distances[index][slotIndex];
      for (let previous = 0; previous < index; previous += 1) {
        const earlier = objects[previous];
        const earlierSlot = available[current[previous]];
        const xDifference = objects[index].x - earlier.x;
        const yDifference = objects[index].y - earlier.y;
        // A model-provided spatial relationship should survive slot quantization.
        if (Math.abs(xDifference) >= 8 && Math.sign(slot.x - earlierSlot.x) !== Math.sign(xDifference)) nextCost += 250;
        if (Math.abs(yDifference) >= 8 && Math.sign(slot.y - earlierSlot.y) !== Math.sign(yDifference)) nextCost += 250;
      }
      for (const connection of connections) {
        if (!connection.kind || connection.kind === "relatesTo") continue;
        const from = indexById.get(connection.from); const to = indexById.get(connection.to);
        if (from === undefined || to === undefined || Math.max(from, to) !== index) continue;
        const fromSlot = from === index ? slot : available[current[from]];
        const toSlot = to === index ? slot : available[current[to]];
        if (connection.kind === "before" || connection.kind === "causes") {
          if (fromSlot.x >= toSlot.x || (toSlot.x - fromSlot.x) < 24) nextCost += 500;
        } else if (Math.hypot((toSlot.x - fromSlot.x) * 10, (toSlot.y - fromSlot.y) * 6.2) < 140) {
          nextCost += 500;
        }
      }
      current[index] = slotIndex;
      place(index + 1, used | (1 << slotIndex), nextCost);
    }
  };
  place(0, 0, 0);
  return best.map((index) => available[index]);
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
  const existingIds = new Set(blueprint.mode === "extend" ? scene.entities.map(({ id }) => id) : []);
  const newIds = new Set<string>();
  for (const object of blueprint.objects) {
    if (newIds.has(object.id) || existingIds.has(object.id)) {
      throw new Error("The visual plan used an object ID more than once. Please try again.");
    }
    newIds.add(object.id);
  }
  const positions = assignedSlots(blueprint.objects, blueprint.connections, scene, blueprint.mode === "extend");
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
  const aliases = new Map<string, Set<string>>();
  const addAlias = (label: string | undefined, id: string) => {
    const key = glyphKey(label ?? "");
    if (!key) return;
    const matches = aliases.get(key) ?? new Set<string>();
    matches.add(id);
    aliases.set(key, matches);
  };
  if (blueprint.mode === "extend") scene.entities.forEach(({ id, label }) => addAlias(label, id));
  blueprint.objects.forEach((object) => addAlias(object.label, idMap.get(object.id)!));
  const resolveReference = (reference: string) => {
    const exact = idMap.get(reference);
    if (exact) return exact;
    const matches = aliases.get(glyphKey(reference));
    return matches?.size === 1 ? [...matches][0] : undefined;
  };
  blueprint.connections.forEach((connection, index) => {
    const sourceId = resolveReference(connection.from); const targetId = resolveReference(connection.to);
    if (!sourceId || !targetId || sourceId === targetId) {
      throw new Error("A visual relationship referred to a missing or ambiguous object. Please try again.");
    }
    let relationId = `universal-relation-${index + 1}`; let suffix = 2;
    while ((scene.relations ?? []).some(({ id }) => id === relationId)
      || commands.some((command) => command.action === "relate" && command.relation.id === relationId)) {
      relationId = `universal-relation-${index + 1}-${suffix++}`;
    }
    commands.push({ action: "relate", relation: {
      id: relationId, kind: connection.kind ?? "relatesTo", sourceIds: [sourceId], targetIds: [targetId],
      predicate: connection.label.trim()
    } });
  });
  return {
    schemaVersion: "2.27.0", sceneId: scene.sceneId, revision: scene.revision + 1,
    confidence: blueprint.confidence, sourceText, commands,
    context: { subjectIds: createdIds.slice(0, 1), objectIds: createdIds.slice(1) }
  };
}
