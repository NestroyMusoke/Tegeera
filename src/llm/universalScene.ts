import { z } from "zod";
import {
  entityColorSchema,
  entityKindSchema,
  proceduralVisualSchema,
  type DoodleCommand,
  type DoodleScript,
  type SceneEntity,
  type SceneState
} from "../doodlescript/schema";
import { glyphKey, glyphSchema, previewNounKeys, resolveGlyph, type TegeeraGlyph } from "../glyphs/glyph";
import { conceptForAlias } from "../doodlescript/conceptRegistry";
import { planPartWholeFlow } from "../doodlescript/partWholeFlow";
import { applyDoodleScript } from "../doodlescript/scene";
import { planCirculationLoop } from "../doodlescript/circulationLoop";
import { planForceDiagram } from "../doodlescript/forceDiagram";
import { planLabelledContainer } from "../doodlescript/labelledContainer";
import { planCallReturnFlow } from "../doodlescript/callReturnFlow";
import { planChangingSpeedMotion } from "../doodlescript/changingSpeedMotion";
import { universalSceneEdges } from "../doodlescript/universalEdge";
import { spatialOrder } from "../doodlescript/spatialOrder";
import { completeExplicitPassages, sourceConstraintIssue } from "../../shared/sourceConstraints.mjs";
import { normalizeOptionalTypedKinds, normalizeOrdinaryCarry, normalizeStandaloneReplacement } from "../../shared/normalizeBlueprint.mjs";

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
  causes: "causes",
  contains: "contains",
  calls: "calls",
  returnsControlTo: "returnsTo",
  risesTo: "risesTo",
  fallsFrom: "fallsFrom",
  accelerates: "accelerates",
  pumpsTo: "pumps to",
  returnsTo: "returns to",
  carries: "carries",
  appliedTo: "applied to",
  opposes: "opposes",
  contacts: "contacts"
} as const;
type TypedConnectionKind = keyof typeof universalConnectionLabels;

