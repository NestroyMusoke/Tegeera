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
    expect(LAYOUT_FAMILY_REGISTRY_VERSION).toBe("2.6.0");
    expect(layoutFamilyRegistry.map(({ id }) => id).sort()).toEqual([
      "arrow", "circulation-loop", "contact", "event-graph", "force-diagram", "geometric-construction", "group", "labelled-container", "landscape-flow", "ownership", "part-whole-flow", "queue", "visual-flow"
    ]);
    expect(validateLayoutFamilyRegistry()).toEqual([]);
  });

  it("owns topology, capacity, direction, and scoring policy", () => {
    expect(layoutFamilyFor("event-graph")).toMatchObject({
      topology: "ranked-dag", readingDirection: "left-to-right", maximumNodesPerRank: 3,
      movementWeight: 1, connectorCrossingPenalty: 10_000
    });
    expect(layoutFamilyFor("visual-flow").movementWeight).toBe(0.18);
    expect(layoutFamilyFor("part-whole-flow")).toMatchObject({ topology: "part-whole", maximumVisibleNodes: 7 });
    expect(layoutFamilyFor("labelled-container")).toMatchObject({ topology: "nested-container", maximumVisibleNodes: 2 });
    expect(layoutFamilyFor("geometric-construction")).toMatchObject({ topology: "angular-construction", maximumVisibleNodes: 2 });
    expect(layoutFamilyFor("landscape-flow")).toMatchObject({ topology: "elevation-cross-section", maximumVisibleNodes: 3 });
    expect(layoutFamilyFor("circulation-loop")).toMatchObject({ topology: "closed-loop", readingDirection: "bidirectional", maximumVisibleNodes: 4 });
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
