import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { characterPoseFor } from "../components/characterPerformance";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { contactPairIsVisuallySafe, solveContactArm } from "./contactGeometry";
import { interpretTeacherText } from "./interpret";
import { solveTwoBone, twoBoneEndpoint } from "./inverseKinematics";
import { applyDoodleScript, initialScene } from "./scene";
import type { DoodleScript, SceneEntity, SceneState } from "./schema";
import { analyzeTeacherInput } from "./semanticFrame";
import { applyTargetedPerformance } from "./targetedPerformance";
import { validateDoodleScript } from "./validator";

function interpret(text: string, scene = initialScene): DoodleScript {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  return result.script;
}

function run(text: string, scene = initialScene): SceneState {
  const script = interpret(text, scene);
  const checked = validateDoodleScript(script, scene);
  if (!checked.ok) throw new Error(`${text}: ${JSON.stringify(script.commands)} ${JSON.stringify(checked.issues)}`);
  return applyDoodleScript(scene, checked.script);
}

const entity = (id: string, kind: SceneEntity["kind"], x: number, y: number): SceneEntity => ({
  id, kind, x, y, scale: 1, direction: "right", highlighted: false
});

describe("bounded contact geometry", () => {
  it("solves reachable two-bone targets exactly and reports unreachable ones", () => {
    for (const [x, y] of [[40, 0], [25, 20], [15, -20]]) {
      const solution = solveTwoBone(x, y);
      expect(solution.reachable).toBe(true);
      const endpoint = twoBoneEndpoint(solution.upper, solution.joint);
      expect(endpoint.x).toBeCloseTo(x, 8);
      expect(endpoint.y).toBeCloseTo(y, 8);
    }
    expect(solveTwoBone(60, 0)).toMatchObject({ reachable: false, error: 15 });
  });

  it("extracts a direct-object contact action without inventing a preposition", () => {
    const frame = analyzeTeacherInput("A teacher is touching a book").frames[0];
    expect(frame.actions).toEqual([{
      predicate: "touch",
      actorMentionIds: [frame.entities[0].mentionId],
      targetMentionIds: [frame.entities[1].mentionId],
      phase: "start"
    }]);
  });

  it("creates, stages and validates one identity-preserving touch scene", () => {
    const script = interpret("A teacher touches a book");
    expect(script.schemaVersion).toBe("1.6.0");
    expect(script.commands.filter((command) => command.action === "create")).toHaveLength(2);
    expect(script.commands).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "move", targetId: "book-1" }),
      expect.objectContaining({ action: "relate", relation: expect.objectContaining({
        kind: "actsOn", predicate: "touch", preposition: undefined
      }) })
    ]));
    const scene = run("A teacher touches a book");
    expect(scene.entities).toHaveLength(2);
    expect(contactPairIsVisuallySafe(scene.entities[0], scene.entities[1])).toBe(true);
    expect(renderToStaticMarkup(<DoodleCanvas scene={scene} />)).toContain("touches →");
  });

  it("places the rendered hand center exactly on the visible target surface", () => {
    const scene = run("A teacher touches a book");
    const actor = scene.entities.find((item) => item.kind === "teacher")!;
    const target = scene.entities.find((item) => item.kind === "book")!;
    const relation = scene.relations![0];
    const performed = applyTargetedPerformance(actor, target, relation);
    const pose = characterPoseFor(performed);
    const contact = solveContactArm(performed, target, pose.bodyLean);
    const endpoint = twoBoneEndpoint(pose.bodyLean + pose.rightArm.upper, pose.rightArm.joint);
    const facing = performed.direction === "left" ? -1 : 1;
    const worldHand = {
      x: contact.shoulder.x + endpoint.x * actor.scale * facing,
      y: contact.shoulder.y + endpoint.y * actor.scale
    };
    expect(worldHand.x).toBeCloseTo(contact.targetPoint.x, 7);
    expect(worldHand.y).toBeCloseTo(contact.targetPoint.y, 7);
  });

  it("reuses one contact action across the registered visual vocabulary", () => {
    for (const target of ["book", "tree", "car", "school", "cpu", "process", "person"]) {
      const scene = run(`A teacher touches a ${target}`);
      const actor = scene.entities[0];
      const object = scene.entities[1];
      expect(scene.relations?.[0]).toMatchObject({ predicate: "touch", sourceIds: [actor.id], targetIds: [object.id] });
      expect(solveContactArm(actor, object, actor.performance?.bodyLean ?? 0).solution.reachable, target).toBe(true);
      expect(contactPairIsVisuallySafe(actor, object), target).toBe(true);
    }
  });

  it("supports left-facing contact with the same endpoint accuracy", () => {
    const actor = { ...entity("teacher-1", "teacher", 50, 28), performance: { bodyLean: 2 } };
    const target = entity("book-1", "book", 41.5, 28);
    const relation = { id: "touch", kind: "actsOn" as const, predicate: "touch", sourceIds: [actor.id], targetIds: [target.id] };
    const performed = applyTargetedPerformance(actor, target, relation);
    const pose = characterPoseFor(performed);
    const contact = solveContactArm(performed, target, pose.bodyLean);
    expect(performed.direction).toBe("left");
    expect(contact.solution.reachable).toBe(true);
  });

  it("rejects detached contact between established distant entities without mutating them", () => {
    const base: SceneState = {
      sceneId: "scene", revision: 1, relations: [],
      entities: [entity("teacher-1", "teacher", 12, 28), entity("book-1", "book", 84, 28)]
    };
    const before = structuredClone(base);
    const script = interpret("The teacher touches the book", base);
    const checked = validateDoodleScript(script, base);
    expect(checked.ok).toBe(false);
    if (!checked.ok) expect(checked.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ gate: "layout", message: expect.stringContaining("cannot reach") })
    ]));
    expect(base).toEqual(before);
  });

  it("stops touching without deleting or duplicating either endpoint", () => {
    const touching = run("A student touches a book");
    const stopped = run("The student stops touching", touching);
    expect(stopped.entities.map((item) => item.id)).toEqual(["student-1", "book-1"]);
    expect(stopped.entities[0].performance).toBeUndefined();
    expect(stopped.entities[1]).toMatchObject({ x: 30, y: 28 });
    expect(stopped.relations).toEqual([]);
  });
});
