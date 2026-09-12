import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { fractionSubtractionGeometry, matchFractionSubtraction } from "./fractionSubtraction";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const checked = validateDoodleScript(interpreted.script, initialScene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { script: checked.script, scene: applyDoodleScript(initialScene, checked.script) };
}

describe("open fraction-subtraction construction", () => {
  it("parses word, slice, and numeric fractions into reusable arithmetic values", () => {
    expect(matchFractionSubtraction("if you have three-quarters of a pizza and eat one slice, how much is left")).toEqual({
      wholeText: "pizza", initial: { numerator: 3, denominator: 4 }, removed: { numerator: 1, denominator: 4 }, remainder: { numerator: 1, denominator: 2 },
      initialText: "three quarters", removedText: "one quarter", remainderText: "one half"
    });
    expect(matchFractionSubtraction("if we start with 5/6 of a cake and remove two sixths, how much is left")?.remainder).toEqual({ numerator: 1, denominator: 2 });
    expect(matchFractionSubtraction("subtract one third from two thirds of a pie")?.remainderText).toBe("one third");
    expect(matchFractionSubtraction("if you have three quarters of a pizza and eat four slices, how much is left")).toBeNull();
    expect(matchFractionSubtraction("if you have three quarters of a pizza and eat one third, how much is left")).toBeNull();
  });

  it("builds four identities with exact fraction metadata and three meanings", () => {
    const { script, scene } = build("If you have three-quarters of a pizza and eat one slice, how much is left?");
    expect(script.schemaVersion).toBe("2.9.0");
    expect(scene.entities.map(({ label, visualRole, fraction }) => [label, visualRole, fraction])).toEqual([
      ["pizza", "fraction-whole", undefined],
      ["three quarters", "fraction-initial", { numerator: 3, denominator: 4 }],
      ["one quarter", "fraction-removed", { numerator: 1, denominator: 4 }],
      ["one half", "fraction-remainder", { numerator: 1, denominator: 2 }]
    ]);
    expect(scene.relations).toEqual([
      expect.objectContaining({ kind: "subtracts", sourceIds: [scene.entities[2].id], targetIds: [scene.entities[1].id] }),
      expect.objectContaining({ kind: "partOf", sourceIds: [scene.entities[1].id], targetIds: [scene.entities[0].id] }),
      expect.objectContaining({ kind: "resultsIn", sourceIds: [scene.entities[1].id], targetIds: [scene.entities[3].id] })
    ]);
    expect(fractionSubtractionGeometry(scene.relations!, scene.entities)).not.toBeNull();
  });

  it("keeps equal removed and remaining values as distinct semantic roles", () => {
    const { scene } = build("Take one third away from two thirds of a ribbon.");
    const matching = scene.entities.filter(({ label }) => label === "one third");
    expect(matching).toHaveLength(2);
    expect(new Set(matching.map(({ id }) => id)).size).toBe(2);
    expect(matching.map(({ visualRole }) => visualRole)).toEqual(["fraction-removed", "fraction-remainder"]);
    expect(fractionSubtractionGeometry(scene.relations!, scene.entities)).not.toBeNull();
  });

  it("renders the operation and remainder instead of only printing an answer", () => {
    const { scene } = build("If you have three-quarters of a pizza and eat one slice, how much is left?");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="fraction-subtraction"');
    expect(html).toContain('data-layout-topology="part-removal"');
    for (const cue of ["quartered-circle", "three-initially-shaded", "one-slice-removed", "two-quarters-remain", "remainder-label"]) expect(html).toContain(cue);
    expect(html).toContain('aria-label="three quarters of pizza minus one quarter leaves one half"');
    expect(html.match(/class="fraction-subtraction-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects old-version, incomplete, wrong-role, and forged arithmetic", () => {
    const { script } = build("If we start with 5/6 of a cake and remove two sixths, how much is left?");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.8.0" }, initialScene).ok).toBe(false);
    const incomplete = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.kind !== "resultsIn") };
    expect(validateDoodleScript(incomplete, initialScene).ok).toBe(false);
    const wrongRole = structuredClone(script);
    const initial = wrongRole.commands.find((command) => command.action === "create" && command.entity.visualRole === "fraction-initial");
    if (initial?.action === "create") initial.entity.visualRole = "object";
    expect(validateDoodleScript(wrongRole, initialScene).ok).toBe(false);
    const forged = structuredClone(script);
    const remainder = forged.commands.find((command) => command.action === "create" && command.entity.visualRole === "fraction-remainder");
    if (remainder?.action === "create") remainder.entity.fraction = { numerator: 5, denominator: 6 };
    expect(validateDoodleScript(forged, initialScene).ok).toBe(false);
  });
});
