import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import type { TegeeraGlyph } from "../glyphs/glyph";
import { compileUniversalScene } from "./universalScene";

const dragonGlyph: TegeeraGlyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [
    { id: "body", d: "M23 57 C26 39 47 34 65 43 C75 48 79 62 69 71 C55 80 31 75 23 57 Z", fill: "#84a98c", stroke: "#2f3e46" },
    { id: "neck-head", d: "M58 49 C63 35 73 28 85 34 C94 39 93 50 84 55 C76 59 69 54 62 59 Z", fill: "#84a98c", stroke: "#2f3e46" },
    { id: "snout", d: "M83 39 L97 44 L84 51 Z", fill: "#84a98c", stroke: "#2f3e46" },
    { id: "wing", d: "M48 43 Q42 14 23 18 L35 37 Q23 28 17 39 Q32 43 48 57 Z", fill: "#e9c46a", stroke: "#2f3e46" },
    { id: "tail", d: "M26 54 C15 51 13 39 5 36 Q13 59 29 66", fill: "none", stroke: "#2f3e46" },
    { id: "horn", d: "M72 33 L76 23 L80 35 Z", fill: "#f4a261", stroke: "#2f3e46" },
    { id: "leg-front", d: "M61 70 Q64 82 73 87", fill: "none", stroke: "#2f3e46" },
    { id: "leg-back", d: "M39 72 Q37 84 30 89", fill: "none", stroke: "#2f3e46" },
    { id: "eye", d: "M82 39 C85 39 86 42 84 44 C81 45 79 43 80 40 C80 39 81 39 82 39 Z", fill: "#2f3e46", stroke: "#2f3e46" }
  ],
  anchors: { top: [48, 18], ground: [52, 89], front: [97, 44] }
};

const villageGlyph: TegeeraGlyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [
    { id: "ground", d: "M5 88 Q49 84 95 88", fill: "none", stroke: "#52796f" },
    { id: "center-house", d: "M35 43 L66 43 L66 86 L35 86 Z", fill: "#cad2c5", stroke: "#2f3e46" },
    { id: "center-roof", d: "M29 45 L50 25 L72 45 Z", fill: "#f4a261", stroke: "#2f3e46" },
    { id: "door", d: "M47 65 L57 65 L57 86 L47 86 Z", fill: "#52796f", stroke: "#2f3e46" },
    { id: "left-house", d: "M8 58 L34 58 L34 86 L8 86 Z", fill: "#e9c46a", stroke: "#2f3e46" },
    { id: "left-roof", d: "M5 60 L21 45 L38 60 Z", fill: "#84a98c", stroke: "#2f3e46" },
    { id: "right-house", d: "M67 62 L92 62 L92 86 L67 86 Z", fill: "#cad2c5", stroke: "#2f3e46" },
    { id: "right-roof", d: "M63 64 L79 49 L96 64 Z", fill: "#e9c46a", stroke: "#2f3e46" }
  ],
  anchors: { top: [50, 25], ground: [50, 88], front: [92, 72] }
};

const cloudGlyph: TegeeraGlyph = {
  schemaVersion: "1.0.0", viewBox: "0 0 100 100",
  parts: [{ id: "cloud", d: "M16 67 C7 53 18 39 32 42 C36 24 62 20 70 40 C88 37 96 55 85 68 C67 77 34 77 16 67 Z", fill: "#cad2c5", stroke: "#2f3e46" }],
  anchors: { top: [52, 23], ground: [52, 74], front: [89, 55] }
};

const blueprint = {
  blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
  objects: [
    { id: "flying-dragon", label: "flying dragon", kind: "generic", color: "green", x: 18, y: 42, glyph: dragonGlyph },
    { id: "tiny-village", label: "tiny village", kind: "generic", x: 82, y: 60, glyph: villageGlyph }
  ],
  connections: [{ from: "flying-dragon", to: "tiny-village", label: "flies over" }]
};

