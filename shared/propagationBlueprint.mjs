export const propagationLabels = Object.freeze({ emits: "emits", enters: "enters", propagatesThrough: "propagates through", reaches: "reaches" });

export function normalizePropagationLabels(candidate) {
  if (!candidate || !Array.isArray(candidate.connections)) return candidate;
  return { ...candidate, connections: candidate.connections.map((edge) => {
    // A spelling alias, not permission to change relationship meaning.
    if (edge?.kind === "propagatesThrough" && typeof edge.label === "string" && /^propagates\s*through$/i.test(edge.label.trim())) {
      return { ...edge, label: propagationLabels.propagatesThrough };
    }
    return edge;
  }) };
}

// Shared by service and browser: a partial topology must never become a diagram.
export function propagationRoles(candidate) {
  const edges = candidate.connections ?? [];
  if (!edges.some((edge) => Object.hasOwn(propagationLabels, edge.kind))) return null;
  const fail = () => { throw new Error("Propagation needs replace mode, four distinct roles, and exactly source→payload emits, payload→medium propagatesThrough, payload→destination reaches links (source→medium enters is also supported)."); };
  if (candidate.mode !== "replace" || candidate.objects.length !== 4 || edges.length !== 3) fail();
  const one = (kind) => edges.filter((edge) => edge.kind === kind);
  if (["propagatesThrough", "reaches"].some((kind) => one(kind).length !== 1)) fail();
  const through = one("propagatesThrough")[0], reaches = one("reaches")[0];
  if (reaches.from !== through.from) {
    throw new Error(`Propagation reaches must start at the travelling payload ${through.from}, not ${reaches.from}. Keep the medium ${through.to} separate from that payload.`);
  }
  const origin = edges.find((edge) => edge !== through && edge !== reaches);
  const feedsMedium = origin.kind === "enters" && origin.to === through.to;
  const emitsPayload = origin.to === through.from && /^(?:emits|sends|generates|causes)$/.test(origin.label?.toLowerCase().trim() ?? "")
    && (!origin.kind || ["relatesTo", "emits", "causes"].includes(origin.kind));
  if (!feedsMedium && !emitsPayload) fail();
  const roles = { source: origin.from, medium: through.to, payload: through.from, destination: reaches.to };
  if (reaches.from !== roles.payload || new Set(Object.values(roles)).size !== 4
    || Object.values(roles).some((id) => !candidate.objects.some((object) => object.id === id))) fail();
  return roles;
}
