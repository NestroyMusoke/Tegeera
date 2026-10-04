/** Geometry implied by an explicit positional predicate, independent of nouns. */
export function spatialOrder(label: string): { axis: "x" | "y"; sign: -1 | 1 } | undefined {
  const words = label.toLowerCase().trim().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ");
  if (/^(?:above|over|on top of|directly above|directly over)$/.test(words)) return { axis: "y", sign: -1 };
  if (/^(?:beneath|below|under|underneath|directly beneath|directly below)$/.test(words)) return { axis: "y", sign: 1 };
  if (/^(?:left of|to the left of|on the left of)$/.test(words)) return { axis: "x", sign: -1 };
  if (/^(?:right of|to the right of|on the right of)$/.test(words)) return { axis: "x", sign: 1 };
  // A model may include the action in a spatial predicate ("passes beneath")
  // instead of returning the bare preposition. Preserve the same geometry.
  if (/\b(?:beneath|below|under|underneath)$/.test(words)) return { axis: "y", sign: 1 };
  if (/\b(?:above|over)$/.test(words)) return { axis: "y", sign: -1 };
  return undefined;
}

/** Symmetric position is a connection, not a flow of matter or action. */
export function isPositionalRelation(label: string): boolean {
  const words = label.toLowerCase().trim().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ");
  return Boolean(spatialOrder(label)) || /^(?:beside|next to|adjacent to|alongside)$/.test(words);
}
