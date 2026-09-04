import { describe, expect, it } from "vitest";
import { parseTeacherText } from "./parser";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";

describe("DoodleScript validation", () => {
  it("accepts a parsed queue scene", () => {
    const script = parseTeacherText(
      "Draw three students waiting in a queue",
      initialScene
    );
    const result = validateDoodleScript(script, initialScene);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.script.commands).toHaveLength(3);
  });

  it("rejects a command that references a missing entity", () => {
    const result = validateDoodleScript(
      {
        schemaVersion: "1.0.0",
        sceneId: "test",
        revision: 1,
        confidence: 0.9,
        sourceText: "Move the missing car left",
        commands: [{ action: "move", targetId: "missing", x: 20 }]
      },
      initialScene
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].gate).toBe("semantic");
  });

  it("rejects low-confidence changes", () => {
    const result = validateDoodleScript(
      {
        schemaVersion: "1.0.0",
        sceneId: "test",
        revision: 1,
        confidence: 0.2,
        sourceText: "Maybe something",
        commands: [
          {
            action: "create",
            entity: {
              id: "maybe",
              kind: "generic",
              x: 30,
              y: 40
            }
          }
        ]
      },
      initialScene
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues.some((issue) => issue.gate === "confidence")).toBe(
        true
      );
  });

  it("applies a valid script without changing the original scene", () => {
    const script = parseTeacherText("Draw a car", initialScene);
    const result = validateDoodleScript(script, initialScene);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = applyDoodleScript(initialScene, result.script);
    expect(initialScene.entities).toHaveLength(0);
    expect(next.entities[0].kind).toBe("car");
    expect(next.revision).toBe(1);
  });
});
