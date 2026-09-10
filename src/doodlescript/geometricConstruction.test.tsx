import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { geometricConstructionGeometry, matchGeometricConstruction, parseDegreeMeasure } from "./geometricConstruction";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const validated = validateDoodleScript(interpreted.script, initialScene);
  if (!validated.ok) throw new Error(JSON.stringify(validated.issues));
  return { script: validated.script, scene: applyDoodleScript(initialScene, validated.script) };
}

describe("open angular geometric construction", () => {
  it("parses numeric and word degree measures with open angle subjects", () => {
    expect(parseDegreeMeasure("ninety degrees")).toBe(90);
    expect(parseDegreeMeasure("one hundred and twenty degrees")).toBe(120);
    expect(parseDegreeMeasure("45°")).toBe(45);
    expect(matchGeometricConstruction("a right angle is exactly ninety degrees, like the corner of a square")).toEqual({
      subjectText: "right angle", measureText: "ninety degrees", degrees: 90
    });
    expect(matchGeometricConstruction("an acute angle measures 45°")).toEqual({
      subjectText: "acute angle", measureText: "45 degrees", degrees: 45
    });
    expect(matchGeometricConstruction("the temperature is ninety degrees")).toBeNull();
  });

  it("builds distinct angle and measurement identities with true perpendicular geometry", () => {
    const { script, scene } = build("A right angle is exactly ninety degrees, like the corner of a square.");
    expect(script.schemaVersion).toBe("2.3.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual([
      ["right angle", "geometry"], ["ninety degrees", "measurement"]
    ]);
    expect(scene.relations).toEqual([expect.objectContaining({ kind: "measures", predicate: "measures" })]);
    const geometry = geometricConstructionGeometry(scene.relations![0], scene.entities)!;
    const first = { x: geometry.rayLength, y: 0 };
    const second = { x: geometry.secondX - geometry.vertexX, y: geometry.secondY - geometry.vertexY };
    expect(Math.abs(first.x * second.x + first.y * second.y)).toBeLessThan(0.001);
    expect(geometry.isRightAngle).toBe(true);
  });

  it("renders the independent right-angle cues and accessible measure", () => {
    const { scene } = build("A right angle is exactly ninety degrees, like the corner of a square.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="geometric-construction"');
    expect(html).toContain('data-layout-topology="angular-construction"');
    expect(html).toContain('data-visual-cue="perpendicular-rays"');
    expect(html).toContain('data-visual-cue="right-angle-square"');
    expect(html).toContain('data-visual-cue="ninety-degree-label"');
    expect(html).toContain('aria-label="right angle measures 90°"');
    expect(html).not.toContain('class="doodle-object');
  });

  it("computes a different construction for a non-right angle", () => {
    const { script, scene } = build("An acute angle measures 45°.");
    const geometry = geometricConstructionGeometry(scene.relations![0], scene.entities)!;
    expect(geometry.degrees).toBe(45);
    expect(geometry.isRightAngle).toBe(false);
    expect(geometry.secondX).toBeGreaterThan(geometry.vertexX);
    expect(geometry.secondY).toBeLessThan(geometry.vertexY);
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-visual-cue="angle-arc"');
    expect(html).not.toContain('data-visual-cue="right-angle-square"');
    expect(validateDoodleScript({ ...script, schemaVersion: "2.2.0" }, initialScene).ok).toBe(false);
  });
});
