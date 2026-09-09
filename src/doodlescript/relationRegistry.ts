import { actionForPredicate } from "./actionRegistry";
import { layoutFamilySupportsRelation, type LayoutFamilyId } from "./layoutFamilyRegistry";
import { relationSchema, type DoodleScript, type SceneRelation } from "./schema";
import { visualActionForPredicate } from "./visualActionRegistry";

export const RELATION_REGISTRY_VERSION = "1.0.0";

export type RelationKind = SceneRelation["kind"];
export type RelationFamily = "structural" | "directional" | "ordered" | "performance" | "event" | "visual";

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
}

export const relationRegistry: readonly RelationDefinition[] = [
  { kind: "shares", family: "structural", label: "share", aliases: ["sharing", "share", "shares"], minimumVersion: "1.1.0", source: { min: 1, max: 12 }, target: { min: 1, max: 12 }, object: { min: 0, max: 0 }, directed: false, layout: "group" },
  { kind: "owns", family: "structural", label: "owns", aliases: ["owns", "own", "has", "have"], minimumVersion: "1.1.0", source: { min: 1, max: 1 }, target: { min: 1, max: 12 }, object: { min: 0, max: 0 }, directed: true, layout: "ownership" },
  { kind: "toward", family: "directional", label: "moves toward", aliases: [], minimumVersion: "1.3.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "arrow" },
  { kind: "away", family: "directional", label: "moves away from", aliases: [], minimumVersion: "1.3.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "arrow" },
  { kind: "queuedFor", family: "ordered", label: "waits for CPU", aliases: [], minimumVersion: "1.4.0", source: { min: 1, max: 4 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "queue", languageTemplates: [
    { shape: "source-verb-target-container", verbs: ["waiting in", "wait in", "waits in"], containers: ["ready queue", "queue"] },
    { shape: "target-container-verb-source", verbs: ["contains", "has"], containers: ["ready queue", "queue"] }
  ] },
  { kind: "actsOn", family: "performance", label: "acts on", aliases: [], minimumVersion: "1.6.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "contact" },
  { kind: "handover", family: "performance", label: "gives", aliases: [], minimumVersion: "1.7.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 1, max: 1 }, directed: true, layout: "contact" },
  { kind: "before", family: "event", label: "before", aliases: ["happens before", "happen before", "occurs before", "occur before", "comes before", "come before"], inverseAliases: ["happens after", "happen after", "occurs after", "occur after", "comes after", "come after"], minimumVersion: "1.8.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "event-graph" },
  { kind: "causes", family: "event", label: "causes", aliases: ["causes", "cause", "leads to", "lead to", "results in", "result in"], minimumVersion: "1.8.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "event-graph" },
  { kind: "visualAction", family: "visual", label: "acts on", aliases: [], minimumVersion: "1.9.0", source: { min: 1, max: 1 }, target: { min: 1, max: 1 }, object: { min: 0, max: 0 }, directed: true, layout: "visual-flow" }
];

const byKind = new Map(relationRegistry.map((definition) => [definition.kind, definition] as const));

export function relationForKind(kind: RelationKind): RelationDefinition {
  return byKind.get(kind)!;
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
  return predicate ? { predicate, sourceText: binary[1], targetText: binary[3] } : null;
}

const versionOrder: DoodleScript["schemaVersion"][] = ["1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0", "1.8.0", "1.9.0"];

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

export function relationLabel(relation: SceneRelation): string {
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
