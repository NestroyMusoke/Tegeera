import { describe, expect, it } from "vitest";
import {
  RELATION_REGISTRY_VERSION,
  relationCardinalityIssues,
  relationForKind,
  relationLabel,
  relationLexemes,
  matchRegisteredRelation,
  relationPredicateIsRegistered,
  relationSourceCapability,
  relationRegistry,
  relationSupportsVersion,
  validateRelationRegistry
} from "./relationRegistry";
import type { SceneRelation } from "./schema";

const relation = (kind: SceneRelation["kind"], overrides: Partial<SceneRelation> = {}): SceneRelation => ({
  id: "r-1", kind, sourceIds: ["source"], targetIds: ["target"], ...overrides
});

describe("versioned relation registry", () => {
  it("covers every schema relationship with a validated semantic contract", () => {
    expect(RELATION_REGISTRY_VERSION).toBe("2.11.0");
    expect(relationRegistry.map(({ kind }) => kind).sort()).toEqual([
      "accelerates", "actsOn", "appliedTo", "away", "before", "calls", "carries", "causes", "contacts", "contains", "evaporatesTo", "fallsFrom", "fallsTo", "flowsFrom", "flowsInto", "flowsTo", "handover", "illuminates", "infiltrates", "measures", "opposes", "owns", "partOf", "pumpsTo", "queuedFor", "resultsIn", "returnsControlTo", "returnsTo", "risesTo", "shares", "subtracts", "toward", "transformsTo", "visualAction"
    ]);
    expect(validateRelationRegistry()).toEqual([]);
  });

  it("owns forward and inverse event vocabulary as registry data", () => {
    expect(relationLexemes.find(({ predicate }) => predicate === "shares")?.words).toContain("sharing");
    expect(relationLexemes.find(({ predicate }) => predicate === "before")?.words).toContain("occurs before");
    expect(relationLexemes.find(({ predicate }) => predicate === "after")?.words).toContain("occurs after");
    expect(relationLexemes.find(({ predicate }) => predicate === "causes")?.words).toContain("results in");
    expect(relationLexemes.find(({ predicate }) => predicate === "toward")?.words).toContain("drives towards");
    expect(relationSourceCapability("toward", "drive")).toBe("drive");
    expect(relationPredicateIsRegistered("away", "walk")).toBe(true);
    expect(relationPredicateIsRegistered("toward", "fly")).toBe(false);
  });

  it("binds ordered-container roles through reusable registered templates", () => {
    expect(matchRegisteredRelation("three processes are waiting in the cpu ready queue")).toEqual({
      predicate: "queuedFor", sourceText: "three processes", targetText: "a cpu"
    });
    expect(matchRegisteredRelation("the cpu queue contains three processes")).toEqual({
      predicate: "queuedFor", sourceText: "three processes", targetText: "a cpu"
    });
    expect(matchRegisteredRelation("two students share a book")).toEqual({
      predicate: "shares", sourceText: "two students", targetText: "a book"
    });
  });

  it("binds directional roles and capability requirements as registry data", () => {
    expect(matchRegisteredRelation("a car drives towards a school")).toEqual({
      predicate: "toward", relationPredicate: "drive", sourceCapability: "drive",
      sourceText: "a car", targetText: "a school"
    });
    expect(matchRegisteredRelation("a student walks away from a tree")).toEqual({
      predicate: "away", relationPredicate: "walk", sourceCapability: "walk",
      sourceText: "a student", targetText: "a tree"
    });
    expect(matchRegisteredRelation("a ball approaches a wall")).toEqual({
      predicate: "toward", relationPredicate: "move", sourceCapability: undefined,
      sourceText: "a ball", targetText: "a wall"
    });
  });

  it("centralizes minimum versions and role cardinality", () => {
    expect(relationSupportsVersion("toward", "1.2.0")).toBe(false);
    expect(relationSupportsVersion("toward", "1.3.0")).toBe(true);
    expect(relationSupportsVersion("visualAction", "1.8.0")).toBe(false);
    expect(relationSupportsVersion("partOf", "1.9.0")).toBe(false);
    expect(relationSupportsVersion("partOf", "2.0.0")).toBe(true);
    expect(relationCardinalityIssues(relation("queuedFor", { sourceIds: ["a", "b", "c", "d", "e"] }))).toContain("waits in queue requires 1-4 source roles.");
    expect(relationCardinalityIssues(relation("handover"))).toContain("gives requires 1 object role.");
    expect(relationCardinalityIssues(relation("handover", { objectIds: ["object"] }))).toEqual([]);
  });

  it("provides static and predicate-aware readable labels", () => {
    expect(relationLabel(relation("toward"))).toBe("moves toward");
    expect(relationLabel(relation("toward", { predicate: "drive" }))).toBe("drives toward");
    expect(relationLabel(relation("away", { predicate: "walk" }))).toBe("walks away from");
    expect(relationLabel(relation("actsOn", { predicate: "point", preposition: "at" }))).toBe("point at");
    expect(relationLabel(relation("visualAction", { predicate: "absorb" }))).toBe("absorbs");
    expect(relationLabel(relation("flowsFrom"), "rivers")).toBe("flow from");
    expect(relationLabel(relation("flowsTo"), "river")).toBe("flows to");
    expect(relationForKind("causes")).toMatchObject({ family: "event", directed: true, layout: "event-graph" });
    expect(relationForKind("flowsInto")).toMatchObject({ family: "compositional", directed: true, layout: "part-whole-flow" });
    expect(relationForKind("contains")).toMatchObject({ family: "containment", directed: true, layout: "labelled-container" });
    expect(relationForKind("measures")).toMatchObject({ family: "measurement", directed: true, layout: "geometric-construction" });
    expect(relationForKind("flowsFrom")).toMatchObject({ family: "landscape", directed: true, layout: "landscape-flow" });
    expect(relationForKind("flowsTo")).toMatchObject({ family: "landscape", directed: true, layout: "landscape-flow" });
    expect(relationForKind("risesTo")).toMatchObject({ family: "kinematics", directed: true, layout: "changing-speed-motion" });
    expect(relationForKind("calls")).toMatchObject({ family: "control-flow", directed: true, layout: "call-return-flow" });
    expect(relationForKind("subtracts")).toMatchObject({ family: "arithmetic", directed: true, layout: "fraction-subtraction" });
    expect(relationForKind("evaporatesTo")).toMatchObject({ family: "hydrology", directed: true, layout: "water-cycle-loop" });
    expect(relationForKind("transformsTo")).toMatchObject({ family: "lifecycle", directed: true, layout: "lifecycle-sequence" });
  });

  it("rejects duplicate aliases, kinds, and invalid cardinalities", () => {
    const duplicate = { ...relationRegistry[0], target: { min: 2, max: 1 } };
    expect(validateRelationRegistry([...relationRegistry, duplicate])).toEqual(expect.arrayContaining([
      "Duplicate relation kind: shares",
      "Duplicate relation alias: share (shares, shares)",
      "Invalid target cardinality: shares"
    ]));
    const incompatible = relationRegistry.map((definition) => definition.kind === "shares"
      ? { ...definition, layout: "event-graph" as const } : definition);
    expect(validateRelationRegistry(incompatible)).toContain(
      "Layout family event-graph does not support relation family structural: shares"
    );
  });
});
