import { actionForPredicate } from "./actionRegistry";
import { layoutFamilySupportsRelation, type LayoutFamilyId } from "./layoutFamilyRegistry";
import { relationSchema, type DoodleScript, type SceneRelation } from "./schema";
import { visualActionForPredicate } from "./visualActionRegistry";
import type { ConceptCapability } from "./conceptRegistry";

export const RELATION_REGISTRY_VERSION = "2.16.0";

export type RelationKind = SceneRelation["kind"];
export type RelationFamily = "structural" | "directional" | "ordered" | "performance" | "event" | "visual" | "compositional" | "mechanical" | "containment" | "measurement" | "landscape" | "circulation" | "kinematics" | "control-flow" | "arithmetic" | "hydrology" | "lifecycle" | "optics" | "data-structure" | "angle-sum" | "tectonics" | "routine";

interface Cardinality {
  min: number;
  max: number;
}

export interface RelationDefinition {
  kind: RelationKind;
  family: RelationFamily;
  label: string;
  aliases: readonly string[];
  inverseAliases?: readonly string[];
  minimumVersion: DoodleScript["schemaVersion"];
  source: Cardinality;
  target: Cardinality;
  object: Cardinality;
  directed: boolean;
  layout: LayoutFamilyId;
  languageTemplates?: readonly RelationLanguageTemplate[];
  aliasRules?: readonly RelationAliasRule[];
}

export interface RelationAliasRule {
  aliases: readonly string[];
  relationPredicate: string;
  readableLabel: string;
  sourceCapability?: ConceptCapability;
}

export interface RelationLanguageTemplate {
  shape: "source-verb-target-container" | "target-container-verb-source";
  verbs: readonly string[];
  containers: readonly string[];
}

export interface RegisteredRelationMatch {
  predicate: string;
  sourceText: string;
  targetText: string;
  relationPredicate?: string;
  sourceCapability?: ConceptCapability;
}

const towardMotionRules: readonly RelationAliasRule[] = [
  { aliases: ["approaches", "approach", "approaching", "moves toward", "move toward", "moving toward", "moves towards", "move towards", "moving towards"], relationPredicate: "move", readableLabel: "moves toward" },
  { aliases: ["drives toward", "drive toward", "driving toward", "drives towards", "drive towards", "driving towards"], relationPredicate: "drive", readableLabel: "drives toward", sourceCapability: "drive" },
  { aliases: ["walks toward", "walk toward", "walking toward", "walks towards", "walk towards", "walking towards"], relationPredicate: "walk", readableLabel: "walks toward", sourceCapability: "walk" }
];

const awayMotionRules: readonly RelationAliasRule[] = [
  { aliases: ["moves away from", "move away from", "moving away from"], relationPredicate: "move", readableLabel: "moves away from" },
  { aliases: ["drives away from", "drive away from", "driving away from"], relationPredicate: "drive", readableLabel: "drives away from", sourceCapability: "drive" },
  { aliases: ["walks away from", "walk away from", "walking away from"], relationPredicate: "walk", readableLabel: "walks away from", sourceCapability: "walk" }
];

const aliasesFrom = (rules: readonly RelationAliasRule[]): string[] => rules.flatMap(({ aliases }) => aliases);

