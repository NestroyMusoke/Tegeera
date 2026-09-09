import { describe, expect, it } from "vitest";
import {
  CONCEPT_REGISTRY_VERSION,
  conceptForAlias,
  conceptForKind,
  conceptRegistry,
  conceptSupports,
  validateConceptRegistry
} from "./conceptRegistry";
import type { EntityKind } from "./schema";
import { parseEntityPhrase } from "./lexicon";

describe("versioned concept registry", () => {
  it("covers every entity kind with a matching renderer key", () => {
    const kinds: EntityKind[] = ["person", "teacher", "student", "process", "cpu", "car", "book", "desk", "tree", "building", "generic"];
    expect(CONCEPT_REGISTRY_VERSION).toBe("1.0.0");
    expect(conceptRegistry.map(({ kind }) => kind).sort()).toEqual([...kinds].sort());
    for (const kind of kinds) expect(conceptForKind(kind).glyphKey).toBe(kind);
    expect(validateConceptRegistry()).toEqual([]);
  });

  it("resolves singular, plural, and aliases from data", () => {
    expect(conceptForAlias("student")?.kind).toBe("student");
    expect(conceptForAlias("students")?.kind).toBe("student");
    expect(conceptForAlias("Learner")?.kind).toBe("student");
    expect(conceptForAlias("tables")?.kind).toBe("desk");
  });

  it("keeps semantic capabilities independent of kind conditionals", () => {
    expect(conceptSupports("teacher", "human-performance")).toBe(true);
    expect(conceptSupports("student", "walk")).toBe(true);
    expect(conceptSupports("car", "drive")).toBe(true);
    expect(conceptSupports("book", "drive")).toBe(false);
    expect(conceptSupports("process", "queue-member")).toBe(true);
    expect(conceptSupports("cpu", "queue-target")).toBe(true);
  });

  it("carries registry identity and category through noun parsing", () => {
    expect(parseEntityPhrase("two learners")).toMatchObject({
      kind: "student",
      conceptId: "student",
      category: "actor",
      count: 2
    });
    expect(parseEntityPhrase("a table")).toMatchObject({
      kind: "desk",
      conceptId: "desk",
      category: "furniture",
      count: 1
    });
  });

  it("rejects duplicate aliases, kinds, ids, and mismatched glyph keys", () => {
    const duplicate = { ...conceptRegistry[0], glyphKey: "generic" as const };
    const issues = validateConceptRegistry([...conceptRegistry, duplicate]);
    expect(issues).toEqual(expect.arrayContaining([
      "Duplicate concept id: person",
      "Duplicate concept kind: person",
      "Concept glyph does not match schema kind: person",
      "Duplicate concept alias: person (person, person)"
    ]));
  });
});
