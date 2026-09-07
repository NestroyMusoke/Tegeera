import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { characterPoseFor } from "../components/characterPerformance";
import { EntityGlyph } from "../components/entityRenderers";
import { applyDoodleScript, initialScene } from "./scene";
import type { DoodleScript, SceneEntity, SceneState } from "./schema";
import { validateDoodleScript } from "./validator";

const person: SceneEntity = {
  id: "person-1", kind: "person", label: "person 1", x: 30, y: 40,
  scale: 1, direction: "right", highlighted: false
};

const performance = {
  bodyLean: 12,
  headTilt: -8,
  rightArm: { upper: -70, joint: 24 },
  expression: { smile: 0.9, mouthOpen: 0.5, browLift: 0.4, gazeX: 0.8, gazeY: -0.2 },
  loop: "wave" as const,
  intensity: 0.75
};

function createScript(entity: SceneEntity, schemaVersion: DoodleScript["schemaVersion"]): DoodleScript {
  return {
    schemaVersion, sceneId: initialScene.sceneId, revision: 1, confidence: 1,
    sourceText: "A person waves", commands: [{ action: "create", entity }]
  };
}

describe("DoodleScript character performance", () => {
  it("accepts bounded performance only in DoodleScript 1.5", () => {
    const entity = { ...person, performance };
    expect(validateDoodleScript(createScript(entity, "1.4.0"), initialScene)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ gate: "schema" })])
    });
    expect(validateDoodleScript(createScript(entity, "1.5.0"), initialScene).ok).toBe(true);
  });

  it("rejects unsafe joint values and performances on non-characters", () => {
    const unsafe = createScript({ ...person, performance: { rightArm: { upper: 999, joint: 0 } } }, "1.5.0");
    expect(validateDoodleScript(unsafe, initialScene)).toMatchObject({ ok: false, issues: [expect.objectContaining({ gate: "schema" })] });

    const car = createScript({ ...person, id: "car-1", kind: "car", performance }, "1.5.0");
    expect(validateDoodleScript(car, initialScene)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([expect.objectContaining({ gate: "semantic" })])
    });
  });

  it("persists a performance update without mutating the previous scene", () => {
    const scene: SceneState = { sceneId: "scene", revision: 1, entities: [person], relations: [] };
    const script: DoodleScript = {
      schemaVersion: "1.5.0", sceneId: "scene", revision: 2, confidence: 1,
      sourceText: "performance", commands: [{ action: "update", targetId: person.id, performance }]
    };
    const checked = validateDoodleScript(script, scene);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const next = applyDoodleScript(scene, checked.script);
    expect(next.entities[0].performance).toEqual(performance);
    expect(scene.entities[0].performance).toBeUndefined();
  });

  it("can explicitly clear a previous performance", () => {
    const scene: SceneState = { sceneId: "scene", revision: 1, entities: [{ ...person, performance }], relations: [] };
    const script: DoodleScript = {
      schemaVersion: "1.5.0", sceneId: "scene", revision: 2, confidence: 1,
      sourceText: "stop the performance", commands: [{ action: "update", targetId: person.id, performance: null }]
    };
    const checked = validateDoodleScript(script, scene);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(applyDoodleScript(scene, checked.script).entities[0].performance).toBeUndefined();
    expect(scene.entities[0].performance).toEqual(performance);
  });

  it("merges partial performance parameters with a stable base pose", () => {
    const pose = characterPoseFor({ ...person, performance });
    const base = characterPoseFor(person);
    expect(pose).toMatchObject({
      name: "custom", bodyLean: 12, headTilt: -8, rightArm: { upper: -70, joint: 24 },
      smile: 0.9, mouthOpen: 0.5, loop: "wave", intensity: 0.75
    });
    expect(pose.leftArm).toEqual(base.leftArm);
  });

  it("renders planned joints, expression and motion metadata", () => {
    const html = renderToStaticMarkup(<EntityGlyph entity={{ ...person, performance }} />);
    expect(html).toContain('data-pose="custom"');
    expect(html).toContain('data-motion="wave"');
    expect(html).toContain("motion-wave is-moving");
    expect(html).toContain("rotate(-70)");
    expect(html).toContain("<ellipse");
  });
});
