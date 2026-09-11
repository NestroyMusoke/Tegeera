import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";
import { matchWaterCycleLoop, waterCycleGeometry } from "./waterCycleLoop";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const checked = validateDoodleScript(interpreted.script, initialScene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { script: checked.script, scene: applyDoodleScript(initialScene, checked.script) };
}

describe("open water-cycle construction", () => {
  it("binds reusable precipitation, infiltration, and evaporation wording", () => {
    expect(matchWaterCycleLoop("rain falls, soaks into the soil, and some of it later comes back up as evaporation")).toEqual({
      cloudText: "cloud", rainText: "rain", soilText: "soil", waterText: "water", evaporationText: "evaporation"
    });
    expect(matchWaterCycleLoop("rainfall comes down and seeps into the ground, and some of it rises back up as water vapor")).toEqual({
      cloudText: "cloud", rainText: "rain", soilText: "ground", waterText: "water", evaporationText: "evaporation"
    });
    expect(matchWaterCycleLoop("rain falls and soaks into soil")).toBeNull();
    expect(matchWaterCycleLoop("rain falls, soaks into soil, and steam appears")).toBeNull();
  });

  it("builds five identities and the complete typed loop", () => {
    const { script, scene } = build("Rain falls, soaks into the soil, and some of it later comes back up as evaporation.");
    expect(script.schemaVersion).toBe("2.10.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual([
      ["cloud", "cycle-cloud"], ["rain", "cycle-rain"], ["soil", "cycle-soil"],
      ["water", "cycle-water"], ["evaporation", "cycle-evaporation"]
    ]);
    expect(scene.relations).toEqual([
      expect.objectContaining({ kind: "fallsTo", sourceIds: [scene.entities[1].id], targetIds: [scene.entities[2].id] }),
      expect.objectContaining({ kind: "infiltrates", sourceIds: [scene.entities[3].id], targetIds: [scene.entities[2].id] }),
      expect.objectContaining({ kind: "evaporatesTo", sourceIds: [scene.entities[4].id], targetIds: [scene.entities[0].id] })
    ]);
    expect(waterCycleGeometry(scene.relations!, scene.entities)).not.toBeNull();
  });

  it("renders a closed environmental loop rather than concept bubbles", () => {
    const { scene } = build("Rain falls, soaks into the soil, and some of it later comes back up as evaporation.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="water-cycle-loop"');
    expect(html).toContain('data-layout-topology="environmental-cycle"');
    for (const cue of ["cloud-symbol", "rain-arrow-down", "soil-infiltration", "evaporation-arrow-up", "closed-water-loop"]) expect(html).toContain(cue);
    expect(html).toContain('aria-label="rain falls to soil; water infiltrates soil; evaporation rises to cloud"');
    expect(html.match(/class="water-cycle-loop-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects old-version, incomplete, wrong-role, and disconnected loops", () => {
    const { script } = build("Rain falls, soaks into the soil, and some of it later comes back up as evaporation.");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.9.0" }, initialScene).ok).toBe(false);
    const incomplete = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.kind !== "evaporatesTo") };
    expect(validateDoodleScript(incomplete, initialScene).ok).toBe(false);
    const wrongRole = structuredClone(script);
    const rain = wrongRole.commands.find((command) => command.action === "create" && command.entity.visualRole === "cycle-rain");
    if (rain?.action === "create") rain.entity.visualRole = "object";
    expect(validateDoodleScript(wrongRole, initialScene).ok).toBe(false);
    const disconnected = structuredClone(script);
    const infiltration = disconnected.commands.find((command) => command.action === "relate" && command.relation.kind === "infiltrates");
    const cloud = disconnected.commands.find((command) => command.action === "create" && command.entity.visualRole === "cycle-cloud");
    if (infiltration?.action === "relate" && cloud?.action === "create") infiltration.relation.targetIds = [cloud.entity.id];
    expect(validateDoodleScript(disconnected, initialScene).ok).toBe(false);
  });
});
