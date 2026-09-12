import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "../doodlescript/interpret";
import { relationForKind } from "../doodlescript/relationRegistry";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { acceptedConstructionProbes as accepted, unsafeConstructionNearMisses as unsafeNearMisses } from "./constructionProbes";

describe("generated construction generalization probe", () => {
  it("covers a nontrivial Cartesian matrix outside production source", () => {
    expect(accepted).toHaveLength(102);
    expect(new Set(accepted.map(({ text }) => text)).size).toBe(accepted.length);
    expect(new Set(accepted.map(({ layout }) => layout))).toEqual(new Set([
      "lifo-stack", "triangle-angle-sum", "convergent-plates", "ordered-routine", "reflection-ray", "lifecycle-sequence", "indexed-row", "linked-chain", "condition-flow"
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
