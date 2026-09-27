import { describe, expect, it } from "vitest";
import { initialScene } from "../doodlescript/scene";
import { sceneEntitySchema } from "../doodlescript/schema";
import { AcceptedPlanCache } from "./acceptedPlanCache";

const plan = { candidate: { blueprintVersion: "1.0", mode: "replace" }, provider: "test" };

describe("AcceptedPlanCache", () => {
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
