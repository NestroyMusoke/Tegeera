import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "../doodlescript/interpret";
import { relationForKind } from "../doodlescript/relationRegistry";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { acceptedFoundationalConstructionProbes, unsafeFoundationalNearMisses } from "./foundationalConstructionProbes";

describe("foundational construction generalization probe", () => {
  it("covers all ten older specialist layouts with unique generated language", () => {
    expect(acceptedFoundationalConstructionProbes).toHaveLength(136);
    expect(new Set(acceptedFoundationalConstructionProbes.map(({ text }) => text)).size).toBe(136);
    expect(new Set(acceptedFoundationalConstructionProbes.map(({ layout }) => layout))).toEqual(new Set([
      "part-whole-flow", "circulation-loop", "force-diagram", "changing-speed-motion", "labelled-container",
      "call-return-flow", "geometric-construction", "fraction-subtraction", "landscape-flow", "water-cycle-loop"
    ]));
  });

  it("preserves valid specialist topology, rendering and determinism", () => {
    for (const probe of acceptedFoundationalConstructionProbes) {
      const first = interpretTeacherText(probe.text, initialScene);
      const second = interpretTeacherText(probe.text, initialScene);
      expect(first.ok, `${probe.id}: ${first.ok ? "accepted" : first.message}`).toBe(true);
      expect(second).toEqual(first);
      if (!first.ok) continue;
      const validation = validateDoodleScript(first.script, initialScene);
      expect(validation.ok, probe.id).toBe(true);
      const relationKinds = first.script.commands.flatMap((command) => command.action === "relate" ? [command.relation.kind] : []);
      expect(relationKinds.some((kind) => relationForKind(kind).layout === probe.layout), probe.id).toBe(true);
      const scene = applyDoodleScript(initialScene, first.script);
      const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene }));
      expect(html, probe.id).toContain(`data-relation-layout="${probe.layout}"`);
      expect(html, probe.id).toContain("aria-label=");
    }
  }, 30_000);

  it("clarifies structurally incomplete, unsafe, or wrong-domain near-misses", () => {
    for (const text of unsafeFoundationalNearMisses) expect(interpretTeacherText(text, initialScene).ok, text).toBe(false);
  });
});