export const relationRegistry: readonly RelationDefinition[] = [
  { kind: "shares", family: "structural", label: "share", aliases: ["sharing", "share", "shares"], minimumVersion: "1.1.0", source: { min: 1, max: 12 }, target: { min: 1, max: 12 }, object: { min: 0, max: 0 }, directed: false, layout: "group" },
  { kind: "owns", family: "structural", label: "owns", aliases: ["owns", "own", "has", "have"], minimumVersion: "1.1.0", source: { min: 1, max: 1 }, target: { min: 1, max: 12 }, object: { min: 0, max: 0 }, directed: true, layout: "ownership" },
  { kind: "toward", family: "directional", label: "moves toward", aliases: aliasesFrom(towardMotionRules), aliasRules: towardMotionRules, minimumVersion: "1.3.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "arrow" },
  { kind: "away", family: "directional", label: "moves away from", aliases: aliasesFrom(awayMotionRules), aliasRules: awayMotionRules, minimumVersion: "1.3.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "arrow" },
  { kind: "queuedFor", family: "ordered", label: "waits in queue", aliases: [], minimumVersion: "1.4.0", source: { min: 1, max: 4 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "queue", languageTemplates: [
    { shape: "source-verb-target-container", verbs: ["waiting in", "wait in", "waits in"], containers: ["ready queue", "queue"] },
    { shape: "target-container-verb-source", verbs: ["contains", "has"], containers: ["ready queue", "queue"] }
  ] },
  { kind: "actsOn", family: "performance", label: "acts on", aliases: [], minimumVersion: "1.6.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "contact" },
  { kind: "handover", family: "performance", label: "gives", aliases: [], minimumVersion: "1.7.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 1, max: 1 }, directed: true, layout: "contact" },
  { kind: "before", family: "event", label: "before", aliases: ["happens before", "happen before", "occurs before", "occur before", "comes before", "come before"], inverseAliases: ["happens after", "happen after", "occurs after", "occur after", "comes after", "come after"], minimumVersion: "1.8.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "event-graph" },
  { kind: "causes", family: "event", label: "causes", aliases: ["causes", "cause", "leads to", "lead to", "results in", "result in"], minimumVersion: "1.8.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "event-graph" },
  { kind: "visualAction", family: "visual", label: "acts on", aliases: [], minimumVersion: "1.9.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "visual-flow" },
  { kind: "partOf", family: "compositional", label: "part of", aliases: [], minimumVersion: "2.0.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "part-whole-flow" },
  { kind: "flowsInto", family: "compositional", label: "flows into", aliases: [], minimumVersion: "2.0.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "part-whole-flow" },
  { kind: "illuminates", family: "compositional", label: "illuminates", aliases: [], minimumVersion: "2.0.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "part-whole-flow" },
  { kind: "appliedTo", family: "mechanical", label: "applied to", aliases: [], minimumVersion: "2.1.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "force-diagram" },
  { kind: "opposes", family: "mechanical", label: "opposes", aliases: [], minimumVersion: "2.1.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "force-diagram" },
  { kind: "contacts", family: "mechanical", label: "contacts", aliases: [], minimumVersion: "2.1.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: false, layout: "force-diagram" },
  { kind: "contains", family: "containment", label: "contains", aliases: [], minimumVersion: "2.2.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "labelled-container" },
  { kind: "measures", family: "measurement", label: "measures", aliases: [], minimumVersion: "2.3.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "geometric-construction" },
  { kind: "flowsFrom", family: "landscape", label: "flows from", aliases: [], minimumVersion: "2.4.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "landscape-flow" },
  { kind: "flowsTo", family: "landscape", label: "flows to", aliases: [], minimumVersion: "2.4.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "landscape-flow" },
  { kind: "pumpsTo", family: "circulation", label: "pumps to", aliases: [], minimumVersion: "2.6.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 1, max: 1 }, directed: true, layout: "circulation-loop" },
  { kind: "returnsTo", family: "circulation", label: "returns to", aliases: [], minimumVersion: "2.6.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 1, max: 1 }, directed: true, layout: "circulation-loop" },
  { kind: "carries", family: "circulation", label: "carries", aliases: [], minimumVersion: "2.6.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "circulation-loop" },
  { kind: "risesTo", family: "kinematics", label: "rises to", aliases: [], minimumVersion: "2.7.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "changing-speed-motion" },
  { kind: "fallsFrom", family: "kinematics", label: "falls from", aliases: [], minimumVersion: "2.7.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "changing-speed-motion" },
  { kind: "accelerates", family: "kinematics", label: "accelerates", aliases: [], minimumVersion: "2.7.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "changing-speed-motion" },
  { kind: "calls", family: "control-flow", label: "calls", aliases: [], minimumVersion: "2.8.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "call-return-flow" },
  { kind: "returnsControlTo", family: "control-flow", label: "returns to", aliases: [], minimumVersion: "2.8.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "call-return-flow" },
  { kind: "subtracts", family: "arithmetic", label: "subtracts from", aliases: [], minimumVersion: "2.9.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "fraction-subtraction" },
  { kind: "resultsIn", family: "arithmetic", label: "results in", aliases: [], minimumVersion: "2.9.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "fraction-subtraction" },
  { kind: "fallsTo", family: "hydrology", label: "falls to", aliases: [], minimumVersion: "2.10.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "water-cycle-loop" },
  { kind: "infiltrates", family: "hydrology", label: "infiltrates", aliases: [], minimumVersion: "2.10.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "water-cycle-loop" },
  { kind: "evaporatesTo", family: "hydrology", label: "evaporates to", aliases: [], minimumVersion: "2.10.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "water-cycle-loop" },
  { kind: "transformsTo", family: "lifecycle", label: "transforms to", aliases: [], minimumVersion: "2.11.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "lifecycle-sequence" },
  { kind: "travelsTo", family: "optics", label: "travels to", aliases: [], minimumVersion: "2.12.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "reflection-ray" },
  { kind: "reflectsFrom", family: "optics", label: "reflects from", aliases: [], minimumVersion: "2.12.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "reflection-ray" },
  { kind: "accessedAt", family: "data-structure", label: "accessed at", aliases: [], minimumVersion: "2.13.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "lifo-stack" },
  { kind: "trianglePartOf", family: "angle-sum", label: "part of", aliases: [], minimumVersion: "2.14.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "triangle-angle-sum" },
  { kind: "sumsTo", family: "angle-sum", label: "sums to", aliases: [], minimumVersion: "2.14.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "triangle-angle-sum" },
  { kind: "pushesToward", family: "tectonics", label: "pushes toward", aliases: [], minimumVersion: "2.15.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "convergent-plates" },
  { kind: "routineBefore", family: "routine", label: "before", aliases: [], minimumVersion: "2.16.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "ordered-routine" }
];

const byKind = new Map(relationRegistry.map((definition) => [definition.kind, definition] as const));

export function relationForKind(kind: RelationKind): RelationDefinition {
  return byKind.get(kind)!;
}

export function relationSourceCapability(kind: RelationKind, predicate?: string): ConceptCapability | undefined {
  if (!predicate) return undefined;
  return relationForKind(kind).aliasRules?.find((rule) => rule.relationPredicate === predicate)?.sourceCapability;
}

export function relationPredicateIsRegistered(kind: RelationKind, predicate?: string): boolean {
  return !predicate || Boolean(relationForKind(kind).aliasRules?.some((rule) => rule.relationPredicate === predicate));
}

export function relationPredicateLabel(kind: RelationKind, predicate?: string): string | undefined {
  return relationForKind(kind).aliasRules?.find((rule) => rule.relationPredicate === predicate)?.readableLabel;
}

export const relationLexemes: readonly { predicate: string; words: readonly string[] }[] = [...relationRegistry
  .filter((definition) => definition.aliases.length)
  .map((definition) => ({ predicate: definition.kind, words: definition.aliases })),
  ...relationRegistry
    .filter((definition) => definition.inverseAliases?.length)
    .map((definition) => ({ predicate: definition.kind === "before" ? "after" : definition.kind, words: definition.inverseAliases ?? [] }))];

function pattern(values: readonly string[]): string {
  return [...values].sort((a, b) => b.length - a.length).map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

export function matchRegisteredRelation(text: string): RegisteredRelationMatch | null {
  for (const definition of relationRegistry) {
    for (const template of definition.languageTemplates ?? []) {
      const verbs = pattern(template.verbs);
      const containers = pattern(template.containers);
      const expression = template.shape === "source-verb-target-container"
        ? new RegExp(`^(.+?) (?:is |are )?(?:${verbs}) (?:a|an|the) (.+?) (?:${containers})$`)
        : new RegExp(`^(?:a|an|the) (.+?) (?:${containers}) (?:${verbs}) (.+)$`);
      const match = text.match(expression);
      if (!match) continue;
      return template.shape === "source-verb-target-container"
        ? { predicate: definition.kind, sourceText: match[1], targetText: `a ${match[2]}` }
        : { predicate: definition.kind, sourceText: match[2], targetText: `a ${match[1]}` };
    }
  }
  const words = pattern(relationLexemes.flatMap(({ words: aliases }) => aliases));
  const binary = text.match(new RegExp(`^(.+?) (?:are )?(${words}) (.+)$`));
  if (!binary) return null;
  const predicate = relationLexemes.find(({ words: aliases }) => aliases.includes(binary[2]))?.predicate;
  if (!predicate) return null;
  const definition = relationRegistry.find((candidate) => candidate.kind === predicate);
  const rule = definition?.aliasRules?.find(({ aliases }) => aliases.includes(binary[2]));
  return {
    predicate, sourceText: binary[1], targetText: binary[3],
    ...(rule ? { relationPredicate: rule.relationPredicate, sourceCapability: rule.sourceCapability } : {})
  };
}

const versionOrder: DoodleScript["schemaVersion"][] = ["1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0", "1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0", "2.12.0", "2.13.0", "2.14.0", "2.15.0", "2.16.0"];

export function relationSupportsVersion(kind: RelationKind, version: DoodleScript["schemaVersion"]): boolean {
  return versionOrder.indexOf(version) >= versionOrder.indexOf(relationForKind(kind).minimumVersion);
}

export function relationCardinalityIssues(relation: SceneRelation): string[] {
  const definition = relationForKind(relation.kind);
  const counts = [
    ["source", relation.sourceIds.length, definition.source],
    ["target", relation.targetIds.length, definition.target],
    ["object", relation.objectIds?.length ?? 0, definition.object]
  ] as const;
  return counts.flatMap(([role, count, bounds]) => count < bounds.min || count > bounds.max
    ? [`${definition.label} requires ${bounds.min === bounds.max ? bounds.min : `${bounds.min}-${bounds.max}`} ${role} role${bounds.max === 1 ? "" : "s"}.`]
    : []);
}

export function relationLabel(relation: SceneRelation, sourceLabel?: string): string {
  if ((relation.kind === "flowsFrom" || relation.kind === "flowsTo")
    && sourceLabel && /(?:rivers|streams|creeks|watercourses)$/.test(sourceLabel)) {
    return relation.kind === "flowsFrom" ? "flow from" : "flow to";
  }
  if (relation.kind === "toward" || relation.kind === "away") {
    return relationPredicateLabel(relation.kind, relation.predicate) ?? relationForKind(relation.kind).label;
  }
  if (relation.kind === "actsOn") {
    return relation.preposition ? `${relation.predicate ?? "acts"} ${relation.preposition}`
      : actionForPredicate(relation.predicate)?.relationLabel ?? relation.predicate ?? relationForKind(relation.kind).label;
  }
  if (relation.kind === "visualAction") {
    return visualActionForPredicate(relation.predicate)?.label ?? relation.predicate ?? relationForKind(relation.kind).label;
  }
  return relationForKind(relation.kind).label;
}

export function validateRelationRegistry(registry: readonly RelationDefinition[] = relationRegistry): string[] {
  const issues: string[] = [];
  const kinds = new Set<RelationKind>();
  const aliases = new Map<string, RelationKind>();
  for (const definition of registry) {
    if (kinds.has(definition.kind)) issues.push(`Duplicate relation kind: ${definition.kind}`);
    kinds.add(definition.kind);
    for (const alias of [...definition.aliases, ...(definition.inverseAliases ?? [])]) {
      const owner = aliases.get(alias);
      if (owner) issues.push(`Duplicate relation alias: ${alias} (${owner}, ${definition.kind})`);
      aliases.set(alias, definition.kind);
    }
    for (const template of definition.languageTemplates ?? []) {
      if (!template.verbs.length || !template.containers.length) issues.push(`Incomplete language template: ${definition.kind}`);
    }
    for (const rule of definition.aliasRules ?? []) {
      if (!rule.aliases.length || !rule.relationPredicate || !rule.readableLabel) issues.push(`Incomplete alias rule: ${definition.kind}`);
      if (rule.aliases.some((alias) => !definition.aliases.includes(alias))) issues.push(`Unregistered ruled alias: ${definition.kind}`);
    }
    if (!layoutFamilySupportsRelation(definition.layout, definition.family)) {
      issues.push(`Layout family ${definition.layout} does not support relation family ${definition.family}: ${definition.kind}`);
    }
    for (const [role, bounds] of [["source", definition.source], ["target", definition.target], ["object", definition.object]] as const) {
      if (bounds.min < 0 || bounds.max < bounds.min || bounds.max > 12) issues.push(`Invalid ${role} cardinality: ${definition.kind}`);
    }
  }
  for (const kind of relationSchema.shape.kind.options) if (!kinds.has(kind)) issues.push(`Missing relation kind: ${kind}`);
  return issues;
}

const startupIssues = validateRelationRegistry();
if (startupIssues.length) throw new Error(`Invalid relation registry: ${startupIssues.join("; ")}`);
