import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { circulationLoopGeometry, matchCirculationLoop } from "./circulationLoop";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const checked = validateDoodleScript(interpreted.script, initialScene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { script: checked.script, scene: applyDoodleScript(initialScene, checked.script) };
}

describe("open circulation-loop construction", () => {
  it("binds reusable source, destination, payload, and enrichment slots", () => {
    expect(matchCirculationLoop("the heart pumps blood to the lungs and the lungs send it back full of oxygen")).toEqual({
      sourceText: "heart", destinationText: "lungs", payloadText: "blood", enrichmentText: "oxygen"
    });
    expect(matchCirculationLoop("a pump sends water to a filter and the filter returns it back with minerals")).toEqual({
      sourceText: "pump", destinationText: "filter", payloadText: "water", enrichmentText: "minerals"
    });
    expect(matchCirculationLoop("a pump sends water to a filter and a tank returns it back with minerals")).toBeNull();
    expect(matchCirculationLoop("the heart pumps blood to the lungs")).toBeNull();
  });

  it("builds case 2 as four identities and three payload-aware meanings", () => {
    const { script, scene } = build("The heart pumps blood to the lungs, and the lungs send it back full of oxygen.");
    expect(script.schemaVersion).toBe("2.6.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual([
      ["heart", "circulation-source"], ["lungs", "circulation-destination"],
      ["blood", "circulation-payload"], ["oxygen", "circulation-enrichment"]
    ]);
    expect(scene.relations).toEqual([
      expect.objectContaining({ kind: "pumpsTo", objectIds: [scene.entities[2].id] }),
      expect.objectContaining({ kind: "returnsTo", objectIds: [scene.entities[2].id] }),
      expect.objectContaining({ kind: "carries", sourceIds: [scene.entities[2].id], targetIds: [scene.entities[3].id] })
    ]);
    expect(circulationLoopGeometry(scene.relations!, scene.entities)).not.toBeNull();
  });

  it("renders one accessible closed loop with all independent visual cues", () => {
    const { scene } = build("The heart pumps blood to the lungs, and the lungs send it back full of oxygen.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="circulation-loop"');
    expect(html).toContain('data-layout-topology="closed-loop"');
    for (const cue of ["heart-shape", "paired-lung-shapes", "outbound-blood-arrow", "oxygenated-return-arrow", "closed-circulation-loop"]) {
      expect(html).toContain(cue);
    }
    expect(html).toContain('aria-label="heart pumps blood to lungs; lungs return blood carrying oxygen to heart"');
    expect(html.match(/class="circulation-loop-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects incomplete, mismatched-payload, wrong-role, and pre-2.6 scripts", () => {
    const { script } = build("A pump sends water to a filter, and the filter returns it back with minerals.");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.5.0" }, initialScene).ok).toBe(false);
    const incomplete = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.kind !== "returnsTo") };
    expect(validateDoodleScript(incomplete, initialScene).ok).toBe(false);
    const wrongRole = structuredClone(script);
    const firstCreate = wrongRole.commands.find((command) => command.action === "create");
    if (firstCreate?.action === "create") firstCreate.entity.visualRole = "object";
    expect(validateDoodleScript(wrongRole, initialScene).ok).toBe(false);
    const mismatch = structuredClone(script);
    const returning = mismatch.commands.find((command) => command.action === "relate" && command.relation.kind === "returnsTo");
    if (returning?.action === "relate") returning.relation.objectIds = ["missing-payload"];
    expect(validateDoodleScript(mismatch, initialScene).ok).toBe(false);
  });
});
