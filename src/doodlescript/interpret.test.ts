import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";
import type { DoodleScript, SceneState } from "./schema";

function run(text: string, scene = initialScene): SceneState {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const validated = validateDoodleScript(result.script, scene);
  if (!validated.ok) throw new Error(JSON.stringify(validated.issues));
  return applyDoodleScript(scene, validated.script);
}

describe("explanation meaning", () => {
  it("keeps shared books separate from an arriving student's own book", () => {
    const shared = run("Three students share two books.");
    const next = run("Another student arrives, but she already has her own book.", shared);
    expect(next.entities.filter((item) => item.kind === "student")).toHaveLength(4);
    expect(next.entities.filter((item) => item.kind === "book")).toHaveLength(3);
    expect(next.relations).toEqual([
      ...shared.relations!,
      expect.objectContaining({ kind: "owns", sourceIds: ["student-4"], targetIds: ["book-3"] })
    ]);
    for (const entity of shared.entities) expect(next.entities.find((item) => item.id === entity.id)).toEqual(entity);
  });

  it("composes a multi-sentence explanation through the same interpreter", () => {
    const scene = run("Three students share two books. Another student arrives with her own book.");
    expect(scene.entities).toHaveLength(7);
    expect(scene.relations?.map((relation) => relation.kind)).toEqual(["shares", "owns"]);
  });

  for (const people of ["students", "learners", "teachers", "people"]) {
    for (const objects of ["books", "cars", "houses"]) {
      it(`composes ${people} sharing ${objects}`, () => {
        const scene = run(`Two ${people} share three ${objects}`);
        expect(scene.entities).toHaveLength(5);
        expect(scene.relations?.[0]).toMatchObject({ kind: "shares", sourceIds: expect.any(Array), targetIds: expect.any(Array) });
        expect(scene.relations?.[0].sourceIds).toHaveLength(2);
        expect(scene.relations?.[0].targetIds).toHaveLength(3);
      });
    }
  }

  it("does not silently ignore negation, conditions, unknown actions or objects", () => {
    for (const text of ["Don't clear everything", "If I say clear everything", "A car explodes", "Three students share two planets", "Draw a car and a dragon", "Two students do not each own two books", "Move the car left and delete the tree"]) {
      expect(interpretTeacherText(text, initialScene).ok, text).toBe(false);
    }
  });

  it("rolls back the entire explanation when a later clause is unsupported", () => {
    const before = structuredClone(initialScene);
    expect(interpretTeacherText("Draw a car. A dragon flies away", initialScene).ok).toBe(false);
    expect(initialScene).toEqual(before);
  });

  it("resolves ordinal references and preserves unrelated entities", () => {
    const before = run("Three students");
    const after = run("Highlight the second student", before);
    expect(after.entities.map((entity) => entity.highlighted)).toEqual([false, true, false]);
    expect(interpretTeacherText("Remove the student", before).ok).toBe(false);
    expect(interpretTeacherText("Move the car right", before).ok).toBe(false);
    expect(interpretTeacherText("Move it right", before).ok).toBe(false);
  });

  it("removes relationship references when an object is removed", () => {
    const scene = run("A student owns a book");
    expect(run("Remove the book", scene).relations).toEqual([]);
  });

  it("does not substitute a smaller count or silently truncate", () => {
    for (const text of ["Draw 100 students", "Draw zero students", "Draw students"]) {
      expect(interpretTeacherText(text, initialScene).ok).toBe(false);
    }
  });

  it("uses deterministic IDs and layout", () => {
    expect(run("Two students and two books")).toEqual(run("Two students and two books"));
  });
});

describe("resulting-scene gates", () => {
  it("rejects long labels that would leave the canvas", () => {
    const scene = run("A student");
    const result = interpretTeacherText("Rename the student to a very long label that does not fit in this space", scene);
    if (!result.ok) throw new Error(result.message);
    expect(validateDoodleScript(result.script, scene).ok).toBe(false);
  });
  it("rejects movement that would overlap an existing object", () => {
    const scene = run("Two students");
    const result = interpretTeacherText("Move the first student right", scene);
    expect(result.ok).toBe(true);
    if (result.ok) expect(validateDoodleScript(result.script, scene)).toMatchObject({ ok: false, issues: expect.arrayContaining([expect.objectContaining({ gate: "layout" })]) });
  });

  it("validates clear-then-create against the final scene", () => {
    const scene = run("A car");
    const result = run("Clear everything. Draw a car", scene);
    expect(result.entities).toHaveLength(1);
  });

  it("rejects stale revisions and broken relationships", () => {
    const result = interpretTeacherText("A student owns a book", initialScene);
    if (!result.ok) throw new Error(result.message);
    expect(validateDoodleScript({ ...result.script, revision: 0 }, initialScene).ok).toBe(false);
    const broken: DoodleScript = { ...result.script, commands: [{ action: "relate", relation: { id: "bad", kind: "owns", sourceIds: ["missing"], targetIds: ["book"] } }] };
    expect(validateDoodleScript(broken, initialScene).ok).toBe(false);
  });

  it("still reads legacy version 1.0 scripts", () => {
    expect(validateDoodleScript({ schemaVersion: "1.0.0", sceneId: "legacy", revision: 1, confidence: 1, sourceText: "clear", commands: [{ action: "clear" }] }, initialScene).ok).toBe(true);
  });
});
