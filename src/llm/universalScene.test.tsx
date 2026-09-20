import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { compileUniversalScene } from "./universalScene";

const blueprint = {
  blueprintVersion: "1.0",
  mode: "replace",
  confidence: 0.91,
  objects: [
    {
      id: "flying-dragon", label: "flying dragon", kind: "generic", color: "green", x: 18, y: 42,
      visual: { motion: "float", primitives: [
        { shape: "ellipse", x: 0, y: 0, width: 72, height: 38, rotation: 0, tone: "primary" },
        { shape: "triangle", x: -24, y: -22, width: 35, height: 30, rotation: -18, tone: "accent" },
        { shape: "triangle", x: 24, y: -22, width: 35, height: 30, rotation: 18, tone: "accent" }
      ] }
    },
    {
      id: "tiny-village", label: "tiny village", kind: "generic", x: 82, y: 60,
      visual: { motion: "none", primitives: [
        { shape: "rect", x: 0, y: 12, width: 58, height: 42, rotation: 0, tone: "muted" },
        { shape: "triangle", x: 0, y: -22, width: 70, height: 35, rotation: 0, tone: "accent" }
      ] }
    }
  ],
  connections: [{ from: "flying-dragon", to: "tiny-village", label: "flies over" }]
};

describe("universal visual scene compiler", () => {
  it("compiles unfamiliar subjects from reusable primitives into validated DoodleScript", () => {
    const script = compileUniversalScene(blueprint, initialScene, "A dragon flies over a tiny village");
    expect(script.schemaVersion).toBe("2.26.0");
    expect(script.commands.filter(({ action }) => action === "create")).toHaveLength(2);
    expect(validateDoodleScript(script, initialScene)).toMatchObject({ ok: true });
    expect(validateDoodleScript({ ...script, schemaVersion: "2.25.0" }, initialScene)).toMatchObject({ ok: false });

    const scene = applyDoodleScript(initialScene, script);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html.match(/data-procedural-visual="true"/g)).toHaveLength(2);
    expect(html).toContain("data-primitive-count=\"3\"");
    expect(html).toContain("data-visual-cue=\"semantic-connection\"");
    expect(html).toContain("flies over");
  });

  it("can extend a compiled scene without clearing established identities", () => {
    const first = compileUniversalScene(blueprint, initialScene, "A dragon flies over a tiny village");
    const scene = applyDoodleScript(initialScene, first);
    const extension = compileUniversalScene({
      blueprintVersion: "1.0", mode: "extend", confidence: 0.9,
      objects: [{
        id: "storm-cloud", label: "storm cloud", kind: "generic", x: 50, y: 10,
        visual: { motion: "float", primitives: [
          { shape: "ellipse", x: 0, y: 0, width: 75, height: 35, rotation: 0, tone: "muted" }
        ] }
      }],
      connections: [{ from: "storm-cloud", to: "flying-dragon", label: "above" }]
    }, scene, "Add a storm cloud above the dragon");
    expect(extension.commands.some(({ action }) => action === "clear")).toBe(false);
    expect(validateDoodleScript(extension, scene)).toMatchObject({ ok: true });
    expect(applyDoodleScript(scene, extension).entities).toHaveLength(3);
  });

  it("rejects excessive or unsafe vector instructions before they reach SVG", () => {
    expect(() => compileUniversalScene({
      ...blueprint,
      objects: [{ ...blueprint.objects[0], visual: { motion: "none", primitives: [
        { shape: "path", x: 0, y: 0, width: 10, height: 10, rotation: 0, tone: "primary" }
      ] } }]
    }, initialScene, "unsafe")).toThrow();
  });
});
