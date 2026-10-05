/** Geometry implied by an explicit positional predicate, independent of nouns. */
export function spatialOrder(label: string): { axis: "x" | "y"; sign: -1 | 1 } | undefined {
  const words = label.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim()
    .replace(/[^a-z ]/g, " ").replace(/\s+/g, " ");
  if (/^(?:above|over|on top of|directly above|directly over)$/.test(words)) return { axis: "y", sign: -1 };
  if (/^(?:beneath|below|under|underneath|directly beneath|directly below)$/.test(words)) return { axis: "y", sign: 1 };
  if (/^(?:left of|to the left of|on the left of)$/.test(words)) return { axis: "x", sign: -1 };
  if (/^(?:right of|to the right of|on the right of)$/.test(words)) return { axis: "x", sign: 1 };
  // Motion verbs can constrain the destination even when the model gives
  // contradictory coordinates ("steam rises from a cup").
  if (/^(?:rises?|ascends?) from$/.test(words)) return { axis: "y", sign: -1 };
  if (/^(?:falls?|descends?|drops?) from$/.test(words)) return { axis: "y", sign: 1 };
  // A model may include the action in a spatial predicate ("passes beneath")
  // instead of returning the bare preposition. Preserve the same geometry.
  if (/\b(?:beneath|below|under|underneath)$/.test(words)) return { axis: "y", sign: 1 };
  if (/\b(?:above|over)$/.test(words)) return { axis: "y", sign: -1 };
  return undefined;
}

/** Symmetric position is a connection, not a flow of matter or action. */
export function isPositionalRelation(label: string): boolean {
  const words = label.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim()
    .replace(/[^a-z ]/g, " ").replace(/\s+/g, " ");
  // An upward/downward journey has an ordered endpoint and still needs an
  // arrow; it is not a static "above" or "below" relation.
  if (/^(?:rises?|ascends?|falls?|descends?|drops?) from$/.test(words)) return false;
  return Boolean(spatialOrder(label)) || /^(?:beside|next to|adjacent to|alongside)$/.test(words);
}
