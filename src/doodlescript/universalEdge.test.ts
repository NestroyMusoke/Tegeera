import { describe, expect, it } from "vitest";
import type { SceneEntity, SceneRelation } from "./schema";
import { entityVisualGeometry } from "./entityGeometry";
import { universalEdgeGeometry, universalSceneEdges } from "./universalEdge";

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
    expect(["above", "below"]).toContain(routed.route);
    expect(routed.end.x).toBeGreaterThan(800);
  });

  it("places a vertical relation label beside its arrow, away from object labels", () => {
    const entities = [entity("rain", 38, 30), entity("gutter", 38, 68)];
    const geometry = universalEdgeGeometry({ ...edge("rain", "gutter"), predicate: "passes through" }, entities)!;
    expect(geometry.route).toBe("direct");
    expect(geometry.start.y).toBeGreaterThan(entities[0].y * 6.2 + 96);
    expect(Math.abs(geometry.labelX - 380)).toBeGreaterThan(45);
    expect(geometry.labelY).toBeGreaterThan(entities[0].y * 6.2 + 80);
    expect(geometry.labelY).toBeLessThan(entities[1].y * 6.2 - 40);
  });

  it("never invents an arrow for a missing endpoint", () => {
    expect(universalEdgeGeometry(edge("source", "missing"), [entity("source", 20, 40)])).toBeNull();
  });

  it("never reverses a short vertical arrow to squeeze it between captions", () => {
    const entities = [entity("upper", 38, 30), entity("lower", 38, 52)];
    const geometry = universalEdgeGeometry(edge("upper", "lower"), entities);
    expect(geometry).not.toBeNull();
    expect(geometry!.route).not.toBe("direct");
    expect(geometry!.end.y).toBeGreaterThan(geometry!.start.y);
  });

  it("keeps relation captions clear of every object and sizes the pill for longer labels", () => {
    let checked = 0;
    for (let seed = 1; seed <= 250; seed++) {
      const random = (offset: number) => ((seed * (offset * 173 + 37)) % 79) + 11;
      const entities = [entity("source", random(1), random(2)),
        entity("target", random(3), random(4)), entity("other", random(5), random(6))];
      const relation = { ...edge("source", "target"), predicate: "transfers useful energy to" };
      const geometry = universalEdgeGeometry(relation, entities);
      if (!geometry) continue;
      checked++;
      expect(geometry.labelWidth).toBeGreaterThan(144);
      const label = { left: geometry.labelX - geometry.labelWidth / 2,
        right: geometry.labelX + geometry.labelWidth / 2,
        top: geometry.labelY - 18, bottom: geometry.labelY + 10 };
      for (const item of entities) {
        const rx = (entityVisualGeometry[item.kind].contact.halfWidth + 13) * item.scale;
        const object = { left: item.x * 10 - rx - 9, right: item.x * 10 + rx + 9,
          top: item.y * 6.2 - 55 * item.scale - 9,
          bottom: item.y * 6.2 + 84 * item.scale + 9 };
        expect(label.right < object.left || label.left > object.right
          || label.bottom < object.top || label.top > object.bottom).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("holds an impossible alternating-endpoint graph instead of painting crossed arrows", () => {
    const entities = [entity("northwest", 20, 18), entity("northeast", 80, 18),
      entity("southwest", 20, 75), entity("southeast", 80, 75)];
    const routed = universalSceneEdges([edge("northwest", "southeast"),
      edge("northeast", "southwest")], entities);
    const first = routed.get("northwest-southeast")!;
    const second = routed.get("northeast-southwest")!;
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("separates two routable arrows and their captions", () => {
    const entities = [entity("source", 20, 45), entity("upper", 75, 25), entity("lower", 75, 70)];
    const routed = universalSceneEdges([edge("source", "upper"), edge("source", "lower")], entities);
    const first = routed.get("source-upper")!;
    const second = routed.get("source-lower")!;
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    const a = { left: first!.labelX - first!.labelWidth / 2,
      right: first!.labelX + first!.labelWidth / 2,
      top: first!.labelY - 18, bottom: first!.labelY + 10 };
    const b = { left: second!.labelX - second!.labelWidth / 2,
      right: second!.labelX + second!.labelWidth / 2,
      top: second!.labelY - 18, bottom: second!.labelY + 10 };
    expect(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom).toBe(true);
  });
});
