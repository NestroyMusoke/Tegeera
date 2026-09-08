export type VisualActionDirection = "subject-to-object" | "object-to-subject";
export type VisualActionCue = "intake" | "output" | "transform" | "flow" | "influence";

export interface VisualActionDefinition {
  predicate: string;
  label: string;
  aliases: readonly string[];
  syntax: "direct" | "prepositional";
  prepositions: readonly string[];
  direction: VisualActionDirection;
  cue: VisualActionCue;
}

// A visual action is a reusable semantic connector, never a complete sentence
// or a set of coordinates. Nouns remain open concept slots.
export const visualActionRegistry: readonly VisualActionDefinition[] = [
  { predicate: "absorb", label: "absorbs", aliases: ["absorb", "absorbs", "absorbing", "take in", "takes in"], syntax: "direct", prepositions: [], direction: "object-to-subject", cue: "intake" },
  { predicate: "release", label: "releases", aliases: ["release", "releases", "releasing", "emit", "emits", "emitting", "give off", "gives off"], syntax: "direct", prepositions: [], direction: "subject-to-object", cue: "output" },
  { predicate: "produce", label: "produces", aliases: ["produce", "produces", "producing", "generate", "generates", "generating"], syntax: "direct", prepositions: [], direction: "subject-to-object", cue: "output" },
  { predicate: "affect", label: "affects", aliases: ["affect", "affects", "affecting", "influence", "influences", "influencing"], syntax: "direct", prepositions: [], direction: "subject-to-object", cue: "influence" },
  { predicate: "transform", label: "transforms into", aliases: ["transform", "transforms", "transforming", "change", "changes", "changing", "turn", "turns", "turning"], syntax: "prepositional", prepositions: ["into"], direction: "subject-to-object", cue: "transform" },
  { predicate: "evaporate", label: "evaporates into", aliases: ["evaporate", "evaporates", "evaporating"], syntax: "prepositional", prepositions: ["into"], direction: "subject-to-object", cue: "transform" },
  { predicate: "flow", label: "flows to", aliases: ["flow", "flows", "flowing"], syntax: "prepositional", prepositions: ["into", "to", "through"], direction: "subject-to-object", cue: "flow" }
];

const aliasToAction = new Map(visualActionRegistry.flatMap((action) => action.aliases.map((alias) => [alias, action] as const)));

export function visualActionForAlias(alias: string): VisualActionDefinition | undefined {
  return aliasToAction.get(alias);
}

export function visualActionForPredicate(predicate?: string): VisualActionDefinition | undefined {
  return visualActionRegistry.find((action) => action.predicate === predicate);
}

export function visualActionAliases(syntax: VisualActionDefinition["syntax"]): string[] {
  return [...aliasToAction.entries()]
    .filter(([, action]) => action.syntax === syntax)
    .map(([alias]) => alias)
    .sort((a, b) => b.length - a.length);
}

export function visualActionPrepositions(): string[] {
  return [...new Set(visualActionRegistry.flatMap((action) => action.prepositions))].sort((a, b) => b.length - a.length);
}

export function validateVisualActionRegistry(): string[] {
  const issues: string[] = [];
  const predicates = new Set<string>();
  const aliases = new Map<string, string>();
  for (const action of visualActionRegistry) {
    if (predicates.has(action.predicate)) issues.push(`Duplicate visual action predicate: ${action.predicate}`);
    predicates.add(action.predicate);
    if (action.syntax === "prepositional" && !action.prepositions.length) issues.push(`Missing preposition: ${action.predicate}`);
    if (action.syntax === "direct" && action.prepositions.length) issues.push(`Unexpected preposition: ${action.predicate}`);
    for (const alias of action.aliases) {
      const owner = aliases.get(alias);
      if (owner) issues.push(`Duplicate visual action alias: ${alias} (${owner}, ${action.predicate})`);
      aliases.set(alias, action.predicate);
    }
  }
  return issues;
}

const startupIssues = validateVisualActionRegistry();
if (startupIssues.length) throw new Error(`Invalid visual action registry: ${startupIssues.join("; ")}`);
