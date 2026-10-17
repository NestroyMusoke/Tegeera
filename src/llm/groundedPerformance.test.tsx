import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { solveContactArm } from "../doodlescript/contactGeometry";
import { compileUniversalScene } from "./universalScene";
import { entitiesAtArtworkPositions } from "../doodlescript/universalEdge";
import { applyTargetedPerformance } from "../doodlescript/targetedPerformance";
import { groundContactPerformances } from "./groundedPerformance";

function plan(verb: string, label = "cup", actorKind = "person") {
  return { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
    objects: [{ id: "actor", label: "traveller", kind: actorKind, x: 20, y: 50 },
      { id: "item", label, kind: "generic", x: 80, y: 50 }],
    connections: [{ from: "actor", to: "item", label: verb }] };
}

describe("hosted relationships become physical performances", () => {
  it("leaves scripts without newly created human performers untouched", () => {
    const script = compileUniversalScene({ ...plan("points at", "cup", "generic"), connections: [] }, initialScene, "A traveller and a cup.");
    expect(groundContactPerformances(initialScene, script)).toBe(script);
  });
  it.each([false, true])("composes pointing and looking at the same target regardless of order (%s)", (reverse) => {
    const candidate = plan("points at", "flower");
    candidate.connections.push({ from: "actor", to: "item", label: "looks at" });
    if (reverse) candidate.connections.reverse();
    const script = compileUniversalScene(candidate, initialScene, "A traveller points at and looks at a flower.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.relations).toHaveLength(2);
    expect(scene.relations?.every((edge) => edge.kind === "actsOn")).toBe(true);
    const point = scene.relations!.find((edge) => edge.predicate === "point")!;
    const expected = applyTargetedPerformance(scene.entities[0], scene.entities[1], point);
    expect(scene.entities[0].performance?.rightArm).toBeDefined();
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain(`rotate(${expected.performance!.rightArm!.upper})`);
    expect(html).not.toContain('class="universal-edge"');
  });
  it("aims a person at contained artwork rather than its hidden logical slot", () => {
    const candidate = { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [{ id: "box", label: "case", kind: "generic", x: 50, y: 40 },
        { id: "camera", label: "camera", kind: "generic", x: 50, y: 60 },
        { id: "actor", label: "archivist", kind: "person", x: 85, y: 60 }],
      connections: [{ from: "box", to: "camera", kind: "contains", label: "contains" },
        { from: "actor", to: "box", label: "right of" },
        { from: "actor", to: "camera", label: "points at" }] };
    const script = compileUniversalScene(candidate, initialScene, "A case contains a camera. An archivist stands to the right of the case and points at the camera.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    const relation = scene.relations!.find((edge) => edge.kind === "actsOn")!;
    expect(relation).toMatchObject({ predicate: "point", targetIds: ["camera"] });
    const actor = scene.entities.find(({ id }) => id === "actor")!;
    const target = entitiesAtArtworkPositions(scene.relations!, scene.entities).find(({ id }) => id === "camera")!;
    const expected = applyTargetedPerformance(actor, target, relation);
    const original = applyTargetedPerformance(actor, scene.entities.find(({ id }) => id === "camera")!, relation);
    expect(expected.performance!.rightArm!.upper).not.toBe(original.performance!.rightArm!.upper);
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html).toContain(`rotate(${expected.performance!.rightArm!.upper})`);
  });
  it.each(["points at", "looks toward"])("grounds %s as a non-contact performance", (verb) => {
    const candidate = plan(verb, "compass");
    const script = compileUniversalScene(candidate, initialScene, `A traveller ${verb} a compass.`);
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.relations?.[0]).toMatchObject({ kind: "actsOn", preposition: verb.split(" ")[1] });
    expect(scene.entities[0].performance).toBeDefined();
  });
  it.each(["almost points at", "points away from", "looks after"])("does not reinterpret %s as attention", (verb) => {
    const script = compileUniversalScene(plan(verb), initialScene, `A traveller ${verb} a cup.`);
    expect(applyDoodleScript(initialScene, script).relations?.[0].kind).toBe("relatesTo");
  });
  it("does not infer a human from a pointing verb or choose between two attention targets", () => {
    const nonhuman = compileUniversalScene(plan("points at", "cup", "generic"), initialScene, "A traveller points at a cup.");
    expect(applyDoodleScript(initialScene, nonhuman).relations?.[0].kind).toBe("relatesTo");
    const candidate = plan("points at");
    candidate.objects.push({ id: "other", label: "camera", kind: "generic", x: 50, y: 20 });
    candidate.connections.push({ from: "actor", to: "other", label: "looks at" });
    const script = compileUniversalScene(candidate, initialScene, "A traveller points at a cup and looks at a camera.");
    expect(applyDoodleScript(initialScene, script).relations?.every((edge) => edge.kind === "relatesTo")).toBe(true);
  });
  it.each(["holds", "carrying", "touches"])("grounds %s without changing object identity", (verb) => {
    const script = compileUniversalScene(plan(verb), initialScene, `A traveller ${verb} a cup.`);
    expect(validateDoodleScript(script, initialScene)).toMatchObject({ ok: true });
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.entities.map(({ id }) => id)).toEqual(["actor", "item"]);
    expect(scene.relations?.[0].kind).toBe("actsOn");
    const [actor, target] = scene.entities;
    expect(solveContactArm(actor, target, actor.performance?.bodyLean).solution.reachable).toBe(true);
    const svg = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    if (verb !== "touches") expect(svg).toContain('data-attached-to="actor"');
  });

  it("does not require the target noun to be in a lesson registry", () => {
    const script = compileUniversalScene(plan("holds", "zorb"), initialScene, "A traveller holds a zorb.");
    expect(applyDoodleScript(initialScene, script).relations?.[0]).toMatchObject({ kind: "actsOn", predicate: "hold" });
  });

  it("stages with provisional artwork before painting, not with emoji padding", () => {
    const script = compileUniversalScene(plan("holds", "umbrella"), initialScene, "A traveller holds an umbrella.");
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.entities.find(({ id }) => id === "item")).toMatchObject({ glyphSource: "provisional" });
    expect(scene.relations?.[0]).toMatchObject({ kind: "actsOn", predicate: "hold" });
    expect(validateDoodleScript(script, initialScene)).toMatchObject({ ok: true });
  });

  it("retains the existing safe rejection of negated claims", () => {
    expect(() => compileUniversalScene(plan("does not hold"), initialScene, "A traveller does not hold a cup."))
      .toThrow(/negated claim/);
  });

  it.each(["almost holds", "holds above", "used to hold"])("does not reinterpret %s as contact", (verb) => {
    const script = compileUniversalScene(plan(verb), initialScene, `A traveller ${verb} a cup.`);
    expect(applyDoodleScript(initialScene, script).relations?.[0].kind).toBe("relatesTo");
  });

  it("does not make inanimate subjects into human performers", () => {
    const script = compileUniversalScene(plan("holds", "cup", "generic"), initialScene, "A traveller holds a cup.");
    expect(applyDoodleScript(initialScene, script).relations?.[0].kind).toBe("relatesTo");
  });

  it("keeps emoji-only targets as diagrams rather than touching invisible padding", () => {
    const script = compileUniversalScene(plan("touches", "balloon"), initialScene, "A traveller touches a balloon.");
    expect(applyDoodleScript(initialScene, script).relations?.[0].kind).toBe("relatesTo");
  });

  it("does not move an existing object when adding a performer", () => {
    const previous = applyDoodleScript(initialScene, compileUniversalScene({ ...plan("holds"),
      objects: [plan("holds").objects[1]], connections: [] }, initialScene, "A cup."));
    const candidate = { ...plan("holds"), mode: "extend", objects: [plan("holds").objects[0]] };
    const script = compileUniversalScene(candidate, previous, "Add a traveller holding the cup.");
    const next = applyDoodleScript(previous, script);
    expect(next.entities.find(({ id }) => id === "item")).toEqual(previous.entities[0]);
    expect(validateDoodleScript(script, previous)).toMatchObject({ ok: true });
  });

  it("preserves a second explicit spatial relationship", () => {
    const candidate = plan("holds");
    candidate.objects.push({ id: "cloud", label: "cloud", kind: "generic", x: 80, y: 15 });
    candidate.connections.push({ from: "item", to: "cloud", label: "beneath" });
    const script = compileUniversalScene(candidate, initialScene, "A traveller holds a cup beneath a cloud.");
    const scene = applyDoodleScript(initialScene, script);
    expect(validateDoodleScript(script, initialScene)).toMatchObject({ ok: true });
    expect(scene.entities.find(({ id }) => id === "item")!.y).toBeGreaterThan(scene.entities.find(({ id }) => id === "cloud")!.y);
    expect(scene.relations).toHaveLength(2);
  });

  it("does not silently choose between conflicting physical targets", () => {
    const candidate = plan("holds");
    candidate.objects.push({ id: "other", label: "apple", kind: "generic", x: 50, y: 15 });
    candidate.connections.push({ from: "actor", to: "other", label: "carries" });
    const scene = applyDoodleScript(initialScene, compileUniversalScene(candidate, initialScene, "A traveller holds a cup and carries an apple."));
    expect(scene.relations?.every(({ kind }) => kind === "relatesTo")).toBe(true);
  });

  it.each(["beside", "next to", "alongside"])("does not trade %s alignment for a contact pose", (label) => {
    const candidate = plan("holds");
    candidate.objects.push({ id: "other", label: "flower", kind: "generic", x: 50, y: 50 });
    candidate.connections.push({ from: "item", to: "other", label });
    const script = compileUniversalScene(candidate, initialScene, "A traveller holds a cup beside a flower.");
    const scene = applyDoodleScript(initialScene, script);
    expect(validateDoodleScript(script, initialScene)).toMatchObject({ ok: true });
    expect(scene.entities.find(({ id }) => id === "item")!.y).toBe(scene.entities.find(({ id }) => id === "other")!.y);
    expect(scene.relations).toHaveLength(2);
  });
});
