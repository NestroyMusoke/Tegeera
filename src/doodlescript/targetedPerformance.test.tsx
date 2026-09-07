import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { analyzeTeacherInput } from "./semanticFrame";
import type { DoodleScript, SceneEntity, SceneState } from "./schema";
import { applyTargetedPerformance } from "./targetedPerformance";
import { validateDoodleScript } from "./validator";

function interpret(text: string, scene = initialScene): DoodleScript {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  return result.script;
}

function run(text: string, scene = initialScene): SceneState {
  const script = interpret(text, scene);
  const checked = validateDoodleScript(script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("targeted semantic performance", () => {
  it("extracts actor, action, preposition and target without a sentence-specific rule", () => {
    const frame = analyzeTeacherInput("The teacher is pointing towards a tree").frames[0];
    expect(frame.actions).toEqual([{
      predicate: "point",
      actorMentionIds: [frame.references[0].mentionId],
      targetMentionIds: [frame.entities[0].mentionId],
      preposition: "towards",
      phase: "start"
    }]);
    expect(frame.entities[0]).toMatchObject({ text: "a tree", kind: "tree" });
  });

  it("creates a DoodleScript 1.6 action-target relation and preserves it in the scene", () => {
    const script = interpret("A teacher points at a tree");
    expect(script.schemaVersion).toBe("1.6.0");
    expect(script.commands).toEqual(expect.arrayContaining([expect.objectContaining({
      action: "relate",
      relation: expect.objectContaining({ kind: "actsOn", predicate: "point", preposition: "at" })
    })]));
    const scene = run("A teacher points at a tree");
    expect(scene.entities.map((entity) => entity.kind)).toEqual(["teacher", "tree"]);
    expect(scene.relations).toEqual([expect.objectContaining({ sourceIds: ["teacher-1"], targetIds: ["tree-1"] })]);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain("point at →");
    expect(html).not.toContain("rig-prop");
  });

  it("derives facing, gaze and pointing angle from live target geometry", () => {
    const actor: SceneEntity = { id: "teacher-1", kind: "teacher", x: 70, y: 40, scale: 1, direction: "right", highlighted: false };
    const lowerTarget: SceneEntity = { id: "tree-1", kind: "tree", x: 30, y: 65, scale: 1, direction: "right", highlighted: false };
    const upperTarget = { ...lowerTarget, y: 15 };
    const relation = { id: "aim", kind: "actsOn" as const, predicate: "point", preposition: "at", sourceIds: [actor.id], targetIds: [lowerTarget.id] };
    const down = applyTargetedPerformance(actor, lowerTarget, relation);
    const up = applyTargetedPerformance(actor, upperTarget, relation);
    expect(down.direction).toBe("left");
    expect(down.performance?.expression).toMatchObject({ gazeX: 1, gazeY: expect.any(Number) });
    expect(down.performance!.rightArm!.upper).toBeGreaterThan(0);
    expect(up.performance!.rightArm!.upper).toBeLessThan(0);
    expect(actor.performance).toBeUndefined();
  });

  it("reuses existing actors and targets and rejects ambiguous targets", () => {
    const base = run("A teacher and a tree");
    const pointed = run("Teacher points at the tree", base);
    expect(pointed.entities).toHaveLength(2);
    expect(pointed.relations).toHaveLength(1);

    const ambiguous = run("A teacher and two trees");
    expect(interpretTeacherText("The teacher points at tree", ambiguous).ok).toBe(false);
  });

  it("can stop a targeted action without deleting its target or downgrading the script", () => {
    const waving = run("A student waves at a teacher");
    const script = interpret("The student stops waving", waving);
    expect(script.schemaVersion).toBe("1.6.0");
    const checked = validateDoodleScript(script, waving);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const stopped = applyDoodleScript(waving, checked.script);
    expect(stopped.entities).toHaveLength(2);
    expect(stopped.entities.find((entity) => entity.kind === "student")?.performance).toBeUndefined();
    expect(stopped.relations).toEqual([]);
  });

  it("rejects legacy, malformed and conflicting target relations", () => {
    const valid = interpret("A teacher points at a tree");
    expect(validateDoodleScript({ ...valid, schemaVersion: "1.5.0" }, initialScene).ok).toBe(false);
    const malformed = {
      ...valid,
      commands: valid.commands.map((command) => command.action === "relate"
        ? { ...command, relation: { ...command.relation, predicate: undefined } }
        : command)
    };
    expect(validateDoodleScript(malformed, initialScene).ok).toBe(false);
  });
});