describe("universal visual scene compiler", () => {
  it("refuses to turn a negated teacher claim into an affirmative scene", () => {
    for (const text of ["A dragon does not fly over a village", "A dragon never flies over a village", "A dragon can't fly over a village"]) {
      expect(() => compileUniversalScene(blueprint, initialScene, text)).toThrow(/negated claim/);
    }
    expect(() => compileUniversalScene(blueprint, initialScene, "A dragon flies over a village")).not.toThrow();
  });

  it("requires explicit colours to survive the model plan and catches swapped assignments", () => {
    const book = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [{ id: "book", label: "book", kind: "book", x: 50, y: 50 }], connections: [] };
    expect(() => compileUniversalScene(book, initialScene, "A yellow book")).toThrow(/omitted the stated yellow colour/);
    expect(() => compileUniversalScene({ ...book, objects: [{ ...book.objects[0], color: "blue" }] }, initialScene, "A yellow book"))
      .toThrow(/omitted the stated yellow colour/);
    expect(() => compileUniversalScene({ ...book, objects: [{ ...book.objects[0], color: "yellow" }] }, initialScene, "A yellow book"))
      .not.toThrow();

    const swapped = { ...book, objects: [
      { id: "ball", label: "ball", kind: "generic", x: 20, y: 50, color: "blue" },
      { id: "box", label: "box", kind: "generic", x: 80, y: 50, color: "red" }
    ] };
    expect(() => compileUniversalScene(swapped, initialScene, "A red ball and a blue box"))
      .toThrow(/wrong colour/);
  });

  it("requires a bounded blueprint instead of accepting direct model-supplied scene commands", () => {
    const script = compileUniversalScene(blueprint, initialScene, "A dragon flies over a village");
    expect(() => compileUniversalScene(script, initialScene, "A dragon flies over a village"))
      .toThrow(/incomplete visual blueprint/);
  });

  it("routes composable typed relations into the real part-whole visual grammar", () => {
    const candidate = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
      objects: [
        { id: "plant", label: "plant", kind: "generic", x: 78, y: 48 },
        { id: "roots", label: "roots", kind: "generic", x: 45, y: 72 },
        { id: "leaves", label: "leaves", kind: "generic", x: 45, y: 26 },
        { id: "water", label: "water", kind: "generic", x: 15, y: 72 },
        { id: "sunlight", label: "sunlight", kind: "generic", x: 15, y: 26 }
      ],
      connections: [
        { from: "roots", to: "plant", label: "part of", kind: "partOf" },
        { from: "leaves", to: "plant", label: "part of", kind: "partOf" },
        { from: "water", to: "roots", label: "flows into", kind: "flowsInto" },
        { from: "sunlight", to: "leaves", label: "illuminates", kind: "illuminates" }
      ]
    };
    const script = compileUniversalScene(candidate, initialScene, "A plant takes in water through its roots and sunlight through its leaves.");
    expect(script.commands.filter((command) => command.action === "relate").map((command) =>
      command.action === "relate" ? command.relation.kind : null)).toEqual(["partOf", "partOf", "flowsInto", "illuminates"]);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const html = renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />);
    for (const cue of ["visible-roots", "soil-boundary", "water-entry-arrow", "sun-symbol", "leaf-targeted-ray"]) {
      expect(html).toContain(cue);
    }
    expect(html).toContain('data-relation-layout="part-whole-flow"');

    const other = compileUniversalScene({
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "wheel", label: "wheel", kind: "generic", x: 20, y: 45 },
        { id: "vehicle", label: "vehicle", kind: "generic", x: 80, y: 45 }
      ],
      connections: [{ from: "wheel", to: "vehicle", label: "part of", kind: "partOf" }]
    }, initialScene, "A wheel is part of a vehicle");
    expect(validateDoodleScript(other, initialScene).ok).toBe(true);
    expect(renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, other)} />))
      .toContain('data-relation-layout="part-whole-flow"');
  });

  it("does not let a model relabel a typed visual meaning", () => {
    expect(() => compileUniversalScene({ ...blueprint,
      connections: [{ from: "flying-dragon", to: "tiny-village", label: "eats", kind: "partOf" }]
    }, initialScene, "A dragon eats a village")).toThrow(/incomplete visual blueprint/);
    expect(() => compileUniversalScene({ ...blueprint,
      connections: [{ from: "flying-dragon", to: "tiny-village", label: "flies over", kind: "unsupported" }]
    }, initialScene, "A dragon flies over a village")).toThrow(/incomplete visual blueprint/);
  });

  it("renders causal and temporal links as event flow, while rejecting a cycle", () => {
    const events = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "spark", label: "spark", kind: "generic", x: 15, y: 35 },
        { id: "fire", label: "fire", kind: "generic", x: 50, y: 35 },
        { id: "smoke", label: "smoke", kind: "generic", x: 85, y: 35 }
      ],
      connections: [
        { from: "spark", to: "fire", label: "causes", kind: "causes" },
        { from: "fire", to: "smoke", label: "before", kind: "before" }
      ]
    };
    const script = compileUniversalScene(events, initialScene, "A spark causes fire before smoke appears");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const html = renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />);
    expect(html.match(/data-relation-layout="event-graph"/g)).toHaveLength(2);
    expect(html).toContain("event-causes");
    const cycle = compileUniversalScene({ ...events, connections: [...events.connections,
      { from: "smoke", to: "spark", label: "causes", kind: "causes" }]
    }, initialScene, "A cycle");
    expect(validateDoodleScript(cycle, initialScene).ok).toBe(false);
  });

  it("compiles unfamiliar subjects from validated coherent glyphs into DoodleScript", () => {
    const script = compileUniversalScene(blueprint, initialScene, "A dragon flies over a tiny village");
    expect(script.schemaVersion).toBe("2.27.0");
    expect(script.commands.filter(({ action }) => action === "create")).toHaveLength(2);
    expect(validateDoodleScript(script, initialScene)).toMatchObject({ ok: true });
    expect(validateDoodleScript({ ...script, schemaVersion: "2.26.0" }, initialScene)).toMatchObject({ ok: false });

    const scene = applyDoodleScript(initialScene, script);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html.match(/class="validated-glyph"/g)).toHaveLength(2);
    expect(html).toContain("data-glyph-parts=\"9\"");
    expect(html).toContain("data-glyph-source=\"generated\"");
    expect(html).toContain("data-visual-cue=\"semantic-connection\"");
    expect(html).toContain("flies over");
  });

  it("can extend a compiled scene without clearing established identities", () => {
    const first = compileUniversalScene(blueprint, initialScene, "A dragon flies over a tiny village");
    const scene = applyDoodleScript(initialScene, first);
    const extension = compileUniversalScene({
      blueprintVersion: "1.0", mode: "extend", confidence: 0.9,
      objects: [{ id: "storm-cloud", label: "storm cloud", kind: "generic", x: 50, y: 10, glyph: cloudGlyph }],
      connections: [{ from: "storm-cloud", to: "flying-dragon", label: "above" }]
    }, scene, "Add a storm cloud above the dragon");
    expect(extension.commands.some(({ action }) => action === "clear")).toBe(false);
    expect(validateDoodleScript(extension, scene)).toMatchObject({ ok: true });
    expect(applyDoodleScript(scene, extension).entities).toHaveLength(3);
  });

  it("rejects unsafe vector instructions before they reach SVG", () => {
    expect(() => compileUniversalScene({
      ...blueprint,
      objects: [{ ...blueprint.objects[0], glyph: { ...dragonGlyph, parts: [
        { id: "unsafe", d: "M10 10 L190 90 Z", fill: "#84a98c", stroke: "#2f3e46" }
      ] } }]
    }, initialScene, "unsafe")).toThrow();
  });

  it("reuses a validated cached glyph over a new model glyph and accepts omitted glyphs", () => {
    const cached = new Map([["flying dragon", dragonGlyph]]);
    const replaced = compileUniversalScene({
      ...blueprint,
      objects: [{ ...blueprint.objects[0], glyph: cloudGlyph }], connections: []
    }, initialScene, "A flying dragon", { cache: cached });
    const create = replaced.commands.find((command) => command.action === "create");
    expect(create?.action).toBe("create");
    if (create?.action !== "create") return;
    expect(create.entity.glyph).toEqual(dragonGlyph);
    expect(create.entity.glyphSource).toBe("cache");

    const omitted = compileUniversalScene({
      ...blueprint,
      objects: [{ id: "flying-dragon", label: "flying dragon", kind: "generic", x: 50, y: 50 }], connections: []
    }, initialScene, "A flying dragon", { cache: cached });
    expect(validateDoodleScript(omitted, initialScene).ok).toBe(true);
    const placeholderScript = compileUniversalScene({
      ...blueprint,
      objects: [{ id: "unseen", label: "unseen thing", kind: "generic", x: 50, y: 50 }], connections: []
    }, initialScene, "unseen thing", { cache: cached });
    expect(validateDoodleScript(placeholderScript, initialScene).ok).toBe(true);
    expect(renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, placeholderScript)} />))
      .toContain('data-glyph-source="sticker"');
  });

  it("preserves a relation when the model refers to unique visible labels instead of IDs", () => {
    const script = compileUniversalScene({
      ...blueprint,
      connections: [{ from: "flying dragon", to: "tiny village", label: "flies over" }]
    }, initialScene, "A dragon flies over a tiny village");
    expect(script.commands.filter(({ action }) => action === "relate")).toHaveLength(1);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.relations?.[0]).toMatchObject({ sourceIds: ["flying-dragon"], targetIds: ["tiny-village"] });
  });

  it("never accepts a partially connected or ambiguous visual plan", () => {
    const missing = { ...blueprint, connections: [{ from: "flying-dragon", to: "missing-object", label: "flies over" }] };
    expect(() => compileUniversalScene(missing, initialScene, "A dragon flies over a tiny village"))
      .toThrow(/missing or ambiguous/);
    expect(() => compileUniversalScene({ ...blueprint, connections: [
      { from: "flying-dragon", to: "tiny-village", label: "flies over" },
      { from: "flying-dragon", to: "unknown", label: "guards" }
    ] }, initialScene, "Two relationships"))
      .toThrow(/missing or ambiguous/);
    expect(() => compileUniversalScene({ ...blueprint, connections: [
      { from: "flying-dragon", to: "flying-dragon", label: "flies over" }
    ] }, initialScene, "Self relationship"))
      .toThrow(/missing or ambiguous/);
    expect(() => compileUniversalScene({ ...blueprint, objects: [
      { id: "first", label: "same label", kind: "generic", x: 20, y: 40 },
      { id: "second", label: "same label", kind: "generic", x: 80, y: 40 }
    ], connections: [{ from: "same label", to: "first", label: "follows" }] }, initialScene, "Ambiguous labels"))
      .toThrow(/missing or ambiguous/);
    expect(() => compileUniversalScene({ ...blueprint, objects: [
      blueprint.objects[0], { ...blueprint.objects[1], id: blueprint.objects[0].id }
    ] }, initialScene, "Duplicate IDs"))
      .toThrow(/object ID more than once/);
  });

  it("connects an extension to an established object without losing its identity", () => {
    const first = compileUniversalScene(blueprint, initialScene, "A dragon flies over a tiny village");
    const scene = applyDoodleScript(initialScene, first);
    const extension = compileUniversalScene({
      blueprintVersion: "1.0", mode: "extend", confidence: 0.9,
      objects: [{ id: "storm-cloud", label: "storm cloud", kind: "generic", x: 50, y: 10 }],
      connections: [{ from: "storm cloud", to: "flying dragon", label: "above" }]
    }, scene, "Add a storm cloud above the dragon");
    expect(validateDoodleScript(extension, scene).ok).toBe(true);
    expect(extension.commands.find((command) => command.action === "relate"))
      .toMatchObject({ relation: { sourceIds: ["storm-cloud"], targetIds: ["flying-dragon"] } });
    expect(() => compileUniversalScene({
      blueprintVersion: "1.0", mode: "extend", confidence: 0.9,
      objects: [{ id: "flying-dragon", label: "another dragon", kind: "generic", x: 50, y: 10 }],
      connections: []
    }, scene, "Add another dragon"))
      .toThrow(/object ID more than once/);
  });

  it("keeps model-supplied left/right and above/below order when assigning safe slots", () => {
    const horizontal = compileUniversalScene({
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "right", label: "orb", kind: "generic", x: 25, y: 30 },
        { id: "left", label: "star", kind: "generic", x: 15, y: 30 }
      ], connections: [{ from: "left", to: "right", label: "left of" }]
    }, initialScene, "A star is left of an orb");
    const horizontalScene = applyDoodleScript(initialScene, horizontal);
    expect(horizontalScene.entities.find(({ id }) => id === "left")!.x)
      .toBeLessThan(horizontalScene.entities.find(({ id }) => id === "right")!.x);
    expect(validateDoodleScript(horizontal, initialScene).ok).toBe(true);

    const vertical = compileUniversalScene({
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: [
        { id: "lower", label: "orb", kind: "generic", x: 50, y: 46 },
        { id: "upper", label: "star", kind: "generic", x: 50, y: 38 }
      ], connections: [{ from: "upper", to: "lower", label: "above" }]
    }, initialScene, "A star is above an orb");
    const verticalScene = applyDoodleScript(initialScene, vertical);
    expect(verticalScene.entities.find(({ id }) => id === "upper")!.y)
      .toBeLessThan(verticalScene.entities.find(({ id }) => id === "lower")!.y);
    expect(validateDoodleScript(vertical, initialScene).ok).toBe(true);
  });

  it("assigns a full eight-object blueprint deterministically", () => {
    const full = {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: Array.from({ length: 8 }, (_, index) => ({
        id: `node-${index + 1}`, label: `node ${index + 1}`, kind: "generic",
        x: 14 + (index % 4) * 24, y: index < 4 ? 30 : 68
      })), connections: []
    };
    const first = compileUniversalScene(full, initialScene, "Eight nodes");
    const second = compileUniversalScene(full, initialScene, "Eight nodes");
    expect(first).toEqual(second);
    expect(validateDoodleScript(first, initialScene).ok).toBe(true);
  });
});
