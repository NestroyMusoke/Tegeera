import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { compileUniversalScene } from "./universalScene";

const objects = (...labels: string[]) => labels.map((label, index) => ({
  id: `role-${index}`, label, kind: "generic", x: 20 + index * 24, y: 44
}));
const plan = (labels: string[], connections: { from: string; to: string; label: string; kind: string }[]) => ({
  blueprintVersion: "1.0", mode: "replace", confidence: 0.9, objects: objects(...labels), connections
});
const link = (from: number, to: number, kind: string, label = kind) => ({
  from: `role-${from}`, to: `role-${to}`, kind, label
});
function render(candidate: ReturnType<typeof plan>, explanation: string) {
  const script = compileUniversalScene(candidate, initialScene, explanation);
  expect(validateDoodleScript(script, initialScene).ok).toBe(true);
  return renderToStaticMarkup(<DoodleCanvas scene={applyDoodleScript(initialScene, script)} />);
}

describe("hosted blueprints reach existing specialist drawing grammars", () => {
  it("moves connected context with the enclosure while preserving explicit left placement", () => {
    const candidate = plan(["jar", "lemon", "teacher"], [link(0, 1, "contains"),
      link(2, 0, "relatesTo", "left of"), link(2, 1, "relatesTo", "points at")]);
    candidate.objects[0].x = 100;
    candidate.objects[1].x = 100;
    candidate.objects[1].y = 30;
    candidate.objects[2].x = 60;
    const script = compileUniversalScene(candidate, initialScene, "A jar contains a lemon. A teacher stands to the left of the jar and points at the lemon.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    expect(scene.entities.find((entity) => entity.id === "role-2")!.x)
      .toBeLessThan(scene.entities.find((entity) => entity.id === "role-0")!.x);
    expect(renderToStaticMarkup(<DoodleCanvas scene={scene} />)).toContain('data-visual-cue="contained-artwork"');
  });
  it.each([["basket", "apple", "child"], ["case", "camera", "teacher"]])(
    "retains containment for %s with multiple contextual relationships", (holder, item, observer) => {
      const candidate = plan([holder, item, observer], [link(0, 1, "contains"),
        link(2, 0, "relatesTo", "stands to the right of"), link(2, 1, "relatesTo", "points at")]);
      candidate.objects[0].x = 30;
      candidate.objects[1].x = 30;
      candidate.objects[2].x = 80;
      const script = compileUniversalScene(candidate, initialScene, `${holder} contains ${item}; ${observer} stands to the right of ${holder} and points at ${item}`);
      expect(validateDoodleScript(script, initialScene).ok).toBe(true);
      const scene = applyDoodleScript(initialScene, script);
      expect(scene.relations).toHaveLength(3);
      expect(scene.relations?.filter((edge) => edge.kind === "contains")).toHaveLength(1);
      const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
      expect(html).toContain('data-visual-cue="contained-artwork"');
      expect(html).toMatch(/points? at/);
      expect(scene.entities.find((entity) => entity.id === "role-2")!.x)
        .toBeGreaterThan(scene.entities.find((entity) => entity.id === "role-0")!.x);
    });
  it("draws arbitrary container/content pairs with connected context but rejects orphaned objects", () => {
    for (const [container, content] of [["variable", "value"], ["specimen jar", "sample"]]) {
      const candidate = plan([container, content], [link(0, 1, "contains")]);
      const html = render(candidate, `${container} contains ${content}`);
      expect(html).toContain('data-relation-layout="labelled-container"');
      expect(html).toContain('data-visual-cue="value-inside-container"');
      const contextual = { ...candidate, objects: [...candidate.objects,
        { ...objects("observer")[0], id: "observer", x: 85, y: 45 }],
      connections: [...candidate.connections, { from: "observer", to: "role-0", kind: "relatesTo", label: "observes" }] };
      const contextualHtml = render(contextual, `${container} contains ${content}; an observer watches ${container}`);
      expect(contextualHtml).toContain('data-relation-layout="labelled-container"');
      expect(contextualHtml).toContain("observer");
      expect(() => compileUniversalScene({ ...contextual, connections: candidate.connections }, initialScene,
        `${container} contains ${content}`)).toThrow(/every extra object connected/);
    }
  });

  it("draws control transfer and return to a distinct marked point", () => {
    for (const [caller, fn] of [["program", "function"], ["application", "service"]]) {
      const candidate = plan([caller, fn, "call site"], [link(0, 1, "calls"), link(1, 2, "returnsControlTo", "returnsTo")]);
      const html = render(candidate, `${caller} calls ${fn} and returns to the call site`);
      expect(html).toContain('data-relation-layout="call-return-flow"');
      expect(html).toContain('data-visual-cue="same-return-point"');
      expect(() => compileUniversalScene({ ...candidate, connections: [candidate.connections[0], link(1, 0, "returnsControlTo", "returnsTo")] },
        initialScene, `${caller} calls ${fn} and returns`)).toThrow(/distinct caller/);
    }
  });

  it("draws a complete up-apex-down profile with growing and shrinking arrows", () => {
    for (const moving of ["ball", "toy rocket"]) {
      const candidate = plan([moving, "highest point", "gravity"], [
        link(0, 1, "risesTo"), link(0, 1, "fallsFrom"), link(2, 0, "accelerates")
      ]);
      const html = render(candidate, `${moving} rises to its highest point, falls, and gravity accelerates it`);
      expect(html).toContain('data-relation-layout="changing-speed-motion"');
      expect(html).toContain('data-visual-cue="shrinking-upward-velocity"');
      expect(html).toContain('data-visual-cue="growing-downward-velocity"');
      expect(() => compileUniversalScene({ ...candidate, connections: candidate.connections.slice(0, 2) }, initialScene,
        `${moving} rises and falls`)).toThrow(/Changing speed needs/);
    }
  });
});
