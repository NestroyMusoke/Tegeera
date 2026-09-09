export const SYMBOL_ONTOLOGY_VERSION = "1.1.0";

export type VisualCategory =
  | "nature"
  | "weather"
  | "energy"
  | "material"
  | "process"
  | "force"
  | "state"
  | "knowledge"
  | "system";

export type SymbolPrimitive =
  | "cloud"
  | "crack"
  | "droplet"
  | "flame"
  | "gear"
  | "ground"
  | "leaf"
  | "lightning"
  | "plant"
  | "rays"
  | "roots"
  | "snowflake"
  | "sun"
  | "water";

export type VisualCapability =
  | "breaks"
  | "compresses"
  | "cycles"
  | "falls"
  | "flows"
  | "radiates"
  | "rises"
  | "spreads";

interface SymbolDefinition {
  id: string;
  aliases: readonly string[];
  tags: readonly string[];
  category: VisualCategory;
  anchor: SymbolPrimitive;
  capabilities: readonly VisualCapability[];
  visualCues?: readonly string[];
}

export interface VisualSymbolPlan {
  ontologyVersion: typeof SYMBOL_ONTOLOGY_VERSION;
  symbolId: string;
  category: VisualCategory | "unknown";
  primitives: SymbolPrimitive[];
  capabilities: VisualCapability[];
  visualCues: string[];
  matchedTerms: string[];
  confidence: number;
  fallback: boolean;
}

// Concepts describe reusable visual meaning. They contain no sentence patterns,
// coordinates, or lesson-specific layouts. New vocabulary extends this data only.
export const symbolOntology: readonly SymbolDefinition[] = [
  { id: "heat", aliases: ["heat", "temperature", "warmth", "thermal energy"], tags: ["thermal", "hot"], category: "energy", anchor: "flame", capabilities: ["radiates"] },
  { id: "sunlight", aliases: ["sun", "sunlight", "sunshine", "solar energy"], tags: ["solar", "light"], category: "energy", anchor: "sun", capabilities: ["radiates"], visualCues: ["sun-symbol"] },
  { id: "electricity", aliases: ["electricity", "electric current", "electric charge", "voltage"], tags: ["electric", "power", "charge"], category: "energy", anchor: "lightning", capabilities: ["flows"] },
  { id: "water", aliases: ["water", "liquid", "river", "stream"], tags: ["fluid", "wet"], category: "material", anchor: "water", capabilities: ["flows"] },
  { id: "rain", aliases: ["rain", "rainfall", "heavy rain", "heavy rainfall", "storm"], tags: ["weather", "precipitation"], category: "weather", anchor: "cloud", capabilities: ["falls"] },
  { id: "cloud", aliases: ["cloud", "clouds"], tags: ["weather", "sky"], category: "weather", anchor: "cloud", capabilities: [] },
  { id: "condensation", aliases: ["condensation", "dew"], tags: ["condense", "vapor", "gas", "liquid"], category: "process", anchor: "cloud", capabilities: ["falls"] },
  { id: "evaporation", aliases: ["evaporation", "vaporization"], tags: ["evaporate", "vapor", "liquid", "gas"], category: "process", anchor: "water", capabilities: ["rises"] },
  { id: "plant", aliases: ["plant", "vegetation", "crop"], tags: ["botany", "green"], category: "nature", anchor: "plant", capabilities: ["spreads"] },
  { id: "roots", aliases: ["root", "roots"], tags: ["plant root", "underground"], category: "nature", anchor: "roots", capabilities: [], visualCues: ["visible-roots"] },
  { id: "leaf", aliases: ["leaf", "leaves"], tags: ["plant leaf", "foliage"], category: "nature", anchor: "leaf", capabilities: [] },
  { id: "photosynthesis", aliases: ["photosynthesis"], tags: ["plant", "sunlight", "energy", "chlorophyll"], category: "process", anchor: "leaf", capabilities: ["cycles", "radiates"] },
  { id: "soil-erosion", aliases: ["soil erosion", "erosion"], tags: ["soil", "earth", "land", "weathering"], category: "process", anchor: "ground", capabilities: ["flows", "breaks"] },
  { id: "pressure", aliases: ["pressure", "compression"], tags: ["compress", "force", "stress"], category: "force", anchor: "gear", capabilities: ["compresses"] },
  { id: "expansion", aliases: ["expansion", "growth", "increase"], tags: ["expand", "grow", "larger"], category: "process", anchor: "gear", capabilities: ["spreads"] },
  { id: "damage", aliases: ["damage", "failure", "fracture", "breakage"], tags: ["broken", "crack", "harm"], category: "state", anchor: "crack", capabilities: ["breaks"] },
  { id: "freezing", aliases: ["freezing", "ice", "frost"], tags: ["cold", "solid"], category: "process", anchor: "snowflake", capabilities: [] },
  { id: "cycle", aliases: ["cycle", "loop", "repetition"], tags: ["repeat", "circular"], category: "process", anchor: "gear", capabilities: ["cycles"] }
];

