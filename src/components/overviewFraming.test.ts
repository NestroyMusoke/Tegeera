import { describe, expect, it } from "vitest";
import { initialScene } from "../doodlescript/scene";
import type { SceneEntity } from "../doodlescript/schema";
import { overviewFrame } from "./overviewFraming";

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
