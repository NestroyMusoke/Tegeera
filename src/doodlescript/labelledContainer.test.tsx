import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { labelledContainerGeometry, matchLabelledContainer, planLabelledContainer } from "./labelledContainer";
import type { SceneEntity, SceneRelation } from "./schema";
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
  it("places two connected objects on one requested side without overlap or mutation", () => {
    const { scene } = build("A variable is a labeled box that holds a value.");
    const holder = scene.entities[0];
    const extras: SceneEntity[] = ["observer-a", "observer-b"].map((id) => ({
      id, label: id, kind: "person", x: 80, y: 50, scale: .92, direction: "right", highlighted: false
    }));
    const edges: SceneRelation[] = extras.map(({ id }) => ({ id: `left-${id}`, kind: "relatesTo",
      predicate: "left of", sourceIds: [id], targetIds: [holder.id] }));
    const extended = { ...scene, entities: [...scene.entities, ...extras], relations: [...scene.relations!, ...edges] };
    const before = JSON.stringify(extended);
    const moves = planLabelledContainer(extended, holder.id, scene.entities[1].id, new Set(extended.entities.map(({ id }) => id)));
    expect(moves).toBeTruthy();
    expect(moves).toEqual(planLabelledContainer(extended, holder.id, scene.entities[1].id, new Set(extended.entities.map(({ id }) => id))));
    const placed = extras.map(({ id }) => moves!.find((move) => move.targetId === id)!);
    expect(placed.every((move) => move.x < moves!.find((move) => move.targetId === holder.id)!.x)).toBe(true);
    expect(Math.abs(placed[0].y - placed[1].y)).toBeGreaterThan(26 * .92);
    expect(JSON.stringify(extended)).toBe(before);
    const contradiction = { ...extended, relations: [...extended.relations,
      { ...edges[0], id: "contradiction", predicate: "right of" }] };
    expect(planLabelledContainer(contradiction, holder.id, scene.entities[1].id,
      new Set(extended.entities.map(({ id }) => id)))).toBeNull();
  });
  it("extracts reusable slots rather than a programming-specific sentence", () => {
    expect(matchLabelledContainer("a variable is just a labeled box that holds a value")).toEqual({
      containerText: "variable", contentText: "value", shape: "box"
    });
    expect(matchLabelledContainer("a specimen jar is a labelled container that contains a sample")).toEqual({
      containerText: "specimen jar", contentText: "sample", shape: "container"
    });
    expect(matchLabelledContainer("a cache is a labeled box that stores itself")).toBeNull();
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
