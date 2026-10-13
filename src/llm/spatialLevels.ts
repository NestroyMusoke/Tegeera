import { spatialOrder } from "../doodlescript/spatialOrder";

/** Longest explicit vertical paths, independent of model coordinates/artwork.
 * Both bounds prune the slot search; cycles are contradictory, not relaxed. */
export function spatialLevels(objects: readonly { id: string }[], connections: readonly { from: string; to: string; label: string }[]) {
  const ids = new Map(objects.map((object, index) => [object.id, index]));
  const edges = connections.flatMap((connection) => {
    const order = spatialOrder(connection.label);
    const from = ids.get(connection.from), to = ids.get(connection.to);
    return order?.axis === "y" && from !== undefined && to !== undefined
      ? [order.sign === -1 ? [from, to] : [to, from]] : [];
  });
  const above = objects.map(() => 0), below = objects.map(() => 0);
  for (let pass = 0; pass < objects.length; pass += 1) {
    let changed = false;
    for (const [top, bottom] of edges) {
      if (above[bottom] < above[top] + 1) { above[bottom] = above[top] + 1; changed = true; }
      if (below[top] < below[bottom] + 1) { below[top] = below[bottom] + 1; changed = true; }
    }
    if (!changed) return { count: Math.max(1, ...above.map((value) => value + 1)), above, below };
  }
  if (edges.length) throw new Error("The spatial relationships cannot fit: the stated vertical relationships form a contradictory cycle.");
  return { count: 1, above, below };
}
