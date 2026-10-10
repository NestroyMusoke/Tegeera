import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";
import { matchLinearPropagation } from "./linearPropagation";
import { needsRuntimeGlyph } from "../glyphs/runtimeEligibility";

const statements = [
  "When you heat a metal rod at one end, the heat slowly moves along to the other end.",
  "Heat spreads along a copper wire from a heater to a far end.",
  "A signal travels through a cable from a transmitter to a receiver.",
  "A vibration propagates along a string from a pluck point to a fixed end."
];
describe("continuous propagation drawings", () => {
  it.each(statements)("draws the actual medium and endpoints: %s", (statement) => {
    const result = interpretTeacherText(statement, initialScene);
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(validateDoodleScript(result.script, initialScene)).toMatchObject({ ok: true });
    const scene = applyDoodleScript(initialScene, result.script);
    expect(scene.entities).toHaveLength(4);
    expect(scene.entities.some(needsRuntimeGlyph)).toBe(false);
    expect(scene.relations?.map(({ predicate }) => predicate)).toEqual(["enters", "propagatesThrough", "reaches"]);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    for (const cue of ["linear-medium", "source-at-one-end", "forward-propagation-arrow", "moving-energy-pulses", "far-end-marker"]) {
      expect(html).toContain(`data-visual-cue="${cue}"`);
    }
    expect(html).toContain('data-relation-layout="linear-propagation"');
    expect(html.includes('data-visual-cue="warm-to-cool-gradient"')).toBe(/heat/i.test(statement));
    expect(html).not.toContain('data-symbol-id="honest-sticker"');
  });
  it.each(["Heat does not spread along a rod from a heater to a tip.",
    "Maybe heat spreads along a rod from a heater to a tip.",
    "If heat spreads along a rod from a heater to a tip.",
    "A signal travels through a cable from a transmitter to a receiver and a lamp."])("does not bypass ambiguity/negation safeguards: %s", (text) => {
    expect(matchLinearPropagation(text)).toBeNull();
  });
  it("preserves an existing scene instead of clearing it silently", () => {
    const first = interpretTeacherText("A teacher", initialScene);
    if (!first.ok) throw new Error(first.message);
    const scene = applyDoodleScript(initialScene, first.script); const snapshot = structuredClone(scene);
    expect(interpretTeacherText(statements[0], scene)).toMatchObject({ ok: false, clarification: { code: "layout-limit" } });
    expect(scene).toEqual(snapshot);
  });
  it("atomically replaces an earlier propagation scene without mutating its snapshot", () => {
    const first = interpretTeacherText(statements[0], initialScene);
    if (!first.ok) throw new Error(first.message);
    const previous = applyDoodleScript(initialScene, first.script);
    const snapshot = structuredClone(previous);
    const second = interpretTeacherText(statements[2], previous);
    if (!second.ok) throw new Error(second.message);
    expect(second.script.commands[0]).toEqual({ action: "clear" });
    expect(validateDoodleScript(second.script, previous).ok).toBe(true);
    const current = applyDoodleScript(previous, second.script);
    expect(current.revision).toBe(2);
    expect(current.entities).toHaveLength(4);
    expect(current.relations).toHaveLength(3);
    expect(current.entities.map(({ label }) => label)).toContain("cable");
    expect(current.entities.map(({ label }) => label)).not.toContain("metal rod");
    expect(previous).toEqual(snapshot);
  });
  it.each(["Add a signal travels through a cable from a transmitter to a receiver.",
    "Also a signal travels through a cable from a transmitter to a receiver.",
    "It travels through a cable from a transmitter to a receiver.",
    "A signal travels through that cable from a transmitter to a receiver."])("does not treat an addition or reference as a standalone replacement: %s", (text) => {
    expect(matchLinearPropagation(text)).toBeNull();
  });
  it("rejects reversed propagation and broken topology at the validator", () => {
    const result = interpretTeacherText(statements[0], initialScene);
    if (!result.ok) throw new Error(result.message);
    const broken = structuredClone(result.script);
    const edge = broken.commands.find((command) => command.action === "relate");
    if (edge?.action !== "relate") throw new Error("missing edge");
    [edge.relation.sourceIds, edge.relation.targetIds] = [edge.relation.targetIds, edge.relation.sourceIds];
    expect(validateDoodleScript(broken, initialScene).ok).toBe(false);
  });
  it("rejects adding unrelated objects behind the continuous diagram", () => {
    const result = interpretTeacherText(statements[0], initialScene);
    if (!result.ok) throw new Error(result.message);
    const scene = applyDoodleScript(initialScene, result.script);
    expect(validateDoodleScript({ ...result.script, revision: scene.revision + 1, commands: [
      { action: "create", entity: { id: "intruder", kind: "person", x: 10, y: 20, scale: 0.5, direction: "right", highlighted: false } }
    ] }, scene).ok).toBe(false);
  });
  it("honors explicit right-to-left propagation in placement, arrow and animation", () => {
    const result = interpretTeacherText("Heat moves along a rod from the right end to the left end.", initialScene);
    if (!result.ok) throw new Error(result.message);
    expect(validateDoodleScript(result.script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, result.script);
    expect(scene.entities.find(({ propagationRole }) => propagationRole === "source")!.x)
      .toBeGreaterThan(scene.entities.find(({ propagationRole }) => propagationRole === "destination")!.x);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain('data-flow-direction="left"');
    expect(html).toContain('--propagation-distance:-575px');
  });
  it.each(["Perhaps heat moves through a rod from a heater to a tip.",
    "Probably heat moves through a rod from a heater to a tip.",
    "Assuming heat moves through a rod from a heater to a tip.",
    "No heat moves through a rod from a heater to a tip.",
    "What moves through a cable from a transmitter to a receiver?"])("does not promote a question or uncertain statement to a fact: %s", (text) => {
    expect(matchLinearPropagation(text)).toBeNull();
    expect(interpretTeacherText(text, initialScene).ok).toBe(false);
  });
});
