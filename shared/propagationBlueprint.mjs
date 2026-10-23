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
// A complete topology may have connected ordinary context; it then uses the
// general graph renderer, which retains all objects rather than the four-role rig.
export function propagationRoles(candidate) {
  const edges = candidate.connections ?? [];
  if (!edges.some((edge) => Object.hasOwn(propagationLabels, edge.kind))) return null;
  const fail = () => { throw new Error("Propagation needs replace mode and a complete four-role subgraph: source→payload emits, payload→medium propagatesThrough, payload→destination reaches (source→medium enters also supported). Additional context must be connected and untyped. If this mechanism is not stated, use truthful ordinary labels without propagation kinds; do not invent roles."); };
  if (candidate.mode !== "replace" || candidate.objects.length < 4 || candidate.objects.length > 8 || edges.length < 3 || edges.length > 12) fail();
  const one = (kind) => edges.filter((edge) => edge.kind === kind);
  if (["propagatesThrough", "reaches"].some((kind) => one(kind).length !== 1)) fail();
  const through = one("propagatesThrough")[0], reaches = one("reaches")[0];
  if (reaches.from !== through.from) {
    throw new Error(`Propagation reaches must start at the travelling payload ${through.from}, not ${reaches.from}. Keep the medium ${through.to} separate from that payload.`);
  }
  const origins = edges.filter((edge) => edge !== through && edge !== reaches && (
    edge.kind === "enters" && edge.to === through.to
    || edge.to === through.from && /^(?:emits|sends|generates|causes)$/.test(edge.label?.toLowerCase().trim() ?? "")
      && (!edge.kind || ["relatesTo", "emits", "causes"].includes(edge.kind))));
  if (origins.length > 1) {
    throw new Error(`Propagation has ${origins.length} competing origin links. Use exactly ONE source→payload emits OR source→medium enters link, not both. Preserve every distinct stated action using truthful ordinary labels if the specialist topology cannot express it; never invent or silently drop a source.`);
  }
  if (origins.length !== 1) fail();
  const origin = origins[0];
  const feedsMedium = origin.kind === "enters" && origin.to === through.to;
  const emitsPayload = origin.to === through.from && /^(?:emits|sends|generates|causes)$/.test(origin.label?.toLowerCase().trim() ?? "")
    && (!origin.kind || ["relatesTo", "emits", "causes"].includes(origin.kind));
  if (!feedsMedium && !emitsPayload) fail();
  const roles = { source: origin.from, medium: through.to, payload: through.from, destination: reaches.to };
  if (reaches.from !== roles.payload || new Set(Object.values(roles)).size !== 4
    || Object.values(roles).some((id) => !candidate.objects.some((object) => object.id === id))) fail();
  const context = edges.filter((edge) => edge !== origin && edge !== through && edge !== reaches);
  // Do not combine unrelated specialist layouts, hide duplicate propagation
  // claims, or strip a type to bypass validation. Context must be ordinary.
  if (context.some((edge) => edge.via !== undefined || edge.kind && edge.kind !== "relatesTo")) fail();
  const known = new Set(candidate.objects.map((object) => object.id));
  if (edges.some((edge) => !known.has(edge.from) || !known.has(edge.to) || edge.from === edge.to)) fail();
  const connected = new Set(Object.values(roles));
  for (let pass = 0; pass < candidate.objects.length; pass++) {
    for (const edge of context) {
      if (connected.has(edge.from)) connected.add(edge.to);
      if (connected.has(edge.to)) connected.add(edge.from);
    }
  }
  if (candidate.objects.some((object) => !connected.has(object.id))) fail();
  return roles;
}
