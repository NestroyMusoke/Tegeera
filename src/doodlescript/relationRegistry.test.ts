import { describe, expect, it } from "vitest";
import {
  RELATION_REGISTRY_VERSION,
  relationCardinalityIssues,
  relationForKind,
  relationLabel,
  relationLexemes,
  matchRegisteredRelation,
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
    expect(RELATION_REGISTRY_VERSION).toBe("1.0.0");
    expect(relationRegistry.map(({ kind }) => kind).sort()).toEqual([
      "actsOn", "away", "before", "causes", "handover", "owns", "queuedFor", "shares", "toward", "visualAction"
    ]);
    expect(validateRelationRegistry()).toEqual([]);
  });

  it("owns forward and inverse event vocabulary as registry data", () => {
    expect(relationLexemes.find(({ predicate }) => predicate === "shares")?.words).toContain("sharing");
    expect(relationLexemes.find(({ predicate }) => predicate === "before")?.words).toContain("occurs before");
    expect(relationLexemes.find(({ predicate }) => predicate === "after")?.words).toContain("occurs after");
    expect(relationLexemes.find(({ predicate }) => predicate === "causes")?.words).toContain("results in");
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

  it("centralizes minimum versions and role cardinality", () => {
    expect(relationSupportsVersion("toward", "1.2.0")).toBe(false);
    expect(relationSupportsVersion("toward", "1.3.0")).toBe(true);
    expect(relationSupportsVersion("visualAction", "1.8.0")).toBe(false);
    expect(relationCardinalityIssues(relation("queuedFor", { sourceIds: ["a", "b", "c", "d", "e"] }))).toContain("waits in queue requires 1-4 source roles.");
    expect(relationCardinalityIssues(relation("handover"))).toContain("gives requires 1 object role.");
    expect(relationCardinalityIssues(relation("handover", { objectIds: ["object"] }))).toEqual([]);
  });

  it("provides static and predicate-aware readable labels", () => {
    expect(relationLabel(relation("toward"))).toBe("moves toward");
    expect(relationLabel(relation("actsOn", { predicate: "point", preposition: "at" }))).toBe("point at");
    expect(relationLabel(relation("visualAction", { predicate: "absorb" }))).toBe("absorbs");
    expect(relationForKind("causes")).toMatchObject({ family: "event", directed: true, layout: "event-graph" });
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
