import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";
import { forceDiagramGeometry, matchForceDiagram } from "./forceDiagram";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const validated = validateDoodleScript(interpreted.script, initialScene);
  if (!validated.ok) throw new Error(JSON.stringify(validated.issues));
  return { script: validated.script, scene: applyDoodleScript(initialScene, validated.script) };
}

describe("open force-diagram grammar", () => {
  it("extracts mechanical roles without storing the corpus sentence", () => {
    expect(matchForceDiagram("if you push a box on a rough floor, friction slows it down")).toEqual({
      bodyText: "box", surfaceText: "rough floor", appliedForceText: "push",
      opposingForceText: "friction", appliedDirection: "right"
    });
    expect(matchForceDiagram("someone pulls a sled across packed snow, drag reduces the speed of the body")).toEqual({
      bodyText: "sled", surfaceText: "packed snow", appliedForceText: "pull",
      opposingForceText: "drag", appliedDirection: "left"
    });
    expect(matchForceDiagram("if a box is red")).toBeNull();
  });

  it("builds the complete case 11 semantic graph and safe geometry", () => {
    const { script, scene } = build("If you push a box on a rough floor, friction slows it down.");
    expect(script.schemaVersion).toBe("2.1.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual(expect.arrayContaining([
      ["box", "object"], ["rough floor", "surface"], ["push", "force"], ["friction", "force"]
    ]));
    const labels = new Map(scene.entities.map(({ id, label }) => [id, label]));
    expect(scene.relations?.map(({ kind, sourceIds, targetIds }) => [kind, labels.get(sourceIds[0]), labels.get(targetIds[0])])).toEqual([
      ["appliedTo", "push", "box"], ["opposes", "friction", "push"], ["contacts", "box", "rough floor"]
    ]);
    const geometry = forceDiagramGeometry(scene.relations ?? [], scene.entities);
    expect(geometry).not.toBeNull();
    expect(Math.abs(geometry!.opposingStartX - geometry!.opposingEndX))
      .toBeLessThan(Math.abs(geometry!.appliedStartX - geometry!.appliedEndX));
  });

  it("mirrors the physical layout for a leftward pull", () => {
    const { scene } = build("Someone pulls a sled across packed snow, drag reduces the speed of the body.");
    const geometry = forceDiagramGeometry(scene.relations ?? [], scene.entities);
    expect(geometry?.direction).toBe(-1);
    expect(geometry!.appliedStartX).toBeGreaterThan(geometry!.bodyX);
    expect(geometry!.opposingStartX).toBeLessThan(geometry!.bodyX);
  });

  it("renders a physical scene with inspectable magnitude and direction cues", () => {
    const { scene } = build("If you push a box on a rough floor, friction slows it down.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="force-diagram"');
    expect(html).toContain('data-layout-topology="force-body"');
    expect(html).toContain('data-visual-cue="surface-line"');
    expect(html).toContain('data-visual-cue="forward-force-arrow"');
    expect(html).toContain('data-visual-cue="opposing-friction-arrow friction-arrow-smaller"');
    expect(html).toContain('data-primitive="box"');
    expect(html).not.toContain('data-symbol-id="friction"');
  });

  it("rejects incomplete diagrams and pre-2.1 scripts", () => {
    const { script } = build("If you push a crate along concrete, resistance slows it down.");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.0.0" }, initialScene).ok).toBe(false);
    const incomplete = { ...script, commands: script.commands.filter((command) =>
      command.action !== "relate" || command.relation.kind !== "opposes") };
    expect(validateDoodleScript(incomplete, initialScene).ok).toBe(false);
  });
});
