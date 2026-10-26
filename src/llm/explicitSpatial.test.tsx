import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntityGlyph } from "../components/entityRenderers";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { compileUniversalScene } from "./universalScene";

describe("explicit spatial recovery and coloured artwork", () => {
  it.each(["red", "blue", "yellow", "purple"])("resolves %s artwork using the explicit colour attribute", (color) => {
    for (const [noun, expectedKind] of [["cup", "generic"], ["book", "book"], ["car", "car"]]) {
      const script = compileUniversalScene({ blueprintVersion: "1.0", confidence: .95,
        objects: [{ id: "subject", label: `${color} ${noun}`, color, kind: "generic", x: 50, y: 50 }],
        connections: [] }, initialScene, `A ${color} ${noun}.`);
      expect(validateDoodleScript(script, initialScene).ok).toBe(true);
      const entity = applyDoodleScript(initialScene, script).entities[0];
      expect(entity.kind).toBe(expectedKind);
      expect(entity.color).toBe(color);
      if (noun === "cup") expect(entity.glyphSource).toBe("provisional");
    }
  });

  it.each(["blue whale", "black hole", "red sea", "family tree", "car engine"])(
    "preserves the identity of %s without colour evidence", (label) => {
      const script = compileUniversalScene({ blueprintVersion: "1.0", confidence: .95,
        objects: [{ id: "subject", label, kind: "generic", x: 50, y: 50 }], connections: []
      }, initialScene, "Draw the subject.");
      const entity = applyDoodleScript(initialScene, script).entities[0];
      expect(entity.kind).toBe("generic");
      expect(entity.label).toBe(label);
      expect(entity.glyph).toBeUndefined();
    });

  it("recovers an omitted spatial link beside a containment relation", () => {
    const script = compileUniversalScene({ blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [{ id: "case", label: "case", kind: "generic", x: 50, y: 50 },
        { id: "camera", label: "camera", kind: "generic", x: 50, y: 50 },
        { id: "observer", label: "photographer", kind: "person", x: 80, y: 50 }],
      connections: [{ from: "case", to: "camera", kind: "contains", label: "contains" },
        { from: "observer", to: "camera", label: "points at" }] }, initialScene,
    "A case contains a camera. A photographer stands to the left of the case and points at the camera.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.relations).toHaveLength(3);
    expect(scene.entities.find((entity) => entity.id === "observer")!.x)
      .toBeLessThan(scene.entities.find((entity) => entity.id === "case")!.x);
  });
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
