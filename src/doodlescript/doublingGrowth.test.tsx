import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { doublingGrowthGeometry, matchDoublingGrowth } from "./doublingGrowth";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

describe("universal doubling-growth construction", () => {
  const text = "Bacteria multiply so fast that one becomes two, two becomes four, and it just keeps doubling.";

  it("extracts an open subject and explicit powers-of-two stages", () => {
    expect(matchDoublingGrowth(text.toLowerCase().replace(/\.$/, ""))).toEqual({ subjectText: "bacteria", oneText: "1", twoText: "2", fourText: "4", eightText: "8" });
  });

  it("creates validated branching growth and one animated specialist SVG", () => {
    const result = interpretTeacherText(text, initialScene); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.script.schemaVersion).toBe("2.23.0"); expect(validateDoodleScript(result.script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, result.script);
    expect(scene.relations?.map(({ kind }) => kind)).toEqual(["growthStartsAt", "doublesTo", "doublesTo", "doublesTo"]);
    expect(doublingGrowthGeometry(scene.relations ?? [], scene.entities)?.stages.map(({ label }) => label)).toEqual(["1", "2", "4", "8"]);
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html.match(/class="doubling-growth-annotation"/g)).toHaveLength(1);
    for (const cue of ["single-origin", "two-offspring", "four-offspring", "eight-offspring", "doubling-branches", "exponential-counts"]) expect(html).toContain(`data-visual-cue="${cue}"`);
    expect(html).not.toContain('class="doodle-object');
  });

  it("generalizes across domains and refuses incomplete or unsafe growth claims", () => {
    for (const value of ["In cell division, the population doubles from one to two to four to eight.", "Users doubles from one to two to four to eight."]) expect(interpretTeacherText(value, initialScene).ok, value).toBe(true);
    for (const value of ["Bacteria multiply quickly.", "Bacteria might double from one to two to four to eight.", "Bacteria do not double from one to two to four to eight.", "Bacteria grow from one to three to nine."]) expect(interpretTeacherText(value, initialScene).ok, value).toBe(false);
  });
});
