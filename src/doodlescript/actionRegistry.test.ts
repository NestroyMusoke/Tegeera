import { describe, expect, it } from "vitest";
import { actionAliases, actionRegistry } from "./actionRegistry";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { analyzeTeacherInput } from "./semanticFrame";
import type { SceneState } from "./schema";
import { validateDoodleScript } from "./validator";

function run(text: string, scene = initialScene): SceneState {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const checked = validateDoodleScript(result.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("semantic action registry", () => {
  it("has unique aliases and valid bounded performance plans", () => {
    expect(new Set(actionAliases()).size).toBe(actionAliases().length);
    expect(actionRegistry.map((action) => action.predicate)).toEqual(["wave", "celebrate", "explain", "talk", "walk", "run", "think", "point", "look"]);
    for (const action of actionRegistry) expect(action.performance.loop).toBeTruthy();
  });

  it("extracts actor and action independently of polite phrasing or tense", () => {
    const frames = [
      analyzeTeacherInput("A student waves").frames[0],
      analyzeTeacherInput("Please show me a student waving").frames[0],
      analyzeTeacherInput("A student is waving").frames[0]
    ];
    for (const frame of frames) {
      expect(frame.actions).toEqual([{
        predicate: "wave",
        actorMentionIds: [frame.entities[0].mentionId],
        targetMentionIds: [],
        phase: "start"
      }]);
      expect(frame.entities[0]).toMatchObject({ text: "a student", kind: "student" });
    }
  });

  it("creates individual or grouped actors with planned performances", () => {
    const waving = run("A student waves");
    expect(waving.entities[0].performance).toMatchObject({ loop: "wave", rightArm: { upper: -72, joint: 18 } });

    const celebrating = run("Three students celebrate");
    expect(celebrating.entities).toHaveLength(3);
    expect(celebrating.entities.every((entity) => entity.performance?.loop === "celebrate")).toBe(true);
  });

  it("updates pronouns, labels and existing groups instead of duplicating actors", () => {
    const one = run("A student");
    const waving = run("She waves", one);
    expect(waving.entities).toHaveLength(1);
    expect(waving.entities[0].performance?.loop).toBe("wave");

    const group = run("Three students");
    const cheering = run("The students cheer", group);
    expect(cheering.entities).toHaveLength(3);
    expect(cheering.entities.every((entity) => entity.performance?.loop === "celebrate")).toBe(true);

    const labelled = run("Student 1 thinks", one);
    expect(labelled.entities).toHaveLength(1);
    expect(labelled.entities[0].performance?.loop).toBe("breathe");
  });

  it("stops the matching performance and preserves the prior revision", () => {
    const waving = run("A student waves");
    const stopped = run("She stops waving", waving);
    expect(stopped.entities[0].performance).toBeUndefined();
    expect(waving.entities[0].performance?.loop).toBe("wave");
    expect(interpretTeacherText("She stops running", waving).ok).toBe(false);
  });

  it("rejects non-human performers without changing the supplied scene", () => {
    const before = run("A car");
    const snapshot = structuredClone(before);
    expect(interpretTeacherText("The car waves", before).ok).toBe(false);
    expect(before).toEqual(snapshot);
  });
});
