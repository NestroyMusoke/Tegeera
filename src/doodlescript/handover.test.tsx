import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { characterPoseFor } from "../components/characterPerformance";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { contactPairIsVisuallySafe, solveContactArm } from "./contactGeometry";
import { applyHandoverPerformance, handoverParticipants } from "./handover";
import { interpretTeacherText } from "./interpret";
import { twoBoneEndpoint } from "./inverseKinematics";
import { applyDoodleScript, initialScene } from "./scene";
import type { DoodleScript, SceneState } from "./schema";
import { validateDoodleScript } from "./validator";

function interpret(text: string, scene = initialScene): DoodleScript {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  return result.script;
}

function run(text: string, scene = initialScene): SceneState {
  const script = interpret(text, scene);
  const checked = validateDoodleScript(script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("identity-preserving handovers", () => {
  it("encodes giver, recipient, and object as distinct DoodleScript 1.7 roles", () => {
    const before = run("Three students each have a book");
    const script = interpret("The first student gives book 1 to the second student", before);
    expect(script.schemaVersion).toBe("1.7.0");
    expect(script.commands).toContainEqual(expect.objectContaining({
      action: "relate",
      relation: expect.objectContaining({
        kind: "handover", predicate: "give", sourceIds: ["student-1"],
        targetIds: ["student-2"], objectIds: ["book-1"]
      })
    }));
  });

  it("moves only the three participants and transfers the original object atomically", () => {
    const before = run("Three students each have a book");
    const saved = structuredClone(before);
    const after = run("The first student gives book 1 to the second student", before);
    expect(before).toEqual(saved);
    expect(after.entities.map((entity) => entity.id)).toEqual(before.entities.map((entity) => entity.id));
    expect(new Set(after.entities.map((entity) => entity.id)).size).toBe(after.entities.length);
    expect(after.entities.filter((entity) => !["student-1", "student-2", "book-1"].includes(entity.id)))
      .toEqual(before.entities.filter((entity) => !["student-1", "student-2", "book-1"].includes(entity.id)));
    expect(after.relations?.find((relation) => relation.kind === "owns" && relation.targetIds.includes("book-1"))?.sourceIds)
      .toEqual(["student-2"]);
  });

  it("places both rendered hands exactly on opposite surfaces of the same object", () => {
    const scene = run("The first student gives book 1 to the second student", run("Three students each have a book"));
    const relation = scene.relations!.find((candidate) => candidate.kind === "handover")!;
    const trio = handoverParticipants(relation, scene.entities)!;
    expect(contactPairIsVisuallySafe(trio.giver, trio.object)).toBe(true);
    expect(contactPairIsVisuallySafe(trio.recipient, trio.object)).toBe(true);
    for (const actor of [trio.giver, trio.recipient]) {
      const performed = applyHandoverPerformance(actor, trio.object);
      const pose = characterPoseFor(performed);
      const contact = solveContactArm(performed, trio.object, pose.bodyLean);
      const endpoint = twoBoneEndpoint(pose.bodyLean + pose.rightArm.upper, pose.rightArm.joint);
      const facing = performed.direction === "left" ? -1 : 1;
      expect(contact.solution.reachable).toBe(true);
      expect(contact.shoulder.x + endpoint.x * actor.scale * facing).toBeCloseTo(contact.targetPoint.x, 7);
      expect(contact.shoulder.y + endpoint.y * actor.scale).toBeCloseTo(contact.targetPoint.y, 7);
    }
  });

  it("renders two opposing reaches, one object, and a readable transfer annotation", () => {
    const scene = run("The first student gives book 1 to the second student", run("Three students each have a book"));
    const html = renderToStaticMarkup(<DoodleCanvas scene={scene} />);
    expect(html.match(/data-handover-object="true"/g)).toHaveLength(1);
    expect(html).toContain('class="handover-annotation"');
    expect(html).toContain("student 1 gives book 1 to student 2");
    expect(html).toContain("gives book 1 to →");
  });

  it("reuses the same transfer planner across visual object kinds", () => {
    for (const noun of ["book", "car", "tree", "process", "school"]) {
      const before = run(`A teacher owns a ${noun}. Add a student`);
      let after: SceneState;
      try {
        after = run(`The teacher gives the ${noun} to the student`, before);
      } catch (error) {
        throw new Error(`${noun}: ${error instanceof Error ? error.message : String(error)}`);
      }
      const relation = after.relations!.find((candidate) => candidate.kind === "handover")!;
      const trio = handoverParticipants(relation, after.entities)!;
      expect(trio.object.kind, noun).not.toBe("generic");
      expect(after.entities.filter((entity) => entity.id === trio.object.id), noun).toHaveLength(1);
      expect(solveContactArm(trio.giver, trio.object).solution.reachable, noun).toBe(true);
      expect(solveContactArm(trio.recipient, trio.object).solution.reachable, noun).toBe(true);
    }
  });

  it("replaces an earlier handover of the same object and cleans every role on removal", () => {
    const first = run("The first student gives book 1 to the second student", run("Three students each have a book"));
    const second = run("The second student gives book 1 to the third student", first);
    expect(second.relations?.filter((relation) => relation.kind === "handover")).toEqual([
      expect.objectContaining({ sourceIds: ["student-2"], targetIds: ["student-3"], objectIds: ["book-1"] })
    ]);
    expect(second.entities.filter((entity) => entity.id === "book-1")).toHaveLength(1);
    const removed = run("Remove book 1", second);
    expect(removed.entities.some((entity) => entity.id === "book-1")).toBe(false);
    expect(removed.relations?.some((relation) => relation.kind === "handover" || relation.targetIds.includes("book-1"))).toBe(false);
  });

  it("rejects ambiguous legacy or malformed triadic relationships", () => {
    const before = run("Three students each have a book");
    const valid = interpret("The first student gives book 1 to the second student", before);
    const handover = valid.commands.find((command) => command.action === "relate" && command.relation.kind === "handover");
    expect(handover?.action).toBe("relate");
    expect(validateDoodleScript({ ...valid, schemaVersion: "1.6.0" }, before).ok).toBe(false);
    if (handover?.action === "relate") {
      const malformed = { ...valid, commands: valid.commands.map((command) => command === handover
        ? { ...command, relation: { ...command.relation, objectIds: ["book-1", "book-2"] } }
        : command) };
      expect(validateDoodleScript(malformed, before).ok).toBe(false);
    }
  });
});
