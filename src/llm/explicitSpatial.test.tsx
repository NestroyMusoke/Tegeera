import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntityGlyph } from "../components/entityRenderers";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { compileUniversalScene } from "./universalScene";

describe("explicit spatial recovery and coloured artwork", () => {
  it("recovers an explicit noun-phrase attribute before client colour validation", () => {
    const script = compileUniversalScene({ blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [{ id: "a", label: "purple octopus", kind: "generic", x: 50, y: 50 }], connections: [] }, initialScene, "A purple octopus.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(applyDoodleScript(initialScene, script).entities[0].color).toBe("purple");
  });

  it("places a supported object above its support despite horizontal model coordinates", () => {
    const script = compileUniversalScene({ blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [{ id: "b", label: "book", kind: "generic", x: 70, y: 50 },
        { id: "d", label: "desk", kind: "generic", x: 30, y: 50 }],
      connections: [{ from: "b", to: "d", label: "rests on" }] }, initialScene, "A book rests on a desk.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const [book, desk] = applyDoodleScript(initialScene, script).entities;
    expect(book.y).toBeLessThan(desk.y);
  });
  it("restores missing spatial relations and paints an outline-only glyph in its stated colour", () => {
    const plan = { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [{ id: "a", label: "red cup", color: "red", kind: "generic", x: 30, y: 40 },
        { id: "b", label: "blue book", color: "blue", kind: "generic", x: 70, y: 40 },
        { id: "c", label: "flower", kind: "generic", x: 30, y: 70 }], connections: [] };
    const script = compileUniversalScene(plan, initialScene, "A red cup stands beside a blue book, with a flower above the cup.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    const [cup, book, flower] = scene.entities;
    expect(scene.relations).toHaveLength(2);
    expect(cup.y).toBe(book.y);
    expect(flower.y).toBeLessThan(cup.y);
    expect(book.kind).toBe("book");
    expect(cup.glyphSource).toBe("provisional");
    const markup = renderToStaticMarkup(<EntityGlyph entity={cup} />);
    expect(markup).toContain('stroke="#e86f68"');
    expect(markup).toContain('fill="none"');
    expect(cup.glyph!.parts.every((part) => part.stroke === "#2f3e46")).toBe(true);
  });

  it.each(["blue family tree", "red book cover"])("does not turn %s into a misleading hero rig", (label) => {
    const color = label.split(" ")[0];
    const script = compileUniversalScene({ blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [{ id: "a", label, color, kind: "generic", x: 50, y: 50 }], connections: [] }, initialScene, `A ${label}.`);
    expect(applyDoodleScript(initialScene, script).entities[0].kind).toBe("generic");
  });
});
