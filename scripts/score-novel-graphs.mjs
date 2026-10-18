const tokens = (value) => String(value).toLowerCase().match(/[a-z]+/g) ?? [];
const singular = (value) => value.endsWith("ies") ? `${value.slice(0, -3)}y` : value.replace(/s$/, "");
const predicate = (value) => String(value ?? "").trim().toLowerCase().replace(/[.!]+$/, "").replace(/\s+/g, " ");

/** Strict role and directed-endpoint coverage; not predicate or visual approval. */
export function scoreNovelGraph(gold, candidate) {
  const roles = new Map();
  const used = new Set();
  for (const role of gold.roles) {
    const target = tokens(role).map(singular);
    const available = candidate.objects.filter((object) => !used.has(object.id));
    // Prefer an exact visible role over a qualified sibling ("bee" versus
    // "second bee", "hive" versus "hive entrance"). Partial matching is
    // only safe when exactly one candidate remains.
    const exact = available.filter((object) => tokens(object.label).map(singular).join(" ") === target.join(" "));
    const matches = exact.length ? exact : available.filter((object) =>
      target.every((word) => tokens(object.label).map(singular).includes(word)));
    if (matches.length === 1) { roles.set(role, matches[0].id); used.add(matches[0].id); }
  }
  const missingRoles = gold.roles.filter((role) => !roles.has(role));
  const missingLinks = gold.links.filter(([from, to]) => !candidate.connections.some((edge) =>
    edge.from === roles.get(from) && edge.to === roles.get(to)));
  const graphComplete = candidate.confidence >= 0.58 && !missingRoles.length && !missingLinks.length;
  // Expectations live only in the evaluation corpus. Do not infer synonyms,
  // strip negation, or let a correct kind hide a contradictory visible label.
  const expected = gold.relations ?? [];
  const missingRelations = expected.filter((relation) => {
    const edges = candidate.connections.filter((edge) => edge.from === roles.get(relation.from) && edge.to === roles.get(relation.to));
    const allowed = relation.labels.map(predicate);
    const pairAllowed = expected.filter((other) => other.from === relation.from && other.to === relation.to).flatMap((other) => other.labels.map(predicate));
    return !edges.some((edge) => allowed.includes(predicate(edge.label)))
      || edges.some((edge) => !pairAllowed.includes(predicate(edge.label)));
  });
  const relationComplete = expected.length ? missingRelations.length === 0 : null;
  return { graphComplete,
    relationComplete, semanticComplete: relationComplete === null ? null : graphComplete && relationComplete,
    relationCoverage: expected.length ? `${expected.length - missingRelations.length}/${expected.length}` : "not checked",
    missingRelations: missingRelations.map(({ from, to, labels }) => ({ from, to, expectedLabels: labels })),
    roleCoverage: `${gold.roles.length - missingRoles.length}/${gold.roles.length}`,
    linkCoverage: `${gold.links.length - missingLinks.length}/${gold.links.length}`,
    missingRoles, missingLinks: missingLinks.map(([from, to]) => `${from} -> ${to}`) };
}
