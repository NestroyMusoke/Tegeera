import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { landscapeFlowGeometry, matchLandscapeFlow } from "./landscapeFlow";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const checked = validateDoodleScript(interpreted.script, initialScene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { script: checked.script, scene: applyDoodleScript(initialScene, checked.script) };
}

describe("open landscape-flow construction", () => {
  it("binds reusable watercourse, elevated-source, and destination roles", () => {
    expect(matchLandscapeFlow("rivers usually flow from higher ground down to the sea")).toEqual({
      watercourseText: "rivers", sourceText: "higher ground", destinationText: "sea"
    });
    expect(matchLandscapeFlow("a stream runs downhill from a mountain into a lake")).toEqual({
      watercourseText: "stream", sourceText: "mountain", destinationText: "lake"
    });
    expect(matchLandscapeFlow("water flows from an upland slope towards a reservoir")).toEqual({
      watercourseText: "water", sourceText: "upland slope", destinationText: "reservoir"
    });
    expect(matchLandscapeFlow("water flows from a tank to a bucket")).toBeNull();
    expect(matchLandscapeFlow("a river flows from a town to the sea")).toBeNull();
    expect(matchLandscapeFlow("traffic flows from higher ground to the sea")).toBeNull();
  });

  it("builds case 41 as three identities and two typed directional meanings", () => {
    const { script, scene } = build("Rivers usually flow from higher ground down to the sea.");
    expect(script.schemaVersion).toBe("2.4.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual([
      ["rivers", "watercourse"], ["higher ground", "elevated-source"], ["sea", "water-destination"]
    ]);
    expect(scene.relations).toEqual([
      expect.objectContaining({ kind: "flowsFrom", predicate: "flowsFrom" }),
      expect.objectContaining({ kind: "flowsTo", predicate: "flowsTo" })
    ]);
    const geometry = landscapeFlowGeometry(scene.relations!, scene.entities)!;
    expect(geometry.sourceX).toBeLessThan(geometry.riverX);
    expect(geometry.riverX).toBeLessThan(geometry.destinationX);
    expect(geometry.sourceY).toBeLessThan(geometry.riverY);
    expect(geometry.riverY).toBeLessThan(geometry.destinationY);
  });

  it("renders one continuous accessible landscape with every independent cue", () => {
    const { scene } = build("A stream runs downhill from a mountain into a lake.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="landscape-flow"');
    expect(html).toContain('data-layout-topology="elevation-cross-section"');
    for (const cue of ["elevation-cross-section", "continuous-river-path", "downhill-flow-arrow", "sea-shape"]) {
      expect(html).toContain(`data-visual-cue="${cue}"`);
    }
    expect(html).toContain('aria-label="stream flows from mountain to lake"');
    expect(html.match(/class="landscape-flow-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects forged roles, incomplete flow pairs, and pre-2.4 claims", () => {
    const { script } = build("Rivers flow from hills to the ocean.");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.3.0" }, initialScene).ok).toBe(false);
    const wrongRole = structuredClone(script);
    const firstCreate = wrongRole.commands.find((command) => command.action === "create");
    if (firstCreate?.action === "create") firstCreate.entity.visualRole = "object";
    expect(validateDoodleScript(wrongRole, initialScene).ok).toBe(false);
    const incomplete = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.kind !== "flowsTo") };
    expect(validateDoodleScript(incomplete, initialScene).ok).toBe(false);
  });
});
