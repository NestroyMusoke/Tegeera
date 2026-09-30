import { describe, expect, it } from "vitest";
import { initialScene } from "../doodlescript/scene";
import type { SceneEntity, SceneRelation } from "../doodlescript/schema";
import { forceOverviewFrame, measuredArtFrame, overviewFrame } from "./overviewFraming";

const entity = (id: string, x: number, y: number, visualRole?: SceneEntity["visualRole"]): SceneEntity => ({
  id, kind: "generic", label: id, x, y, scale: 1, direction: "right", highlighted: false, visualRole
});

describe("ordinary-scene overview framing", () => {
  it("zooms conservatively while retaining every object and label margin", () => {
    const scene = { ...initialScene, entities: [entity("left", 30, 35), entity("right", 70, 65)] };
    const frame = overviewFrame(scene)!.split(" ").map(Number);
    expect(frame[2]).toBe(760);
    expect(frame[3]).toBeCloseTo(471.2);
    for (const item of scene.entities) {
      expect(item.x * 10).toBeGreaterThan(frame[0] + 90);
      expect(item.x * 10).toBeLessThan(frame[0] + frame[2] - 90);
      expect(item.y * 6.2).toBeGreaterThan(frame[1] + 90);
      expect(item.y * 6.2).toBeLessThan(frame[1] + frame[3] - 90);
    }
  });

  it("retains the full board for edge-spanning and specialist diagrams", () => {
    expect(overviewFrame({ ...initialScene, entities: [entity("a", 6, 40), entity("b", 94, 40)] })).toBeNull();
    expect(overviewFrame({ ...initialScene, entities: [entity("a", 30, 40, "force"), entity("b", 70, 40)] })).toBeNull();
  });
});

describe("complete force-diagram framing", () => {
  const entities: SceneEntity[] = [
    { ...entity("body", 52, 40, "object"), label: "crate" },
    { ...entity("floor", 52, 72, "surface"), label: "floor" },
    { ...entity("push", 18, 40, "force"), label: "push" },
    { ...entity("friction", 83, 40, "force"), label: "friction", direction: "left" }
  ];
  const relations: SceneRelation[] = [
    { id: "applied", kind: "appliedTo", sourceIds: ["push"], targetIds: ["body"] },
    { id: "opposed", kind: "opposes", sourceIds: ["friction"], targetIds: ["push"] },
    { id: "support", kind: "contacts", sourceIds: ["body"], targetIds: ["floor"] }
  ];

  it("fits arrow, body and floor from renderer geometry without cutting their margins", () => {
    const frame = forceOverviewFrame({ ...initialScene, entities, relations })!.split(" ").map(Number);
    expect(frame[2]).toBeGreaterThanOrEqual(500);
    expect(frame[2]).toBeLessThan(760);
    expect(frame[3] / frame[2]).toBeCloseTo(0.62);
    expect(frame[0]).toBeLessThan(285);
    expect(frame[0] + frame[2]).toBeGreaterThan(725);
    expect(frame[1]).toBeLessThan(143);
    expect(frame[1] + frame[3]).toBeGreaterThan(356);
  });

  it("falls back for incomplete diagrams and unrelated content", () => {
    expect(forceOverviewFrame({ ...initialScene, entities, relations: relations.slice(0, 2) })).toBeNull();
    expect(forceOverviewFrame({ ...initialScene, entities: [...entities, entity("extra", 50, 15)], relations })).toBeNull();
  });
});

describe("measured specialist artwork framing", () => {
  it("fits visible SVG bounds with room for labels and small motion", () => {
    expect(measuredArtFrame({ x: 200, y: 150, width: 500, height: 260 })).toBe("140 87.8 620 384.4");
  });

  it("refuses empty, invalid and off-board measurements", () => {
    expect(measuredArtFrame({ x: 20, y: 20, width: 0, height: 30 })).toBeNull();
    expect(measuredArtFrame({ x: NaN, y: 20, width: 30, height: 30 })).toBeNull();
    expect(measuredArtFrame({ x: 900, y: 20, width: 120, height: 30 })).toBeNull();
  });
});
