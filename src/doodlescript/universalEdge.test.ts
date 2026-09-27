import { describe, expect, it } from "vitest";
import type { SceneEntity, SceneRelation } from "./schema";
import { universalEdgeGeometry } from "./universalEdge";

const entity = (id: string, x: number, y: number): SceneEntity => ({
  id, label: id, kind: "generic", x, y, scale: 1, direction: "right", highlighted: false
});
const edge = (from: string, to: string): SceneRelation => ({
  id: `${from}-${to}`, kind: "relatesTo", sourceIds: [from], targetIds: [to], predicate: "moves toward"
});

describe("source-to-target connector geometry", () => {
  it("clips the arrow to the target silhouette in either direction", () => {
    const entities = [entity("left", 20, 40), entity("right", 80, 40)];
    const forward = universalEdgeGeometry(edge("left", "right"), entities)!;
    const reverse = universalEdgeGeometry(edge("right", "left"), entities)!;
    expect(forward.route).toBe("direct");
    expect(forward.start.x).toBeGreaterThan(200);
    expect(forward.end.x).toBeLessThan(800);
    expect(forward.end.x).toBeGreaterThan(forward.start.x);
    expect(reverse.end.x).toBeGreaterThan(200);
    expect(reverse.end.x).toBeLessThan(reverse.start.x);
    expect(forward.arrow).not.toBe(reverse.arrow);
  });

  it("routes around a third object rather than drawing through it", () => {
    const entities = [entity("source", 14, 30), entity("obstacle", 50, 30), entity("target", 86, 30)];
    const routed = universalEdgeGeometry(edge("source", "target"), entities)!;
    expect(routed).not.toBeNull();
    expect(routed.route).not.toBe("direct");
    expect(routed.path).toMatch(/\b(?:72|548)\b/);
    expect(routed.end.x).toBeGreaterThan(800);
  });

  it("never invents an arrow for a missing endpoint", () => {
    expect(universalEdgeGeometry(edge("source", "missing"), [entity("source", 20, 40)])).toBeNull();
  });
});
