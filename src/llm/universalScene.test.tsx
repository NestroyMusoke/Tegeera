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
      objects: [{ ...blueprint.objects[0], glyph: cloudGlyph }]
    }, initialScene, "A flying dragon", { cache: cached });
    const create = replaced.commands.find((command) => command.action === "create");
    expect(create?.action).toBe("create");
    if (create?.action !== "create") return;
    expect(create.entity.glyph).toEqual(dragonGlyph);
    expect(create.entity.glyphSource).toBe("cache");

    const omitted = compileUniversalScene({
      ...blueprint,
      objects: [{ id: "flying-dragon", label: "flying dragon", kind: "generic", x: 50, y: 50 }]
    }, initialScene, "A flying dragon", { cache: cached });
    expect(validateDoodleScript(omitted, initialScene).ok).toBe(true);
    const placeholderScript = compileUniversalScene({
      ...blueprint,
      objects: [{ id: "unseen", label: "unseen thing", kind: "generic", x: 50, y: 50 }]
    }, initialScene, "unseen thing", { cache: cached });
    expect(validateDoodleScript(placeholderScript, initialScene).ok).toBe(true);
    expect(renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, placeholderScript)} />))
      .toContain('data-glyph-source="sticker"');
  });
});
