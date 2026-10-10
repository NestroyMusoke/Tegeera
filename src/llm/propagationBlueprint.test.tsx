import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { initialScene, applyDoodleScript } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { needsRuntimeGlyph } from "../glyphs/runtimeEligibility";
import { compileUniversalScene, type UniversalSceneBlueprint } from "./universalScene";

const plan = (labels = ["transducer", "gel", "ultrasound", "sensor"], reversed = false): UniversalSceneBlueprint => ({
  blueprintVersion: "1.0", mode: "replace", confidence: 0.88,
  objects: labels.map((label, index) => ({ id: `r${index}`, label, kind: "generic", x: reversed ? 90 - index * 25 : 10 + index * 25, y: 50 })),
  connections: [{ from: "r0", to: "r1", kind: "enters", label: "enters" },
    { from: "r2", to: "r1", kind: "propagatesThrough", label: "propagates through" },
    { from: "r2", to: "r3", kind: "reaches", label: "reaches" }]
});
const text = "The transducer sends ultrasound across the gel to the sensor.";

describe("hosted propagation graph compiles to continuous geometry", () => {
  it("grounds a passive emission modifier to the travelling payload, not its emitter", () => {
    const candidate = plan(["transmitter", "optical fibre", "light pulses", "detector"]);
    candidate.connections[0] = { from: "r0", to: "r2", kind: "emits", label: "emits" };
    const script = compileUniversalScene(candidate, initialScene, "Light pulses emitted by a transmitter propagate through an optical fibre until they reach a detector.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
  });
  it.each(["emits", "sends", "generates", "causes"])("accepts a grounded source-to-payload %s link without fabricating another arrow", (label) => {
    const candidate = plan();
    candidate.connections[0] = { from: "r0", to: "r2", label, ...(label === "emits" ? { kind: "emits" as const } : {}) };
    candidate.connections[1].label = "propagatesThrough";
    const script = compileUniversalScene(candidate, initialScene, text);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(applyDoodleScript(initialScene, script).relations).toHaveLength(3);
  });
  it("does not confuse an observer with an emitting source", () => {
    const candidate = plan(); candidate.connections[0] = { from: "r0", to: "r2", label: "observes" };
    expect(() => compileUniversalScene(candidate, initialScene, text)).toThrow(/Propagation needs/);
  });
  it.each([
    ["transducer", "gel", "ultrasound", "sensor"],
    ["router", "optical fibre", "light pulses", "detector"],
    ["striker", "membrane", "vibration", "edge"],
  ])("uses open role labels, not stored sentences: %s", (...labels) => {
    const script = compileUniversalScene(plan(labels), initialScene, labels.join(" "));
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.entities.some(needsRuntimeGlyph)).toBe(false);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain('data-relation-layout="linear-propagation"');
    expect(html).toContain('data-flow-direction="right"');
    for (const label of labels) expect(html).toContain(label);
    expect(script.confidence).toBe(0.88);
  });
  it("preserves right-to-left direction, replaces atomically, and leaves the prior snapshot intact", () => {
    const old = applyDoodleScript(initialScene, compileUniversalScene(plan(), initialScene, text));
    const snapshot = structuredClone(old);
    const script = compileUniversalScene(plan(undefined, true), old, text);
    expect(validateDoodleScript(script, old).ok).toBe(true);
    const next = applyDoodleScript(old, script);
    expect(next.entities).toHaveLength(4);
    expect(next.revision).toBe(2);
    expect(old).toEqual(snapshot);
    expect(renderToStaticMarkup(<DoodleCanvas scene={next} />)).toContain('data-flow-direction="left"');
  });
  it("preserves explicit medium colour in the actual painted SVG", () => {
    const candidate = plan(); candidate.objects[1].color = "blue";
    const script = compileUniversalScene(candidate, initialScene, "Ultrasound crosses the blue gel from a transducer to a sensor.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    expect(renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />)).toMatch(/data-visual-cue="linear-medium"><rect[^>]*fill="blue"/);
  });
  it.each([0, 1, 2])("rejects a missing structural link %s instead of drawing generic arrows", (index) => {
    const candidate = plan(); candidate.connections.splice(index, 1);
    expect(() => compileUniversalScene(candidate, initialScene, text)).toThrow(/Propagation needs/);
  });
  it.each(["swapped", "extra", "wrong-label", "duplicate-role", "negated"])("rejects unsafe %s plans", (mutation) => {
    const candidate = plan();
    if (mutation === "swapped") [candidate.connections[1].from, candidate.connections[1].to] = ["r1", "r2"];
    if (mutation === "extra") candidate.objects.push({ id: "extra", label: "observer", kind: "person", x: 50, y: 20 });
    if (mutation === "wrong-label") candidate.connections[1].label = "does something";
    if (mutation === "duplicate-role") candidate.connections[2].to = "r0";
    expect(() => compileUniversalScene(candidate, initialScene, mutation === "negated" ? "Ultrasound does not reach the sensor." : text)).toThrow();
  });
});