const universalConnectionSchema = z.object({
  from: z.string().min(1).max(30),
  to: z.string().min(1).max(30),
  label: z.string().min(1).max(32),
  kind: z.enum(["relatesTo", ...Object.keys(universalConnectionLabels) as TypedConnectionKind[]]).optional(),
  via: z.string().min(1).max(30).optional()
}).superRefine((connection, context) => {
  if (connection.kind && connection.kind !== "relatesTo"
    && connection.label.trim().toLowerCase() !== universalConnectionLabels[connection.kind as TypedConnectionKind].toLowerCase()) {
    context.addIssue({ code: "custom", path: ["label"], message: "A typed visual relationship needs its exact registered label." });
  }
  if (Boolean(connection.via) !== ["pumpsTo", "returnsTo"].includes(connection.kind ?? "")) {
    context.addIssue({ code: "custom", path: ["via"], message: "Only transport-loop arrows need an explicit payload ID." });
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

type VisualMotif =
  | { family: "circulation-loop"; source: string; destination: string; payload: string; enrichment: string }
  | { family: "force-diagram"; body: string; surface: string; appliedForce: string; opposingForce: string; direction: "left" | "right" }
  | { family: "labelled-container"; container: string; content: string }
  | { family: "call-return-flow"; caller: string; fn: string; callSite: string }
  | { family: "changing-speed-motion"; moving: string; apex: string; force: string };

const specialistKinds = new Set(["pumpsTo", "returnsTo", "carries", "appliedTo", "opposes", "contacts"]);

/** A diagram is selected by a complete, consistent graph—not a lesson noun. */
function visualMotif(blueprint: UniversalSceneBlueprint): VisualMotif | null {
  const edges = blueprint.connections;
  const one = (kind: string) => edges.filter((edge) => edge.kind === kind);
  if (one("contains").length) {
    const otherMotifs = ["calls", "returnsControlTo", "risesTo", "fallsFrom", "accelerates", ...specialistKinds];
    if (blueprint.mode !== "replace" || one("contains").length !== 1
      || edges.some((edge) => otherMotifs.includes(edge.kind ?? ""))) {
      throw new Error("Containment needs one distinct holder/content subgraph without a mixed specialist layout.");
    }
    if (blueprint.objects.some((object) => !edges.some((edge) => edge.from === object.id || edge.to === object.id))) {
      throw new Error("Containment needs every extra object connected to the explanation.");
    }
    if (blueprint.objects.length > 3 || edges.length > 2) return null;
    return { family: "labelled-container", container: one("contains")[0].from, content: one("contains")[0].to };
  }
  if (edges.some((edge) => edge.kind === "calls" || edge.kind === "returnsControlTo")) {
    const calls = one("calls")[0]; const returns = one("returnsControlTo")[0];
    if (blueprint.mode !== "replace" || blueprint.objects.length !== 3 || edges.length !== 2
      || one("calls").length !== 1 || one("returnsControlTo").length !== 1
      || calls.to !== returns.from || new Set([calls.from, calls.to, returns.to]).size !== 3) {
      throw new Error("Call-return needs a distinct caller, function, and return point.");
    }
    return { family: "call-return-flow", caller: calls.from, fn: calls.to, callSite: returns.to };
  }
  if (edges.some((edge) => ["risesTo", "fallsFrom", "accelerates"].includes(edge.kind ?? ""))) {
    const rises = one("risesTo")[0]; const falls = one("fallsFrom")[0]; const force = one("accelerates")[0];
    if (blueprint.mode !== "replace" || blueprint.objects.length !== 3 || edges.length !== 3
      || ["risesTo", "fallsFrom", "accelerates"].some((kind) => one(kind).length !== 1)
      || rises.from !== falls.from || rises.to !== falls.to || force.to !== rises.from
      || new Set([rises.from, rises.to, force.from]).size !== 3) {
      throw new Error("Changing speed needs one moving object, apex, force, and a complete motion graph.");
    }
    return { family: "changing-speed-motion", moving: rises.from, apex: rises.to, force: force.from };
  }
  if (!edges.some((edge) => specialistKinds.has(edge.kind ?? ""))) return null;
  if (blueprint.mode !== "replace" || blueprint.objects.length !== 4 || edges.length !== 3) {
    throw new Error("A specialist diagram needs four distinct roles and its complete three-link topology.");
  }
  const transport = ["pumpsTo", "returnsTo", "carries"];
  if (transport.some((kind) => one(kind).length)) {
    if (transport.some((kind) => one(kind).length !== 1)) throw new Error("A transport loop needs outbound, return, and enrichment links.");
    const outbound = one("pumpsTo")[0]; const returning = one("returnsTo")[0]; const carry = one("carries")[0];
    const roles = [outbound.from, outbound.to, outbound.via, carry.to];
    if (!outbound.via || returning.via !== outbound.via || returning.from !== outbound.to
      || returning.to !== outbound.from || carry.from !== outbound.via
      || new Set(roles).size !== 4 || roles.some((id) => !blueprint.objects.some((object) => object.id === id))) {
      throw new Error("The transport-loop roles or return direction do not agree.");
    }
    return { family: "circulation-loop", source: outbound.from, destination: outbound.to,
      payload: outbound.via, enrichment: carry.to };
  }
  if (["appliedTo", "opposes", "contacts"].some((kind) => one(kind).length !== 1)) {
    throw new Error("An opposing-force diagram needs applied, opposing, and contact links.");
  }
  const applied = one("appliedTo")[0]; const opposed = one("opposes")[0]; const contact = one("contacts")[0];
  const roles = [applied.to, contact.to, applied.from, opposed.from];
  if (opposed.to !== applied.from || contact.from !== applied.to || new Set(roles).size !== 4
    || roles.some((id) => !blueprint.objects.some((object) => object.id === id))) {
    throw new Error("The opposing-force roles do not connect to the same body and applied force.");
  }
  const force = blueprint.objects.find((object) => object.id === applied.from)!;
  const body = blueprint.objects.find((object) => object.id === applied.to)!;
  return { family: "force-diagram", body: applied.to, surface: contact.to,
    appliedForce: applied.from, opposingForce: opposed.from,
    direction: force.x > body.x ? "left" : "right" };
}

const colorWords = new Set<string>(entityColorSchema.options);
const negatedClaim = /\b(?:not|never|no|without|neither|nor|cannot|can't|don't|doesn't|didn't|isn't|aren't|wasn't|weren't|won't|wouldn't|couldn't|shouldn't|hasn't|haven't|hadn't)\b/i;

/** High-precision claims the current positive-only scene grammar must not silently change. */
function assertGroundedClaims(sourceText: string, blueprint: UniversalSceneBlueprint) {
  const normalized = sourceText.toLowerCase().replace(/[’‘]/g, "'");
  if (negatedClaim.test(normalized)) {
    throw new Error("This explanation contains a negated claim that the drawing grammar cannot represent safely. Please rephrase the positive scene to show.");
  }
  const words = normalized.match(/[a-z]+/g) ?? [];
  const mentioned = new Set(words.filter((word) => colorWords.has(word)));
  for (const color of mentioned) {
    if (!blueprint.objects.some((object) => object.color === color)) {
      throw new Error(`The visual plan omitted the stated ${color} colour. The previous drawing is safe.`);
    }
  }
  for (let index = 0; index < words.length - 1; index += 1) {
    const color = words[index];
    if (!colorWords.has(color)) continue;
    const noun = words[index + 1].replace(/s$/, "");
    const matching = blueprint.objects.filter((object) => {
      const labelWords = (object.label.toLowerCase().match(/[a-z]+/g) ?? []).map((word) => word.replace(/s$/, ""));
      return labelWords.includes(noun) || object.kind === noun;
    });
    if (matching.length && !matching.some((object) => object.color === color)) {
      throw new Error(`The visual plan assigned the wrong colour to the stated ${words[index + 1]}. The previous drawing is safe.`);
    }
  }
}

const columns = [14, 38, 62, 86] as const;
const rows = [30, 68] as const;
const slots = rows.flatMap((y) => columns.map((x) => ({ x, y })));

const cleanId = (value: string, index: number) => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return cleaned || `object-${index + 1}`;
};

function assignedSlots(objects: UniversalSceneBlueprint["objects"], connections: UniversalSceneBlueprint["connections"], scene: SceneState, extend: boolean,
  routeQuality?: (positions: readonly { x: number; y: number }[]) => { cost: number; detours: number } | null,
  orderable?: (positions: readonly { x: number; y: number }[]) => boolean) {
  // An extension may need to add something above an existing top-row object.
  // The shallow third row is reserved for extensions so ordinary dense scenes
  // keep the proven two-row overview grid.
  // A vertical three-step explanation cannot fit into the ordinary two-row
  // overview without reversing or collapsing a stated above/below order.
  // Give only small, explicitly stacked scenes a third row; dense scenes keep
  // the established two-row grid and its readable glyph size.
  const verticalStack = !extend && objects.length >= 3 && objects.length <= 4
    && Math.max(...objects.map((object) => object.x)) - Math.min(...objects.map((object) => object.x)) <= 24
    && new Set(objects.map((object) => Math.round(object.y / 8))).size >= 3;
  const candidates = extend ? [...columns.map((x) => ({ x, y: 15 })), ...slots]
    : verticalStack ? [20, 50, 80].flatMap((y) => columns.map((x) => ({ x, y }))) : slots;
  const available = candidates.filter((slot) => !extend || !scene.entities.some((entity) =>
    Math.abs(entity.x - slot.x) < 18 && Math.abs(entity.y - slot.y) < 22));
  if (available.length < objects.length) throw new Error("The current scene has no safe room for that extension.");
  const distances = objects.map((object) => available.map((slot) =>
    ((slot.x - object.x) ** 2 + (slot.y - object.y) ** 2) / 100));
  const indexById = new Map(objects.map((object, index) => [object.id, index] as const));
  const repairingOrder = connections.some((connection) => {
    const order = spatialOrder(connection.label);
    const from = objects.find((object) => object.id === connection.from);
    const to = objects.find((object) => object.id === connection.to);
    return order && from && to && Math.sign(from[order.axis] - to[order.axis]) !== order.sign;
  });
  const existingPosition = (reference: string) => {
    const byId = scene.entities.find((entity) => entity.id === reference);
    if (byId) return byId;
    const matches = scene.entities.filter((entity) => glyphKey(entity.label ?? "") === glyphKey(reference));
    return matches.length === 1 ? matches[0] : undefined;
  };
  const collect = (candidateLimit: number, preserveModelOrder = true) => {
    const current: number[] = [];
    const choices: { assignment: number[]; cost: number }[] = [];
    let worstCost = Number.POSITIVE_INFINITY;
    const place = (index: number, used: number, cost: number) => {
    if (cost >= worstCost) return;
    if (index === objects.length) {
      if (preserveModelOrder && orderable && !orderable(current.map((slotIndex) => available[slotIndex]))) return;
      choices.push({ assignment: [...current], cost });
      choices.sort((left, right) => left.cost - right.cost);
      if (choices.length > candidateLimit) choices.pop();
      if (choices.length === candidateLimit) worstCost = choices.at(-1)!.cost;
      return;
    }
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
        const from = indexById.get(connection.from); const to = indexById.get(connection.to);
        if ((from === undefined && to === undefined) || Math.max(from ?? -1, to ?? -1) !== index) continue;
        const fromSlot = from === undefined ? existingPosition(connection.from) : from === index ? slot : available[current[from]];
        const toSlot = to === undefined ? existingPosition(connection.to) : to === index ? slot : available[current[to]];
        if (!fromSlot || !toSlot) continue;
        const order = spatialOrder(connection.label);
        if (order && Math.sign(fromSlot[order.axis] - toSlot[order.axis]) !== order.sign) {
          nextCost = Number.POSITIVE_INFINITY;
          break;
        }
        if (!connection.kind || connection.kind === "relatesTo") continue;
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
    return choices;
  };
  const ordered = collect(1)[0];
  // Suggested coordinates may overlap or ask for more levels than the canvas
  // has. If no assignment exists, use their soft cost instead. Every explicit
  // spatial predicate is still enforced inside place(), including contradictions.
  const preserveModelOrder = Boolean(ordered);
  const first = ordered ?? collect(1, false)[0];
  const firstQuality = first && routeQuality?.(first.assignment.map((index) => available[index]));
  if (first && (!routeQuality || (firstQuality && (!repairingOrder || firstQuality.detours === 0)))) {
    return first.assignment.map((index) => available[index]);
  }
  // A routable plan can still send a short relationship around the entire
  // board. Compare a bounded shortlist using the actual renderer geometry.
  // Explicit spatial constraints remain hard; model coordinates break ties.
  let best: { assignment: number[]; cost: number } | undefined;
  if (routeQuality && first) {
    for (const choice of collect(128, preserveModelOrder)) {
      const quality = routeQuality(choice.assignment.map((index) => available[index]));
      if (!quality) continue;
      if (!repairingOrder) return choice.assignment.map((index) => available[index]);
      const cost = quality.cost + choice.cost * 0.1;
      if (!best || cost < best.cost) best = { assignment: choice.assignment, cost };
    }
  }
  if (!best) throw new Error("The spatial relationships cannot fit; an arrow or caption cannot be placed clearly on this canvas.");
  return best.assignment.map((index) => available[index]);
}

/** Converts untrusted high-level model output into deterministic, validator-safe DoodleScript. */
export function compileUniversalScene(
  candidate: unknown, scene: SceneState, sourceText: string, glyphSources: UniversalGlyphSources = {}
): DoodleScript {
  candidate = completeExplicitPassages(sourceText, normalizeStandaloneReplacement(sourceText,
    normalizeOrdinaryCarry(normalizeOptionalTypedKinds(candidate))));
  const hydrated = typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)
    ? {
      ...candidate,
      objects: Array.isArray((candidate as { objects?: unknown }).objects)
        ? (candidate as { objects: unknown[] }).objects.map((raw) => {
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
          const object = raw as Record<string, unknown>;
          if (typeof object.label !== "string") return raw;
          const declaredKind = typeof object.kind === "string" ? object.kind : "generic";
          // A broad model classification is not evidence for a specific native
          // silhouette. Require the existing noun registry for concrete rigs;
          // otherwise allow the noun's own glyph/preview/sticker to represent it.
          const concreteRig = ["car", "book", "desk", "tree", "building"].includes(declaredKind);
          const kind = concreteRig && !previewNounKeys(object.label).some((key) => conceptForAlias(key)?.kind === declaredKind)
            ? "generic" : declaredKind;
          if (kind !== "generic") return { ...object, glyph: undefined, glyphSource: undefined };
          const resolved = resolveGlyph({
            noun: object.label, kind: "generic",
            ...glyphSources, generated: object.glyph as TegeeraGlyph | undefined
          });
          if (!resolved.glyph || resolved.source === "sticker" || resolved.source === "hero-rig") return { ...object, kind };
          return { ...object, kind, glyph: resolved.glyph, glyphSource: resolved.source };
        }) : (candidate as { objects?: unknown }).objects
    } : candidate;
  const parsedBlueprint = universalSceneBlueprintSchema.safeParse(hydrated);
  if (!parsedBlueprint.success) throw new Error("The model returned an incomplete visual blueprint. Try again or shorten the explanation.");
  const blueprint = parsedBlueprint.data;
  assertGroundedClaims(sourceText, blueprint);
  const sourceIssue = sourceConstraintIssue(sourceText, blueprint);
  if (sourceIssue) throw new Error(`The visual plan omitted a stated relationship: ${sourceIssue}`);
  const existingIds = new Set(blueprint.mode === "extend" ? scene.entities.map(({ id }) => id) : []);
  const newIds = new Set<string>();
  for (const object of blueprint.objects) {
    if (newIds.has(object.id) || existingIds.has(object.id)) {
      throw new Error("The visual plan used an object ID more than once. Please try again.");
    }
    newIds.add(object.id);
  }
  const earlyObjects = [...(blueprint.mode === "extend" ? scene.entities : []), ...blueprint.objects];
  const resolveEarly = (reference: string) => earlyObjects.find(({ id }) => id === reference)?.id
    ?? (() => {
      const matches = earlyObjects.filter(({ label }) => glyphKey(label ?? "") === glyphKey(reference));
      return matches.length === 1 ? matches[0].id : undefined;
    })();
  for (const connection of blueprint.connections) {
    const from = resolveEarly(connection.from); const to = resolveEarly(connection.to);
    if (!from || !to || from === to) {
      throw new Error("A visual relationship referred to a missing or ambiguous object. Please try again.");
    }
  }
  const sceneDensity = blueprint.objects.length + (blueprint.mode === "extend" ? scene.entities.length : 0);
  // Eight distinct positions already have 240 scene units between columns;
  // shrinking every glyph further made dense phone overviews unreadable.
  const visualScale = sceneDensity <= 2 ? 1.15 : sceneDensity <= 4 ? 0.92 : 1;
  const mixedContainment = (blueprint.objects.length > 3 || blueprint.connections.length > 2)
    && blueprint.connections.some((edge) => edge.kind === "contains");
  const isGenericLink = (edge: UniversalSceneBlueprint["connections"][number]) =>
    !edge.kind || edge.kind === "relatesTo" || (mixedContainment && edge.kind === "contains");
  const hasGenericLinks = blueprint.mode === "replace" && blueprint.connections.some(isGenericLink);
  // Four canvas columns can preserve a small diagram's model-provided order.
  // Denser graphs must wrap; explicit spatial predicates remain hard constraints.
  const orderable = hasGenericLinks && blueprint.objects.length <= columns.length
    ? (positions: readonly { x: number; y: number }[]) => {
      for (let first = 0; first < blueprint.objects.length; first += 1) {
        for (let second = first + 1; second < blueprint.objects.length; second += 1) {
          for (const axis of ["x", "y"] as const) {
            const original = blueprint.objects[first][axis] - blueprint.objects[second][axis];
            const explicitlyOrdered = blueprint.connections.some((edge) => spatialOrder(edge.label)?.axis === axis
              && [edge.from, edge.to].some((id) => id === blueprint.objects[first].id || id === blueprint.objects[second].id));
            if (explicitlyOrdered) continue;
            if (Math.abs(original) < 8) {
              if (positions[first][axis] !== positions[second][axis]) return false;
              continue;
            }
            if (Math.sign(positions[first][axis] - positions[second][axis]) !== Math.sign(original)) return false;
          }
        }
      }
      return true;
    } : undefined;
  const routeQuality = hasGenericLinks
    ? (positions: readonly { x: number; y: number }[]) => {
      const stagedEntities: SceneEntity[] = blueprint.objects.map((object, index) => ({
        id: object.id, label: object.label, kind: object.kind, ...positions[index], scale: visualScale,
        direction: "right", highlighted: false
      }));
      const stagedRelations = blueprint.connections.filter(isGenericLink)
        .map((edge, index) => ({ id: `staged-${index}`, kind: "relatesTo" as const,
          sourceIds: [edge.from], targetIds: [edge.to], predicate: edge.label }));
      if (stagedRelations.some((edge) => edge.sourceIds[0] === edge.targetIds[0]
        || !stagedEntities.some(({ id }) => id === edge.sourceIds[0])
        || !stagedEntities.some(({ id }) => id === edge.targetIds[0]))) return { cost: 0, detours: 0 };
      let cost = 0; let detours = 0;
      for (const geometry of universalSceneEdges(stagedRelations, stagedEntities).values()) {
        if (!geometry) return null;
        if (geometry.route !== "direct") detours += 1;
        cost += Math.max(0, geometry.points.length - 2) * 36;
        for (let index = 1; index < geometry.points.length; index += 1) {
          const a = geometry.points[index - 1]; const b = geometry.points[index];
          cost += Math.hypot(b.x - a.x, b.y - a.y);
        }
      }
      return { cost, detours };
    } : undefined;
  const positions = assignedSlots(blueprint.objects, blueprint.connections, scene, blueprint.mode === "extend", routeQuality, orderable);
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
    const viaId = connection.via ? resolveReference(connection.via) : undefined;
    if (!sourceId || !targetId || sourceId === targetId) {
      throw new Error("A visual relationship referred to a missing or ambiguous object. Please try again.");
    }
    if (connection.via && !viaId) throw new Error("A transport arrow referred to a missing payload object.");
    let relationId = `universal-relation-${index + 1}`; let suffix = 2;
    while ((scene.relations ?? []).some(({ id }) => id === relationId)
      || commands.some((command) => command.action === "relate" && command.relation.id === relationId)) {
      relationId = `universal-relation-${index + 1}-${suffix++}`;
    }
    commands.push({ action: "relate", relation: {
      id: relationId, kind: mixedContainment && connection.kind === "contains" ? "relatesTo" : connection.kind ?? "relatesTo",
      sourceIds: [sourceId], targetIds: [targetId],
      predicate: connection.label.trim(),
      ...(viaId ? { objectIds: [viaId] } : {})
    } });
  });
  const motif = visualMotif(blueprint);
  if (motif) {
    const roleById = new Map<string, NonNullable<SceneEntity["visualRole"]>>();
    if (motif.family === "circulation-loop") {
      roleById.set(motif.source, "circulation-source"); roleById.set(motif.destination, "circulation-destination");
      roleById.set(motif.payload, "circulation-payload"); roleById.set(motif.enrichment, "circulation-enrichment");
    } else if (motif.family === "force-diagram") {
      roleById.set(motif.body, "object"); roleById.set(motif.surface, "surface");
      roleById.set(motif.appliedForce, "force"); roleById.set(motif.opposingForce, "force");
    } else if (motif.family === "labelled-container") {
      roleById.set(motif.container, "container"); roleById.set(motif.content, "contained");
    } else if (motif.family === "call-return-flow") {
      roleById.set(motif.caller, "control-caller"); roleById.set(motif.fn, "control-function");
      roleById.set(motif.callSite, "control-call-site");
    } else {
      roleById.set(motif.moving, "trajectory-object"); roleById.set(motif.apex, "trajectory-apex");
      roleById.set(motif.force, "trajectory-force");
    }
    commands.forEach((command, index) => {
      if (command.action !== "create") return;
      const rawId = blueprint.objects.find((object) => idMap.get(object.id) === command.entity.id)?.id;
      const role = rawId && roleById.get(rawId);
      if (!role) return;
      commands[index] = { ...command, entity: { ...command.entity, visualRole: role,
        ...(motif.family === "force-diagram" && (rawId === motif.appliedForce || rawId === motif.opposingForce)
          ? { direction: rawId === motif.appliedForce ? motif.direction : motif.direction === "right" ? "left" : "right" }
          : {}) } };
    });
  }
  const script: DoodleScript = {
    schemaVersion: "2.27.0", sceneId: scene.sceneId, revision: scene.revision + 1,
    confidence: blueprint.confidence, sourceText, commands,
    context: { subjectIds: createdIds.slice(0, 1), objectIds: createdIds.slice(1) }
  };
  const requireVisibleConnectors = (candidateScript: DoodleScript): DoodleScript => {
    const projected = applyDoodleScript(scene, candidateScript);
    for (const relation of projected.relations ?? []) {
      const order = relation.predicate && spatialOrder(relation.predicate);
      if (!order || relation.kind !== "relatesTo") continue;
      const from = projected.entities.find((entity) => entity.id === relation.sourceIds[0]);
      const to = projected.entities.find((entity) => entity.id === relation.targetIds[0]);
      if (from && to && Math.sign(from[order.axis] - to[order.axis]) !== order.sign) {
        throw new Error("The spatial relationships cannot fit clearly on this canvas.");
      }
    }
    if ([...universalSceneEdges(projected.relations ?? [], projected.entities).values()].some((geometry) => !geometry)) {
      throw new Error("The visual plan has a relationship whose arrow or caption cannot be placed clearly.");
    }
    return candidateScript;
  };
  if (motif) {
    const staged = applyDoodleScript(scene, script);
    const mapped = motif.family === "circulation-loop"
      ? planCirculationLoop(staged, {
        sourceId: idMap.get(motif.source)!, destinationId: idMap.get(motif.destination)!,
        payloadId: idMap.get(motif.payload)!, enrichmentId: idMap.get(motif.enrichment)!
      }, new Set(createdIds))
      : motif.family === "force-diagram" ? planForceDiagram(staged, {
        bodyId: idMap.get(motif.body)!, surfaceId: idMap.get(motif.surface)!,
        appliedForceId: idMap.get(motif.appliedForce)!, opposingForceId: idMap.get(motif.opposingForce)!
      }, new Set(createdIds), motif.direction)
      : motif.family === "labelled-container"
        ? planLabelledContainer(staged, idMap.get(motif.container)!, idMap.get(motif.content)!,
          new Set([idMap.get(motif.container)!, idMap.get(motif.content)!]))
      : motif.family === "call-return-flow"
        ? planCallReturnFlow(staged, { callerId: idMap.get(motif.caller)!, functionId: idMap.get(motif.fn)!,
          callSiteId: idMap.get(motif.callSite)! }, new Set(createdIds))
      : planChangingSpeedMotion(staged, { objectId: idMap.get(motif.moving)!, apexId: idMap.get(motif.apex)!,
        forceId: idMap.get(motif.force)! }, new Set(createdIds));
    if (!mapped) throw new Error("The complete diagram cannot fit safely on this canvas.");
    const moveById = new Map(mapped.map((move) => [move.targetId, move] as const));
    return requireVisibleConnectors({ ...script, commands: commands.map((command) => {
      if (command.action !== "create") return command;
      const move = moveById.get(command.entity.id);
      if (!move) return command;
      return { ...command, entity: { ...command.entity, x: move.x, y: move.y } };
    }) });
  }
  // A complete input → part → whole graph has a shared layout grammar. Preserve
  // the model's entities and meanings, but stage its channels in reading order.
  // Partial or mixed graphs keep the ordinary universal layout instead.
  const parts = blueprint.connections.filter((connection) => connection.kind === "partOf");
  if (blueprint.mode !== "replace" || !parts.length || parts.length > 3
    || blueprint.connections.length !== parts.length * 2
    || parts.some((part) => part.to !== parts[0].to)) return requireVisibleConnectors(script);
  const channels = parts.map((part) => {
    const incoming = blueprint.connections.filter((connection) =>
      (connection.kind === "flowsInto" || connection.kind === "illuminates") && connection.to === part.from);
    return incoming.length === 1 ? { inputId: incoming[0].from, partId: part.from,
      flowPredicate: incoming[0].kind as "flowsInto" | "illuminates" } : null;
  });
  if (channels.some((channel) => !channel)) return requireVisibleConnectors(script);
  const completeChannels = channels as { inputId: string; partId: string; flowPredicate: "flowsInto" | "illuminates" }[];
  const references = [parts[0].to, ...completeChannels.flatMap(({ inputId, partId }) => [inputId, partId])];
  if (new Set(references).size !== references.length || references.length !== blueprint.objects.length) return requireVisibleConnectors(script);
  completeChannels.sort((a, b) => blueprint.objects.find((object) => object.id === a.partId)!.y
    - blueprint.objects.find((object) => object.id === b.partId)!.y);
  const mapped = completeChannels.map(({ inputId, partId, flowPredicate }) => ({
    inputId: idMap.get(inputId)!, partId: idMap.get(partId)!, flowPredicate
  }));
  const staged = planPartWholeFlow(applyDoodleScript(scene, script), idMap.get(parts[0].to)!, mapped, new Set(createdIds));
  if (!staged) return requireVisibleConnectors(script);
  const moveById = new Map(staged.map(({ targetId, x, y }) => [targetId, { x, y }] as const));
  return requireVisibleConnectors({ ...script, commands: commands.map((command) => command.action === "create" && moveById.has(command.entity.id)
    ? { ...command, entity: { ...command.entity, ...moveById.get(command.entity.id)! } } : command) });
}
