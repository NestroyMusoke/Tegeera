import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const readable = (value: string) => value.length > 0 && value.length <= 34
  && value.split(/\s+/).length <= 5 && /^[a-z][a-z0-9 '-]*$/.test(value);
const clean = (value: string) => value.trim().replace(/^(?:a|an|the)\s+/, "");

export type ConditionFlowMatch =
  | { mode: "branch"; entryText: string; conditionText: string; trueText: string; falseText: string }
  | { mode: "loop"; stepText: string; conditionText: string; exitText: string };

/** Extracts control topology, never the literal road/fork/circle analogy used to explain it. */
export function matchConditionFlow(text: string): ConditionFlowMatch | null {
  const branchPatterns = [
    /^(?:if[- ]else|a conditional|a decision) means (?:the )?(.+?) (?:checks|tests|evaluates) (?:a|the) (.+?) and (?:takes|chooses|follows) one of two (?:paths|branches)$/,
    /^(?:the )?(.+?) (?:checks|tests|evaluates) (?:a|the) (.+?), then (?:takes|chooses|follows) either (?:the )?(?:true|yes|pass) (?:path|branch) or (?:the )?(?:false|no|fail) (?:path|branch)$/
  ];
  const branch = branchPatterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (branch) {
    const result = {
      mode: "branch" as const, entryText: clean(branch[1]), conditionText: clean(branch[2]),
      trueText: "true path", falseText: "false path"
    };
    return Object.values(result).slice(1).every(readable) ? result : null;
  }

  const loopPatterns = [
    /^(?:a |the )?(.+?) (?:just )?(?:keeps|continues) (?:repeating|running) (?:the )?(.+?) until (?:a|the) (.+?) becomes false$/,
    /^(?:a |the )?(.+?) repeats (?:the )?(.+?) while (?:a|the) (.+?) (?:is|remains) true$/
  ];
  const loop = loopPatterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (!loop) return null;
  const result = {
    mode: "loop" as const, stepText: clean(loop[2]), conditionText: clean(loop[3]), exitText: "exit"
  };
  return Object.values(result).slice(1).every(readable) ? result : null;
}

export const isConditionFlowRelation = (relation: SceneRelation) =>
  relation.kind === "checksCondition" || relation.kind === "takesTruePath" || relation.kind === "takesFalsePath";

export function conditionFlowGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const edges = relations.filter(isConditionFlowRelation);
  if (edges.length !== 3) return null;
  const check = edges.find(({ kind }) => kind === "checksCondition");
  const onTrue = edges.find(({ kind }) => kind === "takesTruePath");
  const onFalse = edges.find(({ kind }) => kind === "takesFalsePath");
  if (!check || !onTrue || !onFalse) return null;
  const byId = new Map(entities.map((entity) => [entity.id, entity] as const));
  const entry = byId.get(check.sourceIds[0]);
  const condition = byId.get(check.targetIds[0]);
  const trueTarget = byId.get(onTrue.targetIds[0]);
  const falseTarget = byId.get(onFalse.targetIds[0]);
  if (!entry || !condition || !trueTarget || !falseTarget
    || onTrue.sourceIds[0] !== condition.id || onFalse.sourceIds[0] !== condition.id
    || condition.visualRole !== "control-condition") return null;
  const mode = entry.id === trueTarget.id ? "loop" : "branch";
  if (mode === "loop") {
    if (entry.visualRole !== "control-step" || falseTarget.visualRole !== "control-exit"
      || new Set([entry.id, condition.id, falseTarget.id]).size !== 3) return null;
  } else if (entry.visualRole !== "control-entry" || trueTarget.visualRole !== "control-true" || falseTarget.visualRole !== "control-false"
    || new Set([entry.id, condition.id, trueTarget.id, falseTarget.id]).size !== 4) return null;
  return { mode, entry, condition, trueTarget, falseTarget } as const;
}

export function planConditionFlow(
  scene: SceneState,
  ids: { entryId: string; conditionId: string; trueId: string; falseId: string },
  movableIds: ReadonlySet<string>, mode: "branch" | "loop"
) {
  const uniqueIds = [...new Set(Object.values(ids))];
  if (uniqueIds.length !== (mode === "loop" ? 3 : 4)) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (uniqueIds.some((id) => !byId.has(id))) return null;
  const positions = mode === "branch"
    ? new Map([[ids.entryId, [18, 48]], [ids.conditionId, [48, 48]], [ids.trueId, [80, 30]], [ids.falseId, [80, 68]]] as const)
    : new Map([[ids.entryId, [30, 48]], [ids.conditionId, [60, 48]], [ids.falseId, [86, 68]]] as const);
  const candidate = scene.entities.map((entity) => {
    const position = positions.get(entity.id);
    return position ? { ...entity, x: position[0], y: position[1] } : entity;
  });
  const planned: SceneRelation[] = [
    { id: "planned-check", kind: "checksCondition", sourceIds: [ids.entryId], targetIds: [ids.conditionId] },
    { id: "planned-true", kind: "takesTruePath", sourceIds: [ids.conditionId], targetIds: [ids.trueId] },
    { id: "planned-false", kind: "takesFalsePath", sourceIds: [ids.conditionId], targetIds: [ids.falseId] }
  ];
  const selected = selectLayoutCandidate(scene, [candidate], {
    family: "condition-flow", validate: (projected) => Boolean(conditionFlowGeometry(planned, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
