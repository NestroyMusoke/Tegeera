import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";
import type { SceneState } from "./schema";

function run(text: string, scene = initialScene): SceneState {
  const interpreted = interpretTeacherText(text, scene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const checked = validateDoodleScript(interpreted.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("conversation continuity", () => {
  it("uses an explicitly highlighted subject in the next clause", () => {
    const scene = run("Three students. Highlight the second student. She owns a book");
    expect(scene.relations?.[0].sourceIds).toEqual(["student-2"]);
  });
  it("changes the discussed student count without changing books or original positions", () => {
    const before = run("Three students share two books");
    const after = run("Make that four students", before);
    expect(after.entities).toHaveLength(6);
    expect(after.relations?.[0].sourceIds).toEqual(["student-1", "student-2", "student-3", "student-4"]);
    expect(after.relations?.[0].targetIds).toEqual(["book-1", "book-2"]);
    for (const entity of before.entities) expect(after.entities.find((item) => item.id === entity.id)).toEqual(entity);
  });

  it("reduces the discussed group while retaining surviving identities", () => {
    const after = run("Make that two", run("Three students share two books"));
    expect(after.relations?.[0].sourceIds).toEqual(["student-1", "student-2"]);
    expect(after.context?.subjectIds).toEqual(["student-1", "student-2"]);
    expect(after.entities.some((entity) => entity.id === "student-3")).toBe(false);
  });

  it("corrects the resource count separately from its participants", () => {
    const after = run("Change that to three books", run("Three students share two books"));
    expect(after.relations?.[0].sourceIds).toHaveLength(3);
    expect(after.relations?.[0].targetIds).toHaveLength(3);
  });

  it("does not multiply a personal owner", () => {
    const scene = run("A student owns a book");
    expect(interpretTeacherText("Make that four students", scene).ok).toBe(false);
  });

  it("rejects overflow and unsupported counts atomically", () => {
    const scene = run("Three students share two books");
    const saved = structuredClone(scene);
    for (const text of ["Make that zero", "Make that 100", "Make that ten students", "Make that four dragons"]) {
      expect(interpretTeacherText(text, scene).ok, text).toBe(false);
      expect(scene).toEqual(saved);
    }
  });

  it("remembers the arriving subject even though her book was created last", () => {
    const scene = run("Three students share two books. Another student arrives with her own book");
    const result = run("She gives her book to the first student", scene);
    expect(result.entities).toEqual(scene.entities);
    expect(result.relations?.find((relation) => relation.kind === "shares")).toEqual(scene.relations?.[0]);
    expect(result.relations?.find((relation) => relation.kind === "owns")).toMatchObject({ sourceIds: ["student-1"], targetIds: ["book-3"] });
  });

  it("keeps an owner's other books when one is transferred", () => {
    const scene = run("A student owns two books. Add a teacher");
    const result = run("The student gives the first book to the teacher", scene);
    expect(result.entities).toEqual(scene.entities);
    expect(result.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceIds: ["student-1"], targetIds: ["book-2"] }),
      expect.objectContaining({ sourceIds: ["teacher-1"], targetIds: ["book-1"] })
    ]));
  });

  it("does not steal shared objects or invent a giver's ownership", () => {
    const shared = run("Two students share a book");
    expect(interpretTeacherText("The first student gives the book to the second student", shared).ok).toBe(false);
    const owned = run("A student owns a book. Add a teacher");
    expect(interpretTeacherText("The teacher gives the book to the student", owned).ok).toBe(false);
  });

  it("asks which book when the subject owns more than one", () => {
    const scene = run("A teacher. Another student arrives. She owns two books");
    expect(interpretTeacherText("She gives her book to the teacher", scene).ok).toBe(false);
  });

  it("resolves plural subjects without creating duplicate people", () => {
    const result = run("They share two books", run("Three students"));
    expect(result.entities).toHaveLength(5);
    expect(run("Highlight them", result).entities.filter((entity) => entity.highlighted)).toHaveLength(3);
  });

  it("rejects singular pronouns after a group", () => {
    expect(interpretTeacherText("She owns a book", run("Three students")).ok).toBe(false);
  });

  it("clear removes context and old scene snapshots retain their context for undo", () => {
    const before = run("A student owns a book");
    const after = run("Clear everything", before);
    expect(after.context).toEqual({ subjectIds: [], objectIds: [] });
    expect(interpretTeacherText("She owns a book", after).ok).toBe(false);
    expect(run("She owns a car", before).entities).toHaveLength(3);
  });

  it("does not mutate a scene when a later clause invalidates a transfer", () => {
    const before = run("A student owns a book. Add a teacher");
    const saved = structuredClone(before);
    expect(interpretTeacherText("The student gives the book to the teacher. A dragon flies", before).ok).toBe(false);
    expect(before).toEqual(saved);
  });
});

describe("context schema gates", () => {
  it("rejects missing context references and unsupported version extensions", () => {
    const script = { schemaVersion: "1.2.0", sceneId: "welcome", revision: 1, confidence: 1, sourceText: "clear", commands: [{ action: "clear" }], context: { subjectIds: ["missing"], objectIds: [] } };
    expect(validateDoodleScript(script, initialScene).ok).toBe(false);
    expect(validateDoodleScript({ ...script, schemaVersion: "1.1.0", context: { subjectIds: [], objectIds: [] } }, initialScene).ok).toBe(false);
  });

  it("rejects a second personal owner even for externally supplied scripts", () => {
    const scene = run("A student owns a book. Add a teacher");
    const script = { schemaVersion: "1.2.0", sceneId: scene.sceneId, revision: scene.revision + 1, confidence: 1, sourceText: "ownership", commands: [{ action: "relate", relation: { id: "conflicting", kind: "owns", sourceIds: ["teacher-1"], targetIds: ["book-1"] } }] };
    expect(validateDoodleScript(script, scene).ok).toBe(false);
  });
});
