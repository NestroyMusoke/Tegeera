import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function run(text: string, scene = initialScene) {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const checked = validateDoodleScript(result.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("individual versus shared quantities", () => {
  for (const phrase of ["Three students each have two books", "Three students have two books each", "Three learners each own two books"]) {
    it(phrase, () => {
      const scene = run(phrase);
      expect(scene.entities.filter((entity) => entity.kind === "student")).toHaveLength(3);
      expect(scene.entities.filter((entity) => entity.kind === "book")).toHaveLength(6);
      expect(scene.relations).toHaveLength(3);
      scene.relations?.forEach((relation, index) => {
        expect(relation.kind).toBe("owns");
        expect(relation.sourceIds).toEqual([`student-${index + 1}`]);
        expect(relation.targetIds).toHaveLength(2);
      });
      expect(new Set(scene.relations?.flatMap((relation) => relation.targetIds)).size).toBe(6);
    });
  }
  it("does not multiply shared resources", () => {
    const scene = run("Three students share two books");
    expect(scene.entities).toHaveLength(5);
    expect(scene.relations).toHaveLength(1);
    expect(scene.relations?.[0].kind).toBe("shares");
  });
  for (const phrase of ["They each have a book", "The students have a book each"]) {
    it(`uses existing participants: ${phrase}`, () => {
      const before = run("Three students");
      const after = run(phrase, before);
      expect(after.entities).toHaveLength(6);
      expect(after.entities.slice(0, 3)).toEqual(before.entities);
      expect(after.context?.subjectIds).toEqual(before.context?.subjectIds);
    });
  }
  it("transfers only the specified owner's item and preserves its identity", () => {
    const before = run("Three students each have a book");
    const after = run("The first student gives book 1 to the second student", before);
    expect(after.entities).toEqual(before.entities);
    expect(after.relations?.find((relation) => relation.targetIds.includes("book-1"))?.sourceIds).toEqual(["student-2"]);
    expect(after.relations?.find((relation) => relation.targetIds.includes("book-3"))?.sourceIds).toEqual(["student-3"]);
    expect(before.relations?.[0].sourceIds).toEqual(["student-1"]);
  });
  it("rejects ambiguous collective possession", () => {
    expect(interpretTeacherText("Three students have two books", initialScene).ok).toBe(false);
  });
  it("rejects unsupported distribution and overflow without mutating the previous scene", () => {
    const before = run("A tree");
    const saved = structuredClone(before);
    for (const phrase of ["Four students each have two books", "Three students each have zero books", "Three students each have a dragon", "Three students each share two books", "Three students each have a book and fly"]) {
      expect(interpretTeacherText(phrase, before).ok, phrase).toBe(false);
      expect(before).toEqual(saved);
    }
  });
  it("requires an identified homogeneous group", () => {
    expect(interpretTeacherText("They each have a book", initialScene).ok).toBe(false);
    expect(interpretTeacherText("They each have a book", run("A teacher and a student")).ok).toBe(false);
    expect(interpretTeacherText("The students each have a book", run("A tree")).ok).toBe(false);
  });
  it("does not guess how to redistribute an existing group's possessions", () => {
    const scene = run("Three students each have a book");
    expect(interpretTeacherText("Make that four students", scene).ok).toBe(false);
    expect(interpretTeacherText("Change that to two books", scene).ok).toBe(false);
  });
});
