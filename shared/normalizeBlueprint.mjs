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
