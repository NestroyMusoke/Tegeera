import { describe, expect, it } from "vitest";
import { initialScene } from "../doodlescript/scene";
import { sceneEntitySchema } from "../doodlescript/schema";
import { AcceptedPlanCache } from "./acceptedPlanCache";

const plan = { candidate: { blueprintVersion: "1.0", mode: "replace" }, provider: "test" };

describe("AcceptedPlanCache", () => {
  const complete = { candidate: { blueprintVersion: "1.0", mode: "replace",
    objects: [{ id: "bird", label: "bird" }], connections: [] }, provider: "test" };
  const occupied = { ...initialScene, revision: 2, entities: [sceneEntitySchema.parse({ id: "old", kind: "book", x: 50, y: 50 })] };

  it("recompiles a self-contained empty-canvas replacement across later scene revisions", () => {
    const cache = new AcceptedPlanCache();
    cache.put("A bird flies", initialScene, complete);
    expect(cache.get("A  bird flies", occupied)).toBe(complete);
    expect(cache.get("A bird lands", occupied)).toBeUndefined();
    cache.clear();
    expect(cache.get("A bird flies", occupied)).toBeUndefined();
  });

  it.each(["Move it", "Add another bird", "Make that bigger", "A bird flies there", "The same bird flies", "A bird now flies"])("keeps context-dependent requests scoped: %s", (text) => {
    const cache = new AcceptedPlanCache(); cache.put(text, initialScene, complete);
    expect(cache.get(text, occupied)).toBeUndefined();
    expect(cache.get(text, initialScene)).toBe(complete);
  });

  it("never promotes a plan learned from an occupied scene, an extension, or an external endpoint", () => {
    for (const [scene, value] of [
      [occupied, complete],
      [initialScene, { candidate: { ...complete.candidate, mode: "extend" } }],
      [initialScene, { candidate: { ...complete.candidate, connections: [{ from: "bird", to: "old" }] } }],
    ] as const) {
      const cache = new AcceptedPlanCache(); cache.put("A bird flies", scene, value);
      expect(cache.get("A bird flies", { ...occupied, revision: 3 })).toBeUndefined();
    }
  });

  it("distinguishes changes to semantic roles and discourse context", () => {
    const cache = new AcceptedPlanCache(); cache.put("Move it", occupied, complete);
    expect(cache.get("Move it", { ...occupied, entities: occupied.entities.map((entity) => ({ ...entity, propagationRole: "source" as const })) })).toBeUndefined();
    const contextual = { ...occupied, context: { subjectIds: ["old"], objectIds: [] } };
    expect(cache.get("Move it", contextual)).toBeUndefined();
  });

  it("bounds standalone replay entries and honours disabled caching", () => {
    const cache = new AcceptedPlanCache(1);
    cache.put("A bird flies", initialScene, complete); cache.put("A bird lands", initialScene, complete);
    expect(cache.get("A bird flies", occupied)).toBeUndefined();
    expect(cache.get("A bird lands", occupied)).toBe(complete);
    const disabled = new AcceptedPlanCache(0); disabled.put("A bird flies", initialScene, complete);
    expect(disabled.get("A bird flies", occupied)).toBeUndefined();
  });
  it("replays only the same text and complete scene context", () => {
    const cache = new AcceptedPlanCache();
    cache.put(" A dragon flies ", initialScene, plan);
    expect(cache.get("A  dragon flies", initialScene)).toBe(plan);
    expect(cache.get("A dragon walks", initialScene)).toBeUndefined();
    expect(cache.get("A dragon flies", { ...initialScene, revision: 1 })).toBeUndefined();
    expect(cache.get("A dragon flies", { ...initialScene, entities: [sceneEntitySchema.parse({ id: "x", kind: "generic", label: "dragon", x: 10, y: 20 })] })).toBeUndefined();
  });

  it("evicts oldest and clears when provider settings change", () => {
    const cache = new AcceptedPlanCache(2);
    cache.put("one", initialScene, plan);
    cache.put("two", initialScene, plan);
    cache.get("one", initialScene);
    cache.put("three", initialScene, plan);
    expect(cache.get("two", initialScene)).toBeUndefined();
    expect(cache.get("one", initialScene)).toBe(plan);
    cache.clear();
    expect(cache.get("one", initialScene)).toBeUndefined();
  });
});
