import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { classifySafetyIntent } from "./safetyIntent";
import type { DoodleScript, SceneState } from "./schema";
import { validateDoodleScript } from "./validator";

describe("safety intent grammar", () => {
  it("classifies structural variants without matching named comparisons", () => {
    expect(classifySafetyIntent("Imagine two things happening at once, but one is way faster")).toEqual({ kind: "ambiguous-comparison" });
    expect(classifySafetyIntent("Two processes happen at the same time, but one is faster")).toBeNull();
  });

  it("requires both unavailable lesson context and a dependent reference", () => {
    expect(classifySafetyIntent("It is the opposite of what we did yesterday, with the same idea")).toEqual({ kind: "unresolved-prior-context" });
    expect(classifySafetyIntent("Yesterday a river flowed into a lake")).toBeNull();
  });

  it("recognizes collaborative pause variants without treating described breaks as controls", () => {
    expect(classifySafetyIntent("Let's take a short break before we continue")).toEqual({ kind: "non-visual-hold" });
    expect(classifySafetyIntent("Shall we pause, then continue?")).toEqual({ kind: "non-visual-hold" });
    expect(classifySafetyIntent("A student takes a break before class")).toBeNull();
  });

  it("returns precise clarification codes for the independent safety cases", () => {
    const ambiguous = interpretTeacherText("So basically, um, it's kind of like — okay, imagine two things happening at once, but one is way faster.", initialScene);
    const reference = interpretTeacherText("It's kind of the opposite of what we did yesterday, but with the same idea.", initialScene);
    expect(ambiguous.ok ? null : ambiguous.clarification.code).toBe("ambiguous-meaning");
    expect(reference.ok ? null : reference.clarification.code).toBe("ambiguous-reference");
  });

  it("emits one validated hold and preserves the exact scene object", () => {
    const scene: SceneState = { sceneId: "lesson", revision: 7, entities: [{ id: "car-1", kind: "car", label: "car 1", x: 30, y: 40, scale: 1, direction: "right", highlighted: false }], relations: [], context: { subjectIds: ["car-1"], objectIds: [] } };
    const result = interpretTeacherText("Let's take a short break before we continue.", scene);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script).toMatchObject({ schemaVersion: "2.5.0", commands: [{ action: "hold", reason: "non-visual-speech" }] });
    expect(result.script.context).toBeUndefined();
    expect(validateDoodleScript(result.script, scene).ok).toBe(true);
    expect(applyDoodleScript(scene, result.script)).toBe(scene);

    const mixed: DoodleScript = { ...result.script, commands: [...result.script.commands, { action: "clear" }] };
    expect(validateDoodleScript(mixed, scene)).toMatchObject({ ok: false });
    const oldVersion: DoodleScript = { ...result.script, schemaVersion: "2.4.0" };
    expect(validateDoodleScript(oldVersion, scene)).toMatchObject({ ok: false });
  });
});
