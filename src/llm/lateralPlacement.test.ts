import { describe, expect, it } from "vitest";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { compileUniversalScene } from "./universalScene";

describe("mixed lateral and vertical scene constraints", () => {
  it("adds beside an existing object without moving its off-grid anchor", () => {
    const previous = { ...initialScene, entities: [{ id: "existing", label: "cup", kind: "generic" as const,
      x: 50, y: 50, scale: 1, direction: "right" as const, highlighted: false }] };
    const candidate = { blueprintVersion: "1.0", mode: "extend", confidence: 0.95,
      objects: [{ id: "new", label: "flower", kind: "generic", x: 20, y: 30 }],
      connections: [{ from: "new", to: "existing", label: "beside" }] };
    const script = compileUniversalScene(candidate, previous, "Add a flower beside the cup.");
    expect(validateDoodleScript(script, previous).ok).toBe(true);
    const scene = applyDoodleScript(previous, script);
    expect(scene.entities.find((entity) => entity.id === "existing")).toEqual(previous.entities[0]);
    expect(scene.entities.find((entity) => entity.label === "flower")?.y).toBe(50);
  });
  it.each(["beside", "stands next to", "alongside"])("preserves %s while repairing reversed vertical coordinates", (label) => {
    // Deliberately unrelated nouns: this is a relation rule, not a scene template.
    const candidate = { blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [
        { id: "a", label: "flower", kind: "generic", x: 30, y: 30 },
        { id: "b", label: "cup", kind: "generic", x: 50, y: 30 },
        { id: "c", label: "cloud", kind: "generic", x: 50, y: 60 }
      ], connections: [{ from: "a", to: "b", label }, { from: "b", to: "c", label: "below" }] };
    const script = compileUniversalScene(candidate, initialScene, "A flower beside a cup below a cloud.");
    expect(validateDoodleScript(script, initialScene).ok).toBe(true);
    const scene = applyDoodleScript(initialScene, script);
    const byLabel = (noun: string) => scene.entities.find((entity) => entity.label === noun)!;
    expect(byLabel("flower").y).toBe(byLabel("cup").y);
    expect(byLabel("flower").x).not.toBe(byLabel("cup").x);
    expect(byLabel("cup").y).toBeGreaterThan(byLabel("cloud").y);
    expect(scene.relations).toHaveLength(2);
  });
});
