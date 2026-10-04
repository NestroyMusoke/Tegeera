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
  if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.connections)) return candidate;
  let changed = false;
  const connections = candidate.connections.map((edge) => {
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
