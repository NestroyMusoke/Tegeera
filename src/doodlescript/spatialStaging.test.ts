import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { overlaps } from "./layout";
import { applyDoodleScript, initialScene } from "./scene";
import type { SceneEntity, SceneState } from "./schema";
import { stageTargetedPair } from "./spatialStaging";
import { validateDoodleScript } from "./validator";

const entity = (id: string, kind: SceneEntity["kind"], x: number, y: number): SceneEntity => ({
  id, kind, x, y, scale: 1, direction: "right", highlighted: false
});

function run(text: string, scene = initialScene): SceneState {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const checked = validateDoodleScript(result.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

describe("constraint-based spatial staging", () => {
  it("stages two new entities into a clear, level, readable performance", () => {
    const actor = entity("teacher-1", "teacher", 12, 60);
    const target = entity("tree-1", "tree", 84, 28);
    const scene: SceneState = { sceneId: "scene", revision: 0, entities: [actor, target], relations: [] };
    const moves = stageTargetedPair(scene, actor.id, target.id, new Set([actor.id, target.id]));
    const staged = scene.entities.map((item) => {
      const move = moves.find((candidate) => candidate.targetId === item.id);
      return move ? { ...item, x: move.x, y: move.y } : item;
    });
    expect(moves).toEqual(stageTargetedPair(scene, actor.id, target.id, new Set([actor.id, target.id])));
    expect(staged[0].y).toBe(staged[1].y);
    expect(staged[0].x).toBeLessThan(staged[1].x);
    expect(overlaps(staged[0], staged[1])).toBe(false);
  });

  it("moves only a new target around an existing actor anchor", () => {
    const actor = entity("teacher-1", "teacher", 84, 28);
    const target = entity("book-1", "book", 12, 60);
    const scene: SceneState = { sceneId: "scene", revision: 0, entities: [actor, target], relations: [] };
    const moves = stageTargetedPair(scene, actor.id, target.id, new Set([target.id]));
    expect(moves.map((move) => move.targetId)).toEqual([target.id]);
    expect(moves[0]).toMatchObject({ y: actor.y });
    expect(moves[0].x).toBeLessThan(actor.x);
  });

  it("moves only a new actor around an existing target anchor", () => {
    const actor = entity("student-1", "student", 84, 60);
    const target = entity("tree-1", "tree", 48, 28);
    const blocker = entity("car-1", "car", 30, 28);
    const scene: SceneState = { sceneId: "scene", revision: 0, entities: [target, blocker, actor], relations: [] };
    const moves = stageTargetedPair(scene, actor.id, target.id, new Set([actor.id]));
    expect(moves.map((move) => move.targetId)).toEqual([actor.id]);
    const stagedActor = { ...actor, ...moves[0] };
    expect(stagedActor.y).toBe(target.y);
    expect(overlaps(stagedActor, target)).toBe(false);
    expect(overlaps(stagedActor, blocker)).toBe(false);
  });

  it("preserves the entire scene when neither endpoint is new", () => {
    const scene: SceneState = {
      sceneId: "scene", revision: 0,
      entities: [entity("teacher-1", "teacher", 12, 28), entity("tree-1", "tree", 84, 60)],
      relations: []
    };
    expect(stageTargetedPair(scene, "teacher-1", "tree-1", new Set())).toEqual([]);
  });

  it("integrates staging into open-language action planning without moving existing targets", () => {
    const movedOnce = run("Move the tree right", run("A tree"));
    const base = run("Move the tree right", movedOnce);
    const treeBefore = base.entities.find((item) => item.kind === "tree")!;
    const result = interpretTeacherText("A teacher points at the tree", base);
    if (!result.ok) throw new Error(result.message);
    expect(result.script.commands).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "move", targetId: "teacher-1", x: 30, y: 28 })
    ]));
    const checked = validateDoodleScript(result.script, base);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const after = applyDoodleScript(base, checked.script);
    const treeAfter = after.entities.find((item) => item.id === treeBefore.id)!;
    const teacher = after.entities.find((item) => item.kind === "teacher")!;
    expect(treeAfter).toEqual(treeBefore);
    expect(teacher.y).toBe(treeAfter.y);
    expect(overlaps(teacher, treeAfter)).toBe(false);
    expect(after.relations).toEqual([expect.objectContaining({
      kind: "actsOn", sourceIds: [teacher.id], targetIds: [treeAfter.id]
    })]);
  });
});
