import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { applyDoodleScript, initialScene } from "./scene";
import { interpretTeacherText } from "./interpret";
import { conditionFlowGeometry, matchConditionFlow } from "./conditionFlow";
import { validateDoodleScript } from "./validator";

const render = (text: string) => {
  const result = interpretTeacherText(text, initialScene);
  expect(result.ok, result.ok ? "" : result.message).toBe(true);
  if (!result.ok) throw new Error(result.message);
  expect(result.script.schemaVersion).toBe("2.19.0");
  expect(validateDoodleScript(result.script, initialScene).ok).toBe(true);
  const scene = applyDoodleScript(initialScene, result.script);
  return { result, scene, html: renderToStaticMarkup(createElement(DoodleCanvas, { scene })) };
};

describe("universal condition-flow construction", () => {
  it("extracts branch and loop topology without literal analogy", () => {
    expect(matchConditionFlow("if-else means the program checks a condition and takes one of two paths")).toEqual({
      mode: "branch", entryText: "program", conditionText: "condition", trueText: "true path", falseText: "false path"
    });
    expect(matchConditionFlow("a loop just keeps repeating the same steps until a condition becomes false")).toEqual({
      mode: "loop", stepText: "same steps", conditionText: "condition", exitText: "exit"
    });
  });

  it("renders a readable true/false fork with one decision diamond", () => {
    const { scene, html } = render("If-else means the program checks a condition and takes one of two paths.");
    expect(conditionFlowGeometry(scene.relations ?? [], scene.entities)?.mode).toBe("branch");
    expect(html).toContain('data-relation-layout="condition-flow"');
    for (const cue of ["control-entry", "condition-diamond", "true-branch", "false-branch"]) expect(html).toContain(cue);
    expect(html.match(/class="condition-flow-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("renders a true back-edge and a separate false exit", () => {
    const { scene, html } = render("A loop just keeps repeating the same steps until a condition becomes false.");
    expect(conditionFlowGeometry(scene.relations ?? [], scene.entities)?.mode).toBe("loop");
    for (const cue of ["repeated-step", "condition-diamond", "loop-back-arrow", "false-exit-path"]) expect(html).toContain(cue);
    expect(html).toContain("condition-loop");
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects vague, negated, uncertain, and incomplete control claims", () => {
    for (const text of [
      "A loop repeats steps.",
      "If-else has paths.",
      "A loop might keep repeating the same steps until a condition becomes false.",
      "A loop does not keep repeating the same steps until a condition becomes false."
    ]) expect(interpretTeacherText(text, initialScene).ok, text).toBe(false);
  });
});
