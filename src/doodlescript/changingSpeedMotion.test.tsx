import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { changingSpeedGeometry, matchChangingSpeedMotion } from "./changingSpeedMotion";
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

describe("open changing-speed motion construction", () => {
  it("binds different moving objects to one reusable ascent-apex-descent profile", () => {
    expect(matchChangingSpeedMotion("a ball thrown up in the air slows down, stops for a moment, then falls back faster and faster")).toEqual({
      objectText: "ball", apexText: "highest point", forceText: "gravity"
    });
    expect(matchChangingSpeedMotion("a stone tossed straight up decelerates, pauses briefly, then drops back increasingly fast")?.objectText).toBe("stone");
    expect(matchChangingSpeedMotion("a toy rocket launched up into the air slows down, stops for an instant, then falls back and speeds up")?.objectText).toBe("toy rocket");
    expect(matchChangingSpeedMotion("something thrown up in the air slows down, stops for a moment, then falls back faster and faster")).toBeNull();
    expect(matchChangingSpeedMotion("a ball thrown up in the air slows down and stops")).toBeNull();
  });

  it("builds one object identity, a shared apex, and an accelerating force", () => {
    const { script, scene } = build("A ball thrown up in the air slows down, stops for a moment, then falls back faster and faster.");
    expect(script.schemaVersion).toBe("2.7.0");
    expect(scene.entities.map(({ label, visualRole }) => [label, visualRole])).toEqual([
      ["ball", "trajectory-object"], ["highest point", "trajectory-apex"], ["gravity", "trajectory-force"]
    ]);
    expect(scene.relations).toEqual([
      expect.objectContaining({ kind: "risesTo", sourceIds: [scene.entities[0].id], targetIds: [scene.entities[1].id] }),
      expect.objectContaining({ kind: "fallsFrom", sourceIds: [scene.entities[0].id], targetIds: [scene.entities[1].id] }),
      expect.objectContaining({ kind: "accelerates", sourceIds: [scene.entities[2].id], targetIds: [scene.entities[0].id] })
    ]);
    expect(changingSpeedGeometry(scene.relations!, scene.entities)).not.toBeNull();
  });

  it("renders one continuous, accessible trajectory with four required teaching cues", () => {
    const { scene } = build("A ball thrown up in the air slows down, stops for a moment, then falls back faster and faster.");
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
    expect(html).toContain('data-relation-layout="changing-speed-motion"');
    expect(html).toContain('data-layout-topology="trajectory-profile"');
    for (const cue of ["vertical-flight-path", "shrinking-upward-velocity", "apex-pause", "growing-downward-velocity"]) {
      expect(html).toContain(`data-visual-cue="${cue}"`);
    }
    expect(html).toContain('aria-label="ball rises to highest point while slowing, pauses, then falls while speeding up under gravity"');
    expect(html.match(/class="changing-speed-motion-annotation"/g)).toHaveLength(1);
    expect(html).not.toContain('class="doodle-object');
  });

  it("rejects pre-2.7, incomplete, wrong-role, and split-apex scripts", () => {
    const { script } = build("A stone tossed straight up decelerates, pauses briefly, then drops back increasingly fast.");
    expect(validateDoodleScript({ ...script, schemaVersion: "2.6.0" }, initialScene).ok).toBe(false);
    const incomplete = { ...script, commands: script.commands.filter((command) => command.action !== "relate" || command.relation.kind !== "fallsFrom") };
    expect(validateDoodleScript(incomplete, initialScene).ok).toBe(false);
    const wrongRole = structuredClone(script);
    const firstCreate = wrongRole.commands.find((command) => command.action === "create");
    if (firstCreate?.action === "create") firstCreate.entity.visualRole = "object";
    expect(validateDoodleScript(wrongRole, initialScene).ok).toBe(false);
    const splitApex = structuredClone(script);
    const fall = splitApex.commands.find((command) => command.action === "relate" && command.relation.kind === "fallsFrom");
    const force = splitApex.commands.find((command) => command.action === "create" && command.entity.visualRole === "trajectory-force");
    if (fall?.action === "relate" && force?.action === "create") fall.relation.targetIds = [force.entity.id];
    expect(validateDoodleScript(splitApex, initialScene).ok).toBe(false);
  });
});
