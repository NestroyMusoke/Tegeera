import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DoodleCanvas } from "./DoodleCanvas";
import { compileUniversalScene } from "../llm/universalScene";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import type { SceneState } from "../doodlescript/schema";

function sceneFor(content: string) {
  const script = compileUniversalScene({ blueprintVersion: "1.0", mode: "replace", confidence: .95,
    objects: [{ id: "holder", label: "container", kind: "generic", x: 25, y: 50 },
      { id: "item", label: content, kind: "generic", x: 75, y: 50 }],
    connections: [{ from: "holder", to: "item", kind: "contains", label: "contains" }]
  }, initialScene, `A container contains a ${content}.`);
  expect(validateDoodleScript(script, initialScene).ok).toBe(true);
  return applyDoodleScript(initialScene, script);
}
function drawing(scene: SceneState) {
  const root = document.createElement("div");
  root.innerHTML = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
  return root;
}

it.each(["camera", "thermometer", "book", "yellow lemon"])("retains %s artwork inside the shared containment outline", (noun) => {
  const scene = sceneFor(noun);
  const before = structuredClone(scene);
  const root = drawing(scene);
  const contained = root.querySelector('[data-visual-cue="value-inside-container"]')!;
  expect(contained.querySelector('[data-visual-cue="contained-artwork"]')).not.toBeNull();
  expect(contained.textContent).toContain(noun);
  expect(root.querySelectorAll('[data-entity-id="item"]')).toHaveLength(1);
  expect(scene).toEqual(before);
  if (noun === "yellow lemon") {
    expect(contained.querySelector('[data-entity-color="yellow"]')).not.toBeNull();
    expect(contained.querySelector("feColorMatrix")).not.toBeNull();
  }
});

it("retains an honest labelled value when no artwork exists", () => {
  const root = drawing(sceneFor("unmapped concept"));
  const contained = root.querySelector('[data-visual-cue="value-inside-container"]')!;
  expect(contained.textContent).toContain("unmapped concept");
  expect(contained.querySelector('[data-visual-cue="contained-artwork"]')).toBeNull();
});

it("fits long enclosure and content labels without moving the scene", () => {
  const scene = sceneFor("portable oxygen cylinder");
  scene.entities.find((entity) => entity.visualRole === "container")!.label = "emergency medical cabinet";
  const before = structuredClone(scene);
  const root = drawing(scene);
  const labels = [...root.querySelectorAll('[data-bounded-label="true"]')];
  expect(labels).toHaveLength(2);
  expect(labels.map((label) => label.getAttribute("aria-label"))).toEqual(["emergency medical cabinet", "portable oxygen cylinder"]);
  for (const label of labels) {
    expect(label.querySelectorAll("text").length).toBeGreaterThan(1);
    for (const line of label.querySelectorAll("text")) {
      expect(Number(line.getAttribute("textLength"))).toBeLessThanOrEqual(Number(label.getAttribute("data-label-width")));
    }
  }
  expect(scene).toEqual(before);
});

it("renders supplied validated artwork through the same nested path without changing the scene", () => {
  const scene = sceneFor("unmapped concept");
  const item = scene.entities.find((entity) => entity.visualRole === "contained")!;
  item.glyph = { schemaVersion: "1.0.0", viewBox: "0 0 100 100",
    parts: [{ id: "outline", d: "M10 10 L90 10 L50 90 Z", fill: "none", stroke: "#2f3e46" }],
    anchors: { top: [50, 10], ground: [50, 90], front: [90, 50] } };
  const before = structuredClone(scene);
  expect(drawing(scene).querySelector('[data-visual-cue="contained-artwork"] .validated-glyph')).not.toBeNull();
  expect(scene).toEqual(before);
});
