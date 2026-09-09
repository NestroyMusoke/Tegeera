import { describe, expect, it } from "vitest";
import {
  LAYOUT_FAMILY_REGISTRY_VERSION,
  layoutFamilyFor,
  layoutFamilyRegistry,
  layoutFamilySupportsRelation,
  validateLayoutFamilyRegistry
} from "./layoutFamilyRegistry";

describe("versioned layout family registry", () => {
  it("declares every active visual grammar once", () => {
    expect(LAYOUT_FAMILY_REGISTRY_VERSION).toBe("1.0.0");
    expect(layoutFamilyRegistry.map(({ id }) => id).sort()).toEqual([
      "arrow", "contact", "event-graph", "group", "ownership", "queue", "visual-flow"
    ]);
    expect(validateLayoutFamilyRegistry()).toEqual([]);
  });

  it("owns topology, capacity, direction, and scoring policy", () => {
    expect(layoutFamilyFor("event-graph")).toMatchObject({
      topology: "ranked-dag", readingDirection: "left-to-right", maximumNodesPerRank: 3,
      movementWeight: 1, connectorCrossingPenalty: 10_000
    });
    expect(layoutFamilyFor("visual-flow").movementWeight).toBe(0.18);
    expect(layoutFamilySupportsRelation("contact", "performance")).toBe(true);
    expect(layoutFamilySupportsRelation("contact", "event")).toBe(false);
  });

  it("rejects duplicate families and unsafe limits or weights", () => {
    const invalid = { ...layoutFamilyRegistry[0], maximumVisibleNodes: 1, movementWeight: -1 };
    expect(validateLayoutFamilyRegistry([...layoutFamilyRegistry, invalid])).toEqual(expect.arrayContaining([
      "Duplicate layout family: group",
      "Invalid visible-node limit: group",
      "Invalid layout weight: group"
    ]));
  });
});
