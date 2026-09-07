import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { entityKindSchema, type SceneEntity } from "../doodlescript/schema";
import { characterPoseFor } from "./characterPerformance";
import { EntityGlyph } from "./entityRenderers";

const entity = (kind: SceneEntity["kind"], id = `${kind}-1`): SceneEntity => ({
  id, kind, x: 30, y: 40, scale: 1, direction: "right", highlighted: false
});

describe("entity renderer registry", () => {
  it("has a renderer for every schema entity kind", () => {
    for (const kind of entityKindSchema.options) {
      expect(renderToStaticMarkup(<EntityGlyph entity={entity(kind)} />)).toContain(`data-renderer="${kind}"`);
    }
  });

  it("uses one articulated rig for people, students and teachers", () => {
    for (const kind of ["person", "student", "teacher"] as const) {
      const html = renderToStaticMarkup(<EntityGlyph entity={entity(kind)} />);
      expect(html).toContain("character-rig");
      expect(html.match(/rig-arm/g)).toHaveLength(4);
      expect(html.match(/rig-leg/g)).toHaveLength(4);
      expect(html).toContain("rig-mouth");
    }
  });

  it("selects deterministic varied poses without random scene drift", () => {
    expect(characterPoseFor(entity("student", "student-1"))).toEqual(characterPoseFor(entity("student", "student-1")));
    expect(characterPoseFor(entity("teacher")).name).toBe("explain");
    expect(characterPoseFor(entity("person"), true).name).toMatch(/^step-/);
  });

  it("marks moving characters for animation while keeping static characters still", () => {
    expect(renderToStaticMarkup(<EntityGlyph entity={entity("person")} moving />)).toContain("character-rig is-moving");
    expect(renderToStaticMarkup(<EntityGlyph entity={entity("person")} />)).not.toContain("is-moving");
  });
});
