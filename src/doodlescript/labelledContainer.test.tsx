import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { labelledContainerGeometry, matchLabelledContainer } from "./labelledContainer";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const validated = validateDoodleScript(interpreted.script, initialScene);
  if (!validated.ok) throw new Error(JSON.stringify(validated.issues));
  return { script: validated.script, scene: applyDoodleScript(initialScene, validated.script) };
}

describe("open labelled-container grammar", () => {
  it("extracts reusable slots rather than a programming-specific sentence", () => {
    expect(matchLabelledContainer("a variable is just a labeled box that holds a value")).toEqual({
      containerText: "variable", contentText: "value", shape: "box"
    });
    expect(matchLabelledContainer("a specimen jar is a labelled container that contains a sample")).toEqual({
      containerText: "specimen jar", contentText: "sample", shape: "container"
    });
    expect(matchLabelledContainer("a box holds a value")).toBeNull();
  });

  it("builds two identities and a typed DoodleScript 2.2 containment relation", () => {
    const { script, scene } = build("A variable is just a labeled box that holds a value.");
    expect(script.schemaVersion).toBe("2.2.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual([
      ["variable", "container"], ["value", "contained"]
    ]);
    expect(scene.relations).toEqual([expect.objectContaining({
      kind: "contains", predicate: "contains",
      sourceIds: [scene.entities[0].id], targetIds: [scene.entities[1].id]
    })]);
    expect(labelledContainerGeometry(scene.relations![0], scene.entities)).not.toBeNull();
  });

  it("renders clear nested meaning without duplicate concept bubbles", () => {
    const { scene } = build("A variable is just a labeled box that holds a value.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="labelled-container"');
    expect(html).toContain('data-layout-topology="nested-container"');
    expect(html).toContain('data-visual-cue="container-outline"');
    expect(html).toContain('data-visual-cue="variable-label"');
    expect(html).toContain('data-visual-cue="value-inside-container"');
    expect(html).toContain('aria-label="variable contains value"');
    expect(html).not.toContain('class="doodle-object');
  });

  it("generalizes across domains and rejects forged role or version claims", () => {
    const { script, scene } = build("A specimen jar is a labelled container that contains a sample.");
    expect(scene.entities.map(({ label }) => label)).toEqual(["specimen jar", "sample"]);
    expect(validateDoodleScript({ ...script, schemaVersion: "2.1.0" }, initialScene).ok).toBe(false);
    const forged = structuredClone(script);
    const content = forged.commands.find((command) => command.action === "create" && command.entity.visualRole === "contained");
    if (content?.action === "create") content.entity.visualRole = "container";
    expect(validateDoodleScript(forged, initialScene).ok).toBe(false);
  });
});
