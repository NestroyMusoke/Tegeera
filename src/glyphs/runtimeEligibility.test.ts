import { describe, expect, it } from "vitest";
import type { SceneEntity } from "../doodlescript/schema";
import { needsRuntimeGlyph } from "./runtimeEligibility";

const entity = (label: string, kind: SceneEntity["kind"]): SceneEntity => ({
  id: "subject", label, kind, x: 50, y: 50, scale: 1, direction: "right", highlighted: false
});

describe("runtime glyph eligibility", () => {
  it("requests a doodle for an unknown generic noun", () => {
    expect(needsRuntimeGlyph(entity("waterwheel", "generic"))).toBe(true);
  });

  it("requests a doodle for a nature noun mistyped as a person", () => {
    expect(needsRuntimeGlyph(entity("bee", "person"))).toBe(true);
    expect(needsRuntimeGlyph(entity("dogs", "person"))).toBe(true);
  });

  it("does not replace actual people or existing specialist rigs", () => {
    expect(needsRuntimeGlyph(entity("child", "person"))).toBe(false);
    expect(needsRuntimeGlyph(entity("teacher", "teacher"))).toBe(false);
    expect(needsRuntimeGlyph(entity("car", "car"))).toBe(false);
  });
});
