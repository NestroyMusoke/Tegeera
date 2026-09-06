import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";
import { motionGeometry } from "./motion";
import type { SceneState } from "./schema";

function run(text: string, scene = initialScene): SceneState {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const checked = validateDoodleScript(result.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("directed action meaning", () => {
  for (const text of ["A car approaches a person", "A vehicle moves toward a teacher", "A student walks towards a school", "A teacher moves away from a tree", "A car drives away from a building"]) {
    it(`composes: ${text}`, () => {
      const scene = run(text);
      expect(scene.entities).toHaveLength(2);
      expect(scene.relations?.[0]).toMatchObject({ kind: text.includes("away") ? "away" : "toward", sourceIds: [scene.entities[0].id], targetIds: [scene.entities[1].id] });
    });
  }
  it("reverses existing motion without recreating objects or leaving two directions", () => {
    const scene = run("A car approaches a person");
    const next = run("Make the car go the other way", scene);
    expect(next.entities).toEqual(scene.entities);
    expect(next.relations).toHaveLength(1);
    expect(next.relations?.[0]).toMatchObject({ kind: "away", sourceIds: ["car-1"], targetIds: ["person-1"] });
    expect(run("Make it go the other way", next).relations?.[0].kind).toBe("toward");
  });
  it("uses it as the moving actor, not its reference object", () => {
    const scene = run("A car approaches a person");
    const next = run("It moves away from the person", scene);
    expect(next.entities).toEqual(scene.entities);
    expect(next.relations?.[0].sourceIds).toEqual(["car-1"]);
  });
  it("stop preserves the last facing direction", () => {
    const moving = run("A car moves away from a person");
    const stopped = run("Stop it", moving);
    expect(stopped.relations).toHaveLength(0);
    expect(stopped.entities[0]).toEqual({ ...moving.entities[0], direction: "left" });
    expect(stopped.entities[1]).toEqual(moving.entities[1]);
    expect(moving.relations?.[0].kind).toBe("away");
  });
  it("an explicit turn replaces the old directional assertion", () => {
    const scene = run("A car approaches a person");
    const next = run("Turn the car left", scene);
    expect(next.relations).toHaveLength(0);
    expect(next.entities[0].direction).toBe("left");
  });
  it("removing the reference cleans motion and context", () => {
    const next = run("Remove the person", run("A car approaches a person"));
    expect(next.relations).toHaveLength(0);
    expect(next.context?.objectIds).toEqual([]);
  });
  it("does not infer collision outcomes or unsupported actions", () => {
    for (const text of ["A car collides with a person", "A car does not approach a person", "A student drives toward a school", "A car walks toward a person", "Two cars approach a person", "A car approaches a person and explodes"]) {
      expect(interpretTeacherText(text, initialScene).ok, text).toBe(false);
    }
  });
  it("requires explicit prior direction before reversing", () => {
    expect(interpretTeacherText("Make the car go the other way", run("A car")).ok).toBe(false);
  });
  it("does not use an ambiguous or self reference", () => {
    expect(interpretTeacherText("The car approaches the person", run("Two cars and a person")).ok).toBe(false);
    expect(interpretTeacherText("The car approaches the car", run("A car")).ok).toBe(false);
  });
});

describe("direction geometry and gates", () => {
  it("points toward and away correctly on either side", () => {
    const [actor, target] = run("A car approaches a person").entities;
    expect(motionGeometry(actor, target, "toward")?.direction).toBe("right");
    expect(motionGeometry(actor, target, "away")?.direction).toBe("left");
    expect(motionGeometry(target, actor, "toward")?.direction).toBe("left");
    expect(motionGeometry(target, actor, "away")?.direction).toBe("right");
  });
  it("rejects a mixed-row directional illustration instead of drawing a misleading horizontal arrow", () => {
    const scene = run("A car and a person");
    const modified = { ...scene, entities: scene.entities.map((entity) => entity.kind === "person" ? { ...entity, y: 60 } : entity) };
    const result = interpretTeacherText("The car approaches the person", modified);
    if (!result.ok) throw new Error(result.message);
    expect(validateDoodleScript(result.script, modified)).toMatchObject({ ok: false, issues: expect.arrayContaining([expect.objectContaining({ gate: "layout" })]) });
  });
  it("rejects old-version motion and simultaneous conflicting directions", () => {
    const result = interpretTeacherText("A car approaches a person", initialScene);
    if (!result.ok) throw new Error(result.message);
    expect(validateDoodleScript({ ...result.script, schemaVersion: "1.2.0" }, initialScene).ok).toBe(false);
    const conflicting = { ...result.script, commands: [...result.script.commands, { action: "relate", relation: { id: "conflict", kind: "away", sourceIds: ["car-1"], targetIds: ["person-1"] } }] };
    expect(validateDoodleScript(conflicting, initialScene).ok).toBe(false);
  });
});
