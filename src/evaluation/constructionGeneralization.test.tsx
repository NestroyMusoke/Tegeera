import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "../doodlescript/interpret";
import { relationForKind } from "../doodlescript/relationRegistry";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";

interface Probe { id: string; text: string; layout: string }

const stackProbes: Probe[] = ["add", "push", "adding", "pushing"].flatMap((add) =>
  ["remove", "pop", "removing", "popping"].map((remove, index) => ({
    id: `stack-${add}-${index}`, text: `In a stack, you ${add} and ${remove} items only at the top.`, layout: "lifo-stack"
  })));

const triangleProbes: Probe[] = [
  "A triangle has three angles that", "The three angles in a triangle", "A triangle's three angles"
].flatMap((opening, openingIndex) => ["add up to", "sum to", "sum up to", "total"].flatMap((verb, verbIndex) =>
  ["180 degrees", "180°"].map((total, totalIndex) => ({
    id: `triangle-${openingIndex}-${verbIndex}-${totalIndex}`, text: `${opening} ${verb} ${total}.`, layout: "triangle-angle-sum"
  }))));

const plateProbes: Probe[] = ["landmasses", "tectonic plates"].flatMap((noun) => [
  "converge", "push into each other", "move toward each other"
].map((motion, index) => ({ id: `plates-${noun}-${index}`, text: `Mountains form where two ${noun} ${motion}.`, layout: "convergent-plates" })));

const routines = [
  ["mix flour", "add water", "bake bread"],
  ["collect data", "compare results", "write conclusions"],
  ["open the valve", "heat the water", "measure temperature"],
  ["read the question", "solve the problem", "check the answer"]
];
const routineTemplates = [
  (a: string, b: string, c: string) => `First ${a}, then ${b}, then ${c}.`,
  (a: string, b: string, c: string) => `First ${a}, next ${b}, finally ${c}.`,
  (a: string, b: string, c: string) => `Begin by ${a}, then ${b}, and finally ${c}.`
];
const routineProbes: Probe[] = routines.flatMap((steps, stepIndex) => routineTemplates.map((template, templateIndex) => ({
  id: `routine-${stepIndex}-${templateIndex}`, text: template(steps[0], steps[1], steps[2]), layout: "ordered-routine"
})));

const reflectionProbes: Probe[] = [
  "A light ray travels toward a mirror and reflects off it.",
  "A beam hits glass and bounces off it.",
  "Light moves towards a wall and reflects off it.",
  "The ray shines toward a surface and bounces off it."
].map((text, index) => ({ id: `reflection-${index}`, text, layout: "reflection-ray" }));

const lifecycleProbes: Probe[] = [
  "A seed becomes a seedling, then becomes a plant.",
  "An egg develops into a larva, then develops into a beetle.",
  "Ice changes into water, then changes into vapor.",
  "A bud turns into a flower, then turns into fruit."
].map((text, index) => ({ id: `lifecycle-${index}`, text, layout: "lifecycle-sequence" }));

const accepted = [...stackProbes, ...triangleProbes, ...plateProbes, ...routineProbes, ...reflectionProbes, ...lifecycleProbes];
const unsafeNearMisses = [
  "A stack has several items.",
  "Only remove items from a stack.",
  "A pile of plates is on the table.",
  "A triangle has three angles.",
  "A square has three angles that sum to 180 degrees.",
  "A triangle might have angles totaling 180 degrees.",
  "Two cars push into each other and form a traffic jam.",
  "One tectonic plate creates a mountain.",
  "Mountains do not form when plates converge.",
  "First wash the cup, then dry it.",
  "First read, next read, finally write.",
  "Maybe first mix flour, then add water, then bake bread."
];

describe("generated construction generalization probe", () => {
  it("covers a nontrivial Cartesian matrix outside production source", () => {
    expect(accepted).toHaveLength(66);
    expect(new Set(accepted.map(({ text }) => text)).size).toBe(accepted.length);
    expect(new Set(accepted.map(({ layout }) => layout))).toEqual(new Set([
      "lifo-stack", "triangle-angle-sum", "convergent-plates", "ordered-routine", "reflection-ray", "lifecycle-sequence"
    ]));
  });

  it("preserves topology, validation, rendering and determinism across every accepted probe", () => {
    for (const probe of accepted) {
      const first = interpretTeacherText(probe.text, initialScene);
      const second = interpretTeacherText(probe.text, initialScene);
      expect(first.ok, `${probe.id}: ${first.ok ? "accepted" : first.message}`).toBe(true);
      expect(second).toEqual(first);
      if (!first.ok) continue;
      const validation = validateDoodleScript(first.script, initialScene);
      expect(validation.ok, probe.id).toBe(true);
      const relationKinds = first.script.commands.flatMap((command) => command.action === "relate" ? [command.relation.kind] : []);
      expect(relationKinds.length, probe.id).toBeGreaterThan(0);
      expect(relationKinds.every((kind) => relationForKind(kind).layout === probe.layout), probe.id).toBe(true);
      const scene = applyDoodleScript(initialScene, first.script);
      const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
      expect(html, probe.id).toContain(`data-relation-layout="${probe.layout}"`);
      expect(html, probe.id).not.toContain('class="doodle-object');
    }
  });

  it("clarifies every structurally incomplete or unsafe near-miss", () => {
    for (const text of unsafeNearMisses) expect(interpretTeacherText(text, initialScene).ok, text).toBe(false);
  });
});
