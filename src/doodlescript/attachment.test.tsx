import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import type { DoodleScript, SceneState } from "./schema";
import { analyzeTeacherInput } from "./semanticFrame";
import { validateDoodleScript } from "./validator";

function interpret(text: string, scene = initialScene): DoodleScript {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  return result.script;
}

function run(text: string, scene = initialScene): SceneState {
  const script = interpret(text, scene);
  const checked = validateDoodleScript(script, scene);
  if (!checked.ok) throw new Error(`${text}: ${JSON.stringify(checked.issues)}`);
  return applyDoodleScript(scene, checked.script);
}

describe("identity-preserving attachments", () => {
  it("extracts hold and carry through reusable direct-object action syntax", () => {
    for (const [text, predicate] of [["A student holds a book", "hold"], ["A teacher is carrying a book", "carry"]]) {
      const frame = analyzeTeacherInput(text).frames[0];
      expect(frame.actions[0]).toMatchObject({ predicate, phase: "start" });
      expect(frame.actions[0].targetMentionIds).toEqual([frame.entities[1].mentionId]);
    }
  });

  it("holds one real object at the hand and exposes attachment identity", () => {
    const scene = run("A teacher holds a book");
    expect(scene.entities.map((item) => item.id)).toEqual(["teacher-1", "book-1"]);
    expect(scene.relations).toEqual([expect.objectContaining({ predicate: "hold", targetIds: ["book-1"] })]);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain('data-attached-to="teacher-1"');
    expect(html).toContain("holds →");
  });

  it("synchronizes a carried object's motion class with the walking carrier", () => {
    const scene = run("A student carries a book");
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain("character-rig motion-walk is-moving");
    expect(html).toContain("attached-object motion-walk");
    expect(html).toContain("carries →");
  });

  it("moves the attached object by the carrier's exact delta", () => {
    const carrying = run("A teacher carries a book");
    const beforeActor = carrying.entities[0];
    const beforeBook = carrying.entities[1];
    const moved = run("Move the teacher right", carrying);
    expect(moved.entities[0]).toMatchObject({ x: beforeActor.x + 18, y: beforeActor.y });
    expect(moved.entities[1]).toMatchObject({ x: beforeBook.x + 18, y: beforeBook.y });
    expect(moved.entities[1].id).toBe(beforeBook.id);
    expect(moved.relations?.[0]).toMatchObject({ predicate: "carry", sourceIds: [beforeActor.id], targetIds: [beforeBook.id] });
  });

  it("rejects moving the object away from its carrier and preserves the scene", () => {
    const carrying = run("A teacher carries a book");
    const before = structuredClone(carrying);
    const script = interpret("Move the book right", carrying);
    const checked = validateDoodleScript(script, carrying);
    expect(checked.ok).toBe(false);
    if (!checked.ok) expect(checked.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ gate: "layout", message: expect.stringContaining("cannot reach") })
    ]));
    expect(carrying).toEqual(before);
  });

  it("stops holding by releasing the object to ordinary safe spacing", () => {
    const holding = run("A teacher holds a book");
    const stopped = run("The teacher stops holding", holding);
    expect(stopped.entities.map((item) => item.id)).toEqual(["teacher-1", "book-1"]);
    expect(stopped.entities[0].performance).toBeUndefined();
    expect(stopped.entities[1]).toMatchObject({ x: 30, y: 28 });
    expect(stopped.relations).toEqual([]);
  });

  it("releases close contact before switching to a non-contact action", () => {
    const touching = run("A teacher touches a book");
    const pointing = run("The teacher points at the book", touching);
    expect(pointing.entities[1]).toMatchObject({ x: 30, y: 28 });
    expect(pointing.relations).toEqual([expect.objectContaining({ predicate: "point", preposition: "at" })]);
    expect(pointing.entities[0].performance?.rightArm?.joint).toBe(0);
  });
});
