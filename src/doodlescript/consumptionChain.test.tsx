import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { consumptionChainGeometry, matchConsumptionChain } from "./consumptionChain";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

describe("universal consumption-chain construction", () => {
  const text = "The food chain starts with grass, then a grasshopper eats it, then a frog eats the grasshopper, then a snake eats the frog.";

  it("extracts four open-vocabulary members while resolving repeated references", () => {
    expect(matchConsumptionChain(text.toLowerCase().replace(/\.$/, ""))).toEqual({ chainText: "food chain", sourceText: "grass", firstText: "grasshopper", secondText: "frog", thirdText: "snake" });
  });

  it("creates validated food-to-eater semantics and one lively specialist SVG", () => {
    const result = interpretTeacherText(text, initialScene); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.script.schemaVersion).toBe("2.24.0"); expect(validateDoodleScript(result.script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, result.script);
    expect(scene.relations?.map(({ kind }) => kind)).toEqual(["chainStartsWith", "eatenBy", "eatenBy", "eatenBy"]);
    expect(consumptionChainGeometry(scene.relations ?? [], scene.entities)?.members.map(({ label }) => label)).toEqual(["grass", "grasshopper", "frog", "snake"]);
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html.match(/class="consumption-chain-annotation"/g)).toHaveLength(1);
    for (const cue of ["resource-source", "primary-consumer", "secondary-consumer", "top-consumer", "eaten-to-eater-arrows", "energy-flow-direction"]) expect(html).toContain(`data-visual-cue="${cue}"`);
    expect(html).not.toContain('class="doodle-object');
  });

  it("generalizes across labels and safely refuses incomplete, uncertain, negated, or contradictory chains", () => {
    for (const value of ["Algae is eaten by zooplankton, which is eaten by small fish, which is eaten by large fish.", "Grain is eaten by mouse, which is eaten by owl, which is eaten by eagle."]) expect(interpretTeacherText(value, initialScene).ok, value).toBe(true);
    for (const value of ["Grass is eaten by grasshopper.", "Grass is eaten by grasshopper, which is eaten by frog.", "Grass might be eaten by grasshopper, which is eaten by frog, which is eaten by snake.", "Grass is not eaten by grasshopper, which is eaten by frog, which is eaten by snake.", "Grass is eaten by grasshopper, which is eaten by grasshopper, which is eaten by snake.", "The food chain starts with grass, then a grasshopper eats it, then a frog eats the cricket, then a snake eats the frog."]) expect(interpretTeacherText(value, initialScene).ok, value).toBe(false);
  });
});
