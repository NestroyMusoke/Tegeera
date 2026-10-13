import { normalizePropagationLabels } from "./propagationBlueprint.mjs";
// "carries" is also a common ordinary verb. The typed carries link is reserved
// for a complete closed transport loop; outside that loop its label remains a
// truthful generic relation, not a half-formed specialist diagram.
export function normalizeOrdinaryCarry(candidate) {
  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.connections)) return candidate;
  if (candidate.connections.some((edge) => edge?.kind === "pumpsTo" || edge?.kind === "returnsTo")) return candidate;
  if (!candidate.connections.some((edge) => edge?.kind === "carries")) return candidate;
  return { ...candidate, connections: candidate.connections.map((edge) => {
    if (!edge || edge.kind !== "carries") return edge;
    const ordinaryEdge = { ...edge };
    delete ordinaryEdge.kind;
    return ordinaryEdge;
  }) };
}

const typedLabels = Object.freeze({
  partOf: "part of", flowsInto: "flows into", illuminates: "illuminates",
  before: "before", causes: "causes", contains: "contains", calls: "calls",
  returnsControlTo: "returnsTo", risesTo: "risesTo", fallsFrom: "fallsFrom",
  accelerates: "accelerates", pumpsTo: "pumps to", returnsTo: "returns to",
  carries: "carries", appliedTo: "applied to", opposes: "opposes", contacts: "contacts"
});

/** Optional type claims never override the model's more specific relationship.
 * Unknown kinds and transport links with a payload still fail validation. */
export function normalizeOptionalTypedKinds(candidate) {
  candidate = normalizePropagationLabels(candidate);
  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.connections)) return candidate;
  let changed = false;
  const connections = candidate.connections.map((edge) => {
    // Complete propagation types carry structural meaning; never silently
    // downgrade a malformed specialist claim into an ordinary arrow.
    if (["emits", "enters", "propagatesThrough", "reaches"].includes(edge?.kind)) return edge;
    if (!edge || typeof edge !== "object" || !Object.hasOwn(typedLabels, edge.kind)
      || edge.via !== undefined || typeof edge.label !== "string"
      || edge.label.trim().toLowerCase() === typedLabels[edge.kind].toLowerCase()) return edge;
    changed = true;
    const truthfulEdge = { ...edge };
    delete truthfulEdge.kind;
    return truthfulEdge;
  });
  return changed ? { ...candidate, connections } : candidate;
}

/** A self-contained explanation starts a fresh drawing. Model-selected extend
 * is reserved for an explicit addition or a link to an established object.
 * This avoids accumulating unrelated lessons when the teacher submits again. */
export function normalizeStandaloneReplacement(text, candidate) {
  candidate = normalizeStandaloneColour(text, candidate);
  if (!candidate || typeof candidate !== "object" || candidate.mode !== "extend"
    || !Array.isArray(candidate.objects) || !Array.isArray(candidate.connections)) return candidate;
  if (/\b(?:add|adding|include|including|also|another|additional|extra|more)\b/i.test(String(text))) return candidate;
  const names = new Set(candidate.objects.flatMap((object) => [object?.id, object?.label])
    .filter((value) => typeof value === "string").map((value) => value.toLowerCase().trim()));
  const selfContained = candidate.connections.every((edge) => edge && [edge.from, edge.to, edge.via]
    .filter((value) => value !== undefined).every((value) => typeof value === "string" && names.has(value.toLowerCase().trim())));
  return selfContained ? { ...candidate, mode: "replace" } : candidate;
}

/** Recover omitted colour only from an exact, unique colour-qualified label
 * present verbatim in positive source text. Never move adjectives between nouns. */
export function normalizeStandaloneColour(text, candidate) {
  if (!candidate || typeof candidate !== 'object' || candidate.mode !== 'replace'
    || !Number.isFinite(candidate.confidence) || candidate.confidence < 0.58
    || !Array.isArray(candidate.objects) || candidate.objects.length > 8) return candidate;
  const source = String(text).toLowerCase();
  if (source.length > 4000 || /[?]|\b(?:not|no|never|without|neither|nor|maybe|perhaps|if|unless|might|could|cannot)\b|n't/.test(source)) return candidate;
  const normalized = ` ${source.replace(/[^a-z]+/g, ' ').trim()} `;
  const labels = candidate.objects.map((object) => typeof object?.label === 'string'
    ? object.label.trim().toLowerCase().replace(/^(?:a|an|the) /, '') : '');
  // Orange is also a noun (orange juice/peel); don't infer its attribute here.
  let changed = false;
  const objects = candidate.objects.map((object, index) => {
    const label = labels[index];
    const match = /^(red|yellow|green|blue|purple|pink|brown|black|white|gray) ([a-z]+(?: [a-z]+){0,3})$/.exec(label);
    if (!object || object.color !== undefined || !match || labels.filter((value) => value === label).length !== 1
      || !normalized.includes(` ${label} `) || /\b(?:and|or)\b/.test(label)) return object;
    changed = true;
    return { ...object, color: match[1] };
  });
  return changed ? { ...candidate, objects } : candidate;
}
