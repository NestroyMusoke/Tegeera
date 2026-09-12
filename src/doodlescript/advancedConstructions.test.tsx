import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { convergentPlatesGeometry, lifoStackGeometry, matchConvergentPlates, matchLifoStack, matchOrderedRoutine, matchTriangleAngleSum, orderedRoutineGeometry, triangleAngleSumGeometry } from "./advancedConstructions";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript } from "./scene";
import type { DoodleScript, SceneState } from "./schema";
import { analyzeTeacherInput } from "./semanticFrame";
import { validateDoodleScript } from "./validator";

const empty: SceneState = { sceneId: "advanced", revision: 0, entities: [], relations: [] };
const build = (text: string) => {
  const interpretation = interpretTeacherText(text, empty);
  expect(interpretation.ok).toBe(true);
  if (!interpretation.ok) throw new Error(interpretation.message);
  expect(validateDoodleScript(interpretation.script, empty).ok).toBe(true);
  return { script: interpretation.script, scene: applyDoodleScript(empty, interpretation.script), html: renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(empty, interpretation.script)} />) };
};
const expectCues = (html: string, cues: string[]) => cues.forEach((cue) => expect(html).toContain(`data-visual-cue="${cue}`));
const corruptRole = (script: DoodleScript, role: string): DoodleScript => ({ ...script, commands: script.commands.map((command) => command.action === "create" && command.entity.visualRole === role ? { ...command, entity: { ...command.entity, visualRole: "object" as const } } : command) });

describe("reusable advanced visual constructions", () => {
  it("recognizes LIFO top access while rejecting ordinary piles", () => {
    expect(matchLifoStack("think of a stack like a pile of plates — you can only add or remove from the top")).not.toBeNull();
    expect(matchLifoStack("in a stack you push or pop items only at the top")).not.toBeNull();
    expect(matchLifoStack("plates are piled on a table")).toBeNull();
  });

  it("builds and validates a complete animated LIFO explanation", () => {
    const { script, scene, html } = build("Think of a stack like a pile of plates — you can only add or remove from the top.");
    expect(script.schemaVersion).toBe("2.13.0");
    expect(lifoStackGeometry(scene.relations ?? [], scene.entities)).not.toBeNull();
    expectCues(html, ["vertical-stack", "top-marker", "push-at-top", "pop-at-top"]);
    expect(html).toContain('data-layout-topology="top-access-stack"');
    expect(html.match(/lifo-stack-annotation/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
    expect(validateDoodleScript(corruptRole(script, "stack-top"), empty).ok).toBe(false);
  });

  it("recognizes an open triangle/angle/180-degree relationship", () => {
    expect(matchTriangleAngleSum("a triangle has three sides and three angles that always add up to 180 degrees")).not.toBeNull();
    expect(matchTriangleAngleSum("the triangle contains three angles that sum up to 180°")).not.toBeNull();
    expect(matchTriangleAngleSum("a square has four angles")).toBeNull();
  });

  it("renders three marked angles and a validated total", () => {
    const { script, scene, html } = build("A triangle has three sides and three angles that always add up to 180 degrees.");
    expect(script.schemaVersion).toBe("2.14.0");
    expect(triangleAngleSumGeometry(scene.relations ?? [], scene.entities)).not.toBeNull();
    expectCues(html, ["three-sided-triangle", "three-angle-marks", "angle-sum-180"]);
    expect(html).toContain('data-layout-topology="triangle-proof"');
    expect(html.match(/triangle-angle-sum-annotation/g)).toHaveLength(1);
    expect(validateDoodleScript(corruptRole(script, "triangle-angles"), empty).ok).toBe(false);
  });

  it("recognizes convergent landmasses without treating any collision as tectonics", () => {
    expect(matchConvergentPlates("mountains form where two large landmasses slowly push into each other")).not.toBeNull();
    expect(matchConvergentPlates("a mountain rises where two plates move into each other")).not.toBeNull();
    expect(matchConvergentPlates("two cars move into each other")).toBeNull();
  });

  it("renders two opposing identities and central uplift", () => {
    const { script, scene, html } = build("Mountains form where two large landmasses slowly push into each other.");
    expect(script.schemaVersion).toBe("2.15.0");
    expect(convergentPlatesGeometry(scene.relations ?? [], scene.entities)).not.toBeNull();
    expectCues(html, ["opposing-landmasses", "inward-force-arrows", "central-mountain-uplift"]);
    expect(html).toContain('data-layout-topology="plate-convergence"');
    expect(html.match(/convergent-plates-annotation/g)).toHaveLength(1);
    expect(validateDoodleScript(corruptRole(script, "plate-left"), empty).ok).toBe(false);
  });

  it("accepts arbitrary readable three-step routines and rejects missing stages", () => {
    expect(matchOrderedRoutine("first you wake up, then you get ready, then you go to school")).toEqual({ firstText: "wake up", middleText: "get ready", finalText: "go to school" });
    expect(matchOrderedRoutine("first mix flour, then add water, then bake bread")).not.toBeNull();
    expect(matchOrderedRoutine("first wake up, then go to school")).toBeNull();
  });

  it("renders a connected routine with three distinct stage meanings", () => {
    const { script, scene, html } = build("First you wake up, then you get ready, then you go to school.");
    expect(script.schemaVersion).toBe("2.16.0");
    expect(orderedRoutineGeometry(scene.relations ?? [], scene.entities)).not.toBeNull();
    expectCues(html, ["wake-up-stage", "ready-stage", "school-stage", "ordered-arrows"]);
    expect(html).toContain('data-layout-topology="routine-sequence"');
    expect(html.match(/ordered-routine-annotation/g)).toHaveLength(1);
    expect(validateDoodleScript(corruptRole(script, "routine-middle"), empty).ok).toBe(false);
    const openRoutine = build("First mix flour, then add water, then bake bread.");
    for (const label of ["mix flour", "add water", "bake bread"]) expect(openRoutine.html).toContain(label);
    expect(openRoutine.html.match(/ordered-routine-annotation/g)).toHaveLength(1);
  });

  it("exposes all four constructions at the semantic boundary", () => {
    const samples = [
      ["Think of a stack like a pile of plates — you can only add or remove from the top.", "data-structure", "lifo-stack"],
      ["A triangle has three sides and three angles that always add up to 180 degrees.", "angle-sum", "triangle-angle-sum"],
      ["Mountains form where two large landmasses slowly push into each other.", "tectonics", "convergent-plates"],
      ["First you wake up, then you get ready, then you go to school.", "routine", "ordered-routine"]
    ];
    for (const [text, family, predicate] of samples) expect(analyzeTeacherInput(text).frames[0].meaningCandidates).toEqual([{ family, predicate }]);
  });
});