const capabilityPrimitives: Readonly<Record<VisualCapability, SymbolPrimitive | undefined>> = {
  breaks: "crack",
  compresses: undefined,
  cycles: undefined,
  falls: "droplet",
  flows: undefined,
  radiates: "rays",
  rises: "droplet",
  spreads: undefined
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function terms(value: string): string[] {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function singular(term: string): string {
  if (term.endsWith("ies") && term.length > 4) return `${term.slice(0, -3)}y`;
  if (term.endsWith("es") && term.length > 4) return term.slice(0, -2);
  if (term.endsWith("s") && term.length > 3) return term.slice(0, -1);
  return term;
}

function scoreDefinition(label: string, definition: SymbolDefinition): { score: number; matched: string[] } {
  const normalized = normalize(label);
  const labelTerms = new Set(terms(normalized).flatMap((term) => [term, singular(term)]));
  const aliases = definition.aliases.map(normalize);
  if (aliases.includes(normalized)) return { score: 100, matched: [normalized] };

  let score = 0;
  const matched = new Set<string>();
  for (const alias of aliases) {
    const aliasTerms = terms(alias);
    if (aliasTerms.every((term) => labelTerms.has(term) || labelTerms.has(singular(term)))) {
      score += aliasTerms.length * 4;
      aliasTerms.forEach((term) => matched.add(term));
    }
  }
  for (const tag of definition.tags.map(normalize)) {
    const tagTerms = terms(tag);
    if (tagTerms.every((term) => labelTerms.has(term) || labelTerms.has(singular(term)))) {
      score += tagTerms.length * 4;
      tagTerms.forEach((term) => matched.add(term));
    }
  }
  return { score, matched: [...matched].sort() };
}

export function resolveVisualSymbol(label: string): VisualSymbolPlan {
  const ranked = symbolOntology
    .map((definition) => ({ definition, ...scoreDefinition(label, definition) }))
    .filter(({ score }) => score >= 6)
    .sort((a, b) => b.score - a.score
      || b.matched.length - a.matched.length
      || a.definition.id.localeCompare(b.definition.id));
  const best = ranked[0];
  const ambiguous = best && ranked[1]
    && best.score === ranked[1].score
    && best.matched.length === ranked[1].matched.length;
  if (!best || ambiguous) {
    return {
      ontologyVersion: SYMBOL_ONTOLOGY_VERSION,
      symbolId: "labelled-node",
      category: "unknown",
      primitives: [],
      capabilities: [],
      visualCues: [],
      matchedTerms: [],
      confidence: 0,
      fallback: true
    };
  }

  const capabilities = [...best.definition.capabilities];
  const primitives = [best.definition.anchor, ...capabilities.map((capability) => capabilityPrimitives[capability])]
    .filter((primitive): primitive is SymbolPrimitive => Boolean(primitive))
    .filter((primitive, index, all) => all.indexOf(primitive) === index)
    .slice(0, 3);
  return {
    ontologyVersion: SYMBOL_ONTOLOGY_VERSION,
    symbolId: best.definition.id,
    category: best.definition.category,
    primitives,
    capabilities,
    visualCues: [...(best.definition.visualCues ?? [])],
    matchedTerms: best.matched,
    confidence: best.score === 100 ? 1 : Math.min(0.9, 0.5 + best.score / 100),
    fallback: false
  };
}

export function validateSymbolOntology(): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const aliases = new Map<string, string>();
  for (const definition of symbolOntology) {
    if (ids.has(definition.id)) issues.push(`Duplicate symbol id: ${definition.id}`);
    ids.add(definition.id);
    for (const rawAlias of definition.aliases) {
      const alias = normalize(rawAlias);
      const owner = aliases.get(alias);
      if (owner) issues.push(`Duplicate symbol alias: ${alias} (${owner}, ${definition.id})`);
      aliases.set(alias, definition.id);
    }
  }
  return issues;
}

const startupIssues = validateSymbolOntology();
if (startupIssues.length) throw new Error(`Invalid visual symbol ontology: ${startupIssues.join("; ")}`);
