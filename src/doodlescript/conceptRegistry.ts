import { entityKindSchema, type EntityKind } from "./schema";

export const CONCEPT_REGISTRY_VERSION = "1.0.0";

export type ConceptCategory =
  | "actor"
  | "object"
  | "place"
  | "system"
  | "process"
  | "vehicle"
  | "nature"
  | "furniture"
  | "abstract";

export type ConceptCapability =
  | "human-performance"
  | "walk"
  | "drive"
  | "queue-member"
  | "queue-target";

export interface ConceptDefinition {
  id: string;
  kind: EntityKind;
  category: ConceptCategory;
  singular: string;
  plural: string;
  aliases: readonly string[];
  glyphKey: EntityKind;
  countable: boolean;
  capabilities: readonly ConceptCapability[];
  orderedDomains?: {
    memberOf?: readonly string[];
    targetFor?: readonly string[];
  };
}

// Structural concepts only: no sentence patterns, coordinates, or lesson-specific
// scenes. Open visual-action and event slots continue to use honest generic nodes.
export const conceptRegistry: readonly ConceptDefinition[] = [
  { id: "person", kind: "person", category: "actor", singular: "person", plural: "people", aliases: ["persons"], glyphKey: "person", countable: true, capabilities: ["human-performance", "walk", "queue-member"], orderedDomains: { memberOf: ["service"] } },
  { id: "student", kind: "student", category: "actor", singular: "student", plural: "students", aliases: ["learner", "learners"], glyphKey: "student", countable: true, capabilities: ["human-performance", "walk", "queue-member"], orderedDomains: { memberOf: ["service"] } },
  { id: "teacher", kind: "teacher", category: "actor", singular: "teacher", plural: "teachers", aliases: ["lecturer", "lecturers"], glyphKey: "teacher", countable: true, capabilities: ["human-performance", "walk", "queue-member"], orderedDomains: { memberOf: ["service"] } },
  { id: "process", kind: "process", category: "process", singular: "process", plural: "processes", aliases: [], glyphKey: "process", countable: true, capabilities: ["queue-member"], orderedDomains: { memberOf: ["cpu-scheduling"] } },
  { id: "cpu", kind: "cpu", category: "system", singular: "cpu", plural: "cpus", aliases: ["processor", "processors"], glyphKey: "cpu", countable: true, capabilities: ["queue-target"], orderedDomains: { targetFor: ["cpu-scheduling"] } },
  { id: "car", kind: "car", category: "vehicle", singular: "car", plural: "cars", aliases: ["vehicle", "vehicles"], glyphKey: "car", countable: true, capabilities: ["drive"] },
  { id: "book", kind: "book", category: "object", singular: "book", plural: "books", aliases: [], glyphKey: "book", countable: true, capabilities: [] },
  { id: "desk", kind: "desk", category: "furniture", singular: "desk", plural: "desks", aliases: ["table", "tables"], glyphKey: "desk", countable: true, capabilities: [] },
  { id: "tree", kind: "tree", category: "nature", singular: "tree", plural: "trees", aliases: [], glyphKey: "tree", countable: true, capabilities: [] },
  { id: "building", kind: "building", category: "place", singular: "building", plural: "buildings", aliases: ["school", "schools", "house", "houses"], glyphKey: "building", countable: true, capabilities: ["queue-target"], orderedDomains: { targetFor: ["service"] } },
  { id: "generic", kind: "generic", category: "abstract", singular: "concept", plural: "concepts", aliases: [], glyphKey: "generic", countable: true, capabilities: [] }
];

function normalized(value: string): string {
  return value.toLowerCase().trim();
}

function forms(definition: ConceptDefinition): string[] {
  return [definition.singular, definition.plural, ...definition.aliases].map(normalized);
}

const aliasToConcept = new Map(conceptRegistry.flatMap((definition) =>
  forms(definition).map((alias) => [alias, definition] as const)
));
const kindToConcept = new Map(conceptRegistry.map((definition) => [definition.kind, definition] as const));

export function conceptForAlias(alias: string): ConceptDefinition | undefined {
  return aliasToConcept.get(normalized(alias));
}

export function conceptForKind(kind: EntityKind): ConceptDefinition {
  return kindToConcept.get(kind) ?? kindToConcept.get("generic")!;
}

export function conceptSupports(kind: EntityKind, capability: ConceptCapability): boolean {
  return conceptForKind(kind).capabilities.includes(capability);
}

export function sharedOrderedDomain(memberKind: EntityKind, targetKind: EntityKind): string | undefined {
  const memberDomains = conceptForKind(memberKind).orderedDomains?.memberOf ?? [];
  const targetDomains = conceptForKind(targetKind).orderedDomains?.targetFor ?? [];
  return memberDomains.find((domain) => targetDomains.includes(domain));
}

export function validateConceptRegistry(registry: readonly ConceptDefinition[] = conceptRegistry): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const kinds = new Set<EntityKind>();
  const aliases = new Map<string, string>();
  for (const definition of registry) {
    if (ids.has(definition.id)) issues.push(`Duplicate concept id: ${definition.id}`);
    if (kinds.has(definition.kind)) issues.push(`Duplicate concept kind: ${definition.kind}`);
    if (definition.glyphKey !== definition.kind) issues.push(`Concept glyph does not match schema kind: ${definition.id}`);
    ids.add(definition.id);
    kinds.add(definition.kind);
    for (const alias of forms(definition)) {
      const owner = aliases.get(alias);
      if (owner) issues.push(`Duplicate concept alias: ${alias} (${owner}, ${definition.id})`);
      aliases.set(alias, definition.id);
    }
    const memberDomains = definition.orderedDomains?.memberOf ?? [];
    const targetDomains = definition.orderedDomains?.targetFor ?? [];
    if (definition.capabilities.includes("queue-member") !== Boolean(memberDomains.length)) {
      issues.push(`Queue-member capability/domain mismatch: ${definition.id}`);
    }
    if (definition.capabilities.includes("queue-target") !== Boolean(targetDomains.length)) {
      issues.push(`Queue-target capability/domain mismatch: ${definition.id}`);
    }
    if (new Set([...memberDomains, ...targetDomains]).size !== memberDomains.length + targetDomains.length) {
      issues.push(`Duplicate ordered domain: ${definition.id}`);
    }
  }
  for (const kind of entityKindSchema.options) if (!kinds.has(kind)) issues.push(`Missing concept kind: ${kind}`);
  return issues;
}

const startupIssues = validateConceptRegistry();
if (startupIssues.length) throw new Error(`Invalid concept registry: ${startupIssues.join("; ")}`);
