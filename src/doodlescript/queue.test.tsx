import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "./interpret";
import { queueGeometry } from "./queue";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";
import type { SceneState } from "./schema";

function run(text: string, scene = initialScene): SceneState {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const checked = validateDoodleScript(result.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("CPU ready queue", () => {
  for (const text of [
    "Imagine three processes waiting in a CPU queue",
    "Three processes are waiting in the CPU ready queue",
    "The CPU ready queue contains three processes"
  ]) it(text, () => {
    const scene = run(text);
    expect(scene.entities.map((entity) => entity.kind)).toEqual(["process", "process", "process", "cpu"]);
    expect(scene.relations?.[0]).toMatchObject({ kind: "queuedFor", sourceIds: ["process-1", "process-2", "process-3"], targetIds: ["cpu-1"] });
    expect(queueGeometry(scene.relations![0], scene.entities)).not.toBeNull();
  });

  it("increases the queue while preserving IDs and compacting before the CPU", () => {
    const before = run("Three processes waiting in a CPU queue");
    const after = run("Make that four processes", before);
    expect(after.relations?.[0].sourceIds).toEqual(["process-1", "process-2", "process-3", "process-4"]);
    expect(after.entities.filter((entity) => entity.kind === "process").map((entity) => entity.x)).toEqual([12, 30, 48, 66]);
    expect(after.entities.find((entity) => entity.kind === "cpu")?.x).toBe(84);
    for (const id of ["process-1", "process-2", "process-3"]) expect(after.entities.find((entity) => entity.id === id)?.id).toBe(before.entities.find((entity) => entity.id === id)?.id);
  });

  it("moves the CPU right after increasing the queue", () => {
    const before = run("Make that four processes", run("Three processes waiting in a CPU queue"));
    const after = run("Move the CPU to the right", before);
    expect(after.entities.find((entity) => entity.kind === "cpu")?.x).toBe(92);
    expect(after.relations).toEqual(before.relations);
  });

  it("puts the second process first without recreating processes", () => {
    const before = run("Three processes waiting in a CPU queue");
    const after = run("What if the second process goes first", before);
    expect(after.relations?.[0].sourceIds).toEqual(["process-2", "process-1", "process-3"]);
    expect(after.entities.find((entity) => entity.id === "process-2")?.x).toBe(12);
    expect(after.entities.find((entity) => entity.id === "process-1")?.x).toBe(30);
    expect(after.entities.map((entity) => entity.id).sort()).toEqual(before.entities.map((entity) => entity.id).sort());
  });

  it("renders a labelled ordered queue and dedicated doodles", () => {
    const html = renderToStaticMarkup(<DoodleCanvas scene={run("Three processes waiting in a CPU queue")} />);
    expect(html).toContain('class="queue-annotation"');
    expect(html).toContain("ready queue → CPU");
    expect(html).toContain(">CPU</text>");
    expect(html.match(/>P<\/text>/g)).toHaveLength(3);
    expect(html).toContain("CPU ready queue: process 1, process 2, process 3, then cpu 1");
  });

  it("rejects misleading or unreadable queue descriptions atomically", () => {
    const before = run("A tree");
    const saved = structuredClone(before);
    for (const text of [
      "Five processes waiting in a CPU queue",
      "Three students waiting in a CPU queue",
      "Processes waiting in a CPU queue",
      "Three processes waiting in two CPU queues",
      "What if the second process crashes first"
    ]) {
      expect(interpretTeacherText(text, before).ok, text).toBe(false);
      expect(before).toEqual(saved);
    }
  });

  it("requires DoodleScript 1.4 and valid ordered geometry", () => {
    const result = interpretTeacherText("Three processes waiting in a CPU queue", initialScene);
    if (!result.ok) throw new Error(result.message);
    expect(validateDoodleScript({ ...result.script, schemaVersion: "1.3.0" }, initialScene).ok).toBe(false);
    const scene = run("Three processes waiting in a CPU queue");
    const relation = scene.relations![0];
    const malformed = { ...scene, entities: scene.entities.map((entity) => entity.id === "cpu-1" ? { ...entity, x: 30 } : entity) };
    expect(queueGeometry(relation, malformed.entities)).toBeNull();
    const wrongRole = { ...result.script, commands: result.script.commands.map((command) => command.action === "create" && command.entity.id === "process-1" ? { ...command, entity: { ...command.entity, kind: "student" as const } } : command) };
    expect(validateDoodleScript(wrongRole, initialScene)).toMatchObject({ ok: false, issues: expect.arrayContaining([expect.objectContaining({ gate: "semantic" })]) });
  });
});
