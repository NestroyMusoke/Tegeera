import { describe, expect, it } from "vitest";
import { isPositionalRelation, spatialOrder } from "./spatialOrder";

describe("embedded spatial predicates", () => {
  it("keeps the mover below the object it passes beneath", () => {
    expect(spatialOrder("passes beneath")).toEqual({ axis: "y", sign: 1 });
    expect(spatialOrder("flows under")).toEqual({ axis: "y", sign: 1 });
    expect(spatialOrder("flies above")).toEqual({ axis: "y", sign: -1 });
    expect(spatialOrder("floatsAbove")).toEqual({ axis: "y", sign: -1 });
    expect(isPositionalRelation("floatsAbove")).toBe(true);
  });

  it("does not invent a positional rule for route or causal verbs", () => {
    expect(spatialOrder("turns around")).toBeUndefined();
    expect(spatialOrder("empties into")).toBeUndefined();
    expect(spatialOrder("slows down")).toBeUndefined();
  });

  it("positions upward and downward motion without hiding its arrow", () => {
    expect(spatialOrder("rises from")).toEqual({ axis: "y", sign: -1 });
    expect(spatialOrder("fallsFrom")).toEqual({ axis: "y", sign: 1 });
    expect(isPositionalRelation("rises from")).toBe(false);
  });

  it("marks symmetric neighbors as undirected position, not movement", () => {
    for (const phrase of ["beside", "next to", "adjacent to", "alongside", "hangs beside", "waits beside", "stands next to"]) {
      expect(spatialOrder(phrase)).toBeUndefined();
      expect(isPositionalRelation(phrase)).toBe(true);
    }
    expect(isPositionalRelation("empties into")).toBe(false);
  });
});
