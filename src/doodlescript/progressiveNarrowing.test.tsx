import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { matchProgressiveNarrowing, progressiveNarrowingGeometry } from "./progressiveNarrowing";
import { validateDoodleScript } from "./validator";

describe("open progressive-narrowing construction", () => {
  const text = "In a binary search, you keep cutting the list in half until you find what you're looking for.";
  it("extracts open process and collection slots", () => expect(matchProgressiveNarrowing(text.toLowerCase())).toEqual({ processText: "binary search", collectionText: "list", initialText: "full list", reducedText: "smaller list", foundText: "target item" }));
  it("creates typed shrinking stages and specialist SVG", () => {
    const result = interpretTeacherText(text, initialScene); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.script.schemaVersion).toBe("2.20.0"); expect(validateDoodleScript(result.script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, result.script); expect(progressiveNarrowingGeometry(scene.relations ?? [], scene.entities)).not.toBeNull();
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    for (const cue of ["full-candidate-row", "discarded-halves", "shrinking-candidate-row", "narrowing-arrows", "highlighted-found-item"]) expect(html).toContain(cue);
    expect(html).not.toContain('class="doodle-object');
  });
  it("clarifies incomplete and unsafe claims", () => { for (const value of ["A binary search uses a list.", "In a binary search, you might keep cutting the list in half until you find the target.", "In a binary search, you keep cutting the list until you find the target."]) expect(interpretTeacherText(value, initialScene).ok).toBe(false); });
});
