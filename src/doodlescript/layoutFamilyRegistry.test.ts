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
    expect(LAYOUT_FAMILY_REGISTRY_VERSION).toBe("2.16.0");
    expect(layoutFamilyRegistry.map(({ id }) => id).sort()).toEqual([
      "arrow", "call-return-flow", "changing-speed-motion", "circulation-loop", "contact", "convergent-plates", "event-graph", "force-diagram", "fraction-subtraction", "geometric-construction", "group", "labelled-container", "landscape-flow", "lifecycle-sequence", "lifo-stack", "ordered-routine", "ownership", "part-whole-flow", "queue", "reflection-ray", "triangle-angle-sum", "visual-flow", "water-cycle-loop"
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
    expect(layoutFamilyFor("changing-speed-motion")).toMatchObject({ topology: "trajectory-profile", readingDirection: "bidirectional", maximumVisibleNodes: 3 });
    expect(layoutFamilyFor("call-return-flow")).toMatchObject({ topology: "control-transfer", readingDirection: "bidirectional", maximumVisibleNodes: 3 });
    expect(layoutFamilyFor("fraction-subtraction")).toMatchObject({ topology: "part-removal", readingDirection: "left-to-right", maximumVisibleNodes: 4 });
    expect(layoutFamilyFor("water-cycle-loop")).toMatchObject({ topology: "environmental-cycle", readingDirection: "bidirectional", maximumVisibleNodes: 5 });
    expect(layoutFamilyFor("lifecycle-sequence")).toMatchObject({ topology: "stage-sequence", readingDirection: "left-to-right", maximumVisibleNodes: 3 });
    expect(layoutFamilyFor("reflection-ray")).toMatchObject({ topology: "ray-reflection", readingDirection: "left-to-right", maximumVisibleNodes: 3 });
    expect(layoutFamilyFor("lifo-stack")).toMatchObject({ topology: "top-access-stack", maximumVisibleNodes: 3 });
    expect(layoutFamilyFor("triangle-angle-sum")).toMatchObject({ topology: "triangle-proof", maximumVisibleNodes: 3 });
    expect(layoutFamilyFor("convergent-plates")).toMatchObject({ topology: "plate-convergence", readingDirection: "bidirectional" });
    expect(layoutFamilyFor("ordered-routine")).toMatchObject({ topology: "routine-sequence", readingDirection: "left-to-right" });
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
