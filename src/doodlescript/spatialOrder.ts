/** Geometry implied by an explicit positional predicate, independent of nouns. */
export function spatialOrder(label: string): { axis: "x" | "y"; sign: -1 | 1 } | undefined {
  const words = label.toLowerCase().trim().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ");
  if (/^(?:above|over|on top of|directly above|directly over)$/.test(words)) return { axis: "y", sign: -1 };
  if (/^(?:beneath|below|under|underneath|directly beneath|directly below)$/.test(words)) return { axis: "y", sign: 1 };
  if (/^(?:left of|to the left of|on the left of)$/.test(words)) return { axis: "x", sign: -1 };
  if (/^(?:right of|to the right of|on the right of)$/.test(words)) return { axis: "x", sign: 1 };
  return undefined;
}
