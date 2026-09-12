import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { lifecycleSequenceGeometry, matchLifecycleSequence } from "./lifecycleSequence";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

function build(text: string) {
  const interpreted = interpretTeacherText(text, initialScene);
  if (!interpreted.ok) throw new Error(interpreted.message);
  const checked = validateDoodleScript(interpreted.script, initialScene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { script: checked.script, scene: applyDoodleScript(initialScene, checked.script) };
}

describe("open lifecycle-sequence construction", () => {
  it("supports open explicit stages and only catalogued omitted stages", () => {
    expect(matchLifecycleSequence("egg develops into larva, then develops into beetle")).toEqual({
      startText: "egg", intermediateText: "larva", finalText: "beetle"
    });
    expect(matchLifecycleSequence("a seed becomes a seedling, then becomes a plant")).toEqual({
      startText: "seed", intermediateText: "seedling", finalText: "plant"
    });
    expect(matchLifecycleSequence("seed becomes seedling, and later seedling becomes plant")).toEqual({
      startText: "seed", intermediateText: "seedling", finalText: "plant"
    });
    expect(matchLifecycleSequence("when a caterpillar is ready, it wraps itself up and comes out later as a butterfly")).toEqual({
      startText: "caterpillar", intermediateText: "cocoon", finalText: "butterfly"
    });
    expect(matchLifecycleSequence("when a tadpole is ready, it wraps itself up and comes out later as a frog")).toBeNull();
    expect(matchLifecycleSequence("egg becomes larva")).toBeNull();
  });

  it("builds three ordered identities and two typed transformations", () => {
    const { script, scene } = build("When a caterpillar is ready, it wraps itself up and comes out later as a butterfly.");
    expect(script.schemaVersion).toBe("2.11.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual([
      ["caterpillar", "lifecycle-start"], ["cocoon", "lifecycle-intermediate"], ["butterfly", "lifecycle-final"]
    ]);
    expect(scene.relations).toEqual([
      expect.objectContaining({ kind: "transformsTo", sourceIds: [scene.entities[0].id], targetIds: [scene.entities[1].id] }),
      expect.objectContaining({ kind: "transformsTo", sourceIds: [scene.entities[1].id], targetIds: [scene.entities[2].id] })
    ]);
    expect(lifecycleSequenceGeometry(scene.relations!, scene.entities)).not.toBeNull();
  });

  it("renders three original stages with transformation motion and no duplicate bubbles", () => {
    const { scene } = build("When a caterpillar is ready, it wraps itself up and comes out later as a butterfly.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="lifecycle-sequence"');
    expect(html).toContain('data-layout-topology="stage-sequence"');
    for (const cue of ["caterpillar-stage", "wrapped-cocoon", "emerging-butterfly", "left-to-right-stages"]) expect(html).toContain(cue);
    expect(html).toContain('aria-label="caterpillar transforms to cocoon, then cocoon transforms to butterfly"');
    expect(html.match(/class="lifecycle-sequence-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects old-version, incomplete, wrong-role, and disconnected sequences", () => {
    const { script } = build("Egg develops into larva, then develops into beetle.");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.10.0" }, initialScene).ok).toBe(false);
    const incomplete = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.sourceIds[0] === script.commands.find((item) => item.action === "create")?.entity.id) };
    expect(validateDoodleScript(incomplete, initialScene).ok).toBe(false);
    const wrongRole = structuredClone(script);
    const middle = wrongRole.commands.find((command) => command.action === "create" && command.entity.visualRole === "lifecycle-intermediate");
    if (middle?.action === "create") middle.entity.visualRole = "object";
    expect(validateDoodleScript(wrongRole, initialScene).ok).toBe(false);
    const disconnected = structuredClone(script);
    const relations = disconnected.commands.filter((command) => command.action === "relate");
    const start = disconnected.commands.find((command) => command.action === "create" && command.entity.visualRole === "lifecycle-start");
    if (relations[1]?.action === "relate" && start?.action === "create") relations[1].relation.sourceIds = [start.entity.id];
    expect(validateDoodleScript(disconnected, initialScene).ok).toBe(false);
  });
});
