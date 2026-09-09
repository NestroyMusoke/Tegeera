import { describe, expect, it } from "vitest";
import { connectorCrossingCount, selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneState } from "./schema";

const entity = (id: string, x: number, y: number): SceneEntity => ({
  id, kind: "generic", label: id, x, y, scale: 1, direction: "right", highlighted: false
});

const scene = (...entities: SceneEntity[]): SceneState => ({
  sceneId: "layout-test", revision: 0, entities, relations: [], context: { subjectIds: [], objectIds: [] }
});

describe("shared layout candidate evaluation", () => {
  it("rejects clipped, overlapping, and fixed-obstacle collisions", () => {
    const base = scene(entity("a", 12, 28), entity("fixed", 48, 28));
    const result = selectLayoutCandidate(base, [
      [entity("a", 1, 28)],
      [entity("a", 48, 28)],
      [entity("a", 30, 28)]
    ], { family: "event-graph" });
    expect(result?.entities[0]).toMatchObject({ id: "a", x: 30, y: 28 });
  });

  it("preserves the least movement and breaks equal scores deterministically", () => {
    const base = scene(entity("a", 30, 28));
    const result = selectLayoutCandidate(base, [
      [entity("a", 24, 28)],
      [entity("a", 36, 28)],
      [entity("a", 30, 60)]
    ], { family: "event-graph" });
    expect(result?.entities[0].x).toBe(24);
    expect(result?.score.movement).toBe(6);
  });

  it("counts only genuine crossings and strongly prefers a clear topology", () => {
    const edges = [
      { sourceId: "a", targetId: "d" },
      { sourceId: "b", targetId: "c" },
      { sourceId: "a", targetId: "b" }
    ];
    const crossed = [entity("a", 20, 20), entity("b", 20, 60), entity("c", 80, 20), entity("d", 80, 60)];
    const clear = [entity("a", 20, 20), entity("b", 20, 60), entity("c", 80, 60), entity("d", 80, 20)];
    expect(connectorCrossingCount(edges, crossed)).toBe(1);
    expect(connectorCrossingCount(edges, clear)).toBe(0);
    const result = selectLayoutCandidate(scene(...crossed), [crossed, clear], { family: "visual-flow", connectorEdges: edges });
    expect(result?.score.connectorCrossings).toBe(0);
  });
});
