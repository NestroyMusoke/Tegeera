const tokens = (value) => String(value).toLowerCase().match(/[a-z]+/g) ?? [];
const singular = (value) => value.endsWith("ies") ? `${value.slice(0, -3)}y` : value.replace(/s$/, "");

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
  return { graphComplete: candidate.confidence >= 0.58 && !missingRoles.length && !missingLinks.length,
    roleCoverage: `${gold.roles.length - missingRoles.length}/${gold.roles.length}`,
    linkCoverage: `${gold.links.length - missingLinks.length}/${gold.links.length}`,
    missingRoles, missingLinks: missingLinks.map(([from, to]) => `${from} -> ${to}`) };
}
