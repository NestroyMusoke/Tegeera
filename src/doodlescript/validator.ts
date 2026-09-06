import {
  doodleScriptSchema,
  type DoodleCommand,
  type DoodleScript,
  type SceneEntity,
  type SceneState
} from "./schema";
import { applyDoodleScript } from "./scene";
import { overlaps, withinCanvas } from "./layout";
import { isMotion, motionGeometry } from "./motion";

export type GateName = "schema" | "semantic" | "layout" | "confidence";

export interface GateIssue {
  gate: GateName;
  message: string;
}

export type ValidationResult =
  | { ok: true; script: DoodleScript; issues: [] }
  | { ok: false; issues: GateIssue[] };

const idsAfterCommand = (
  ids: Set<string>,
  command: DoodleCommand
): Set<string> => {
  const next = new Set(ids);
  if (command.action === "create") next.add(command.entity.id);
  if (command.action === "remove") next.delete(command.targetId);
  if (command.action === "clear") next.clear();
  return next;
};

export function validateDoodleScript(
  candidate: unknown,
  scene: SceneState,
  minimumConfidence = 0.58
): ValidationResult {
  const parsed = doodleScriptSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        gate: "schema",
        message: `${issue.path.join(".") || "script"}: ${issue.message}`
      }))
    };
  }

  const script = parsed.data;
  const issues: GateIssue[] = [];
  let ids = new Set(scene.entities.map((entity) => entity.id));
  const relationIds = new Set((scene.relations ?? []).map((relation) => relation.id));
  if (script.revision !== scene.revision + 1 || (scene.sceneId !== "welcome" && script.sceneId !== scene.sceneId)) {
    issues.push({ gate: "semantic", message: "This change belongs to an older or different scene. Please try again." });
  }

  for (const command of script.commands) {
    if (command.action === "unrelate") {
      if (!["1.2.0", "1.3.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Relationship edits require DoodleScript 1.2.0 or later." });
      if (!relationIds.delete(command.relationId)) issues.push({ gate: "semantic", message: "That relationship no longer exists." });
    }
    if (command.action === "clear") relationIds.clear();
    if (command.action === "relate") {
      const relation = command.relation;
      const members = [...relation.sourceIds, ...relation.targetIds];
      if (isMotion(relation)) {
        if (script.schemaVersion !== "1.3.0") issues.push({ gate: "schema", message: "Directed motion requires DoodleScript 1.3.0." });
        if (relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) issues.push({ gate: "semantic", message: "Motion needs one actor and one reference object." });
      }
      if (script.schemaVersion === "1.0.0") {
        issues.push({ gate: "schema", message: "Relationships require DoodleScript 1.1.0." });
      }
      if (relationIds.has(relation.id) || members.some((id) => !ids.has(id)) || new Set(members).size !== members.length) {
        issues.push({ gate: "semantic", message: "A relationship has duplicate or missing references." });
      }
      if (relation.kind === "owns" && relation.sourceIds.length !== 1) {
        issues.push({ gate: "semantic", message: "Personal ownership needs one owner." });
      }
      relationIds.add(relation.id);
    }
    if (command.action === "create" && ids.has(command.entity.id)) {
      issues.push({
        gate: "semantic",
        message: `Entity "${command.entity.id}" already exists.`
      });
    }

    if (
      (command.action === "move" ||
        command.action === "update" ||
        command.action === "remove") &&
      !ids.has(command.targetId)
    ) {
      issues.push({
        gate: "semantic",
        message: `Entity "${command.targetId}" does not exist.`
      });
    }

    ids = idsAfterCommand(ids, command);
  }

  const projected = applyDoodleScript(scene, script);
  if (script.context) {
    if (!["1.2.0", "1.3.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Conversation context requires DoodleScript 1.2.0 or later." });
    for (const references of [script.context.subjectIds, script.context.objectIds]) {
      if (new Set(references).size !== references.length || references.some((id) => !ids.has(id))) {
        issues.push({ gate: "semantic", message: "Conversation context refers to missing or duplicate objects." });
      }
    }
  }
  const owned = new Set<string>();
  const moving = new Set<string>();
  for (const relation of projected.relations ?? []) {
    if (isMotion(relation)) {
      const actor = projected.entities.find((entity) => entity.id === relation.sourceIds[0]);
      const target = projected.entities.find((entity) => entity.id === relation.targetIds[0]);
      if (moving.has(relation.sourceIds[0])) issues.push({ gate: "semantic", message: "An actor cannot have conflicting simultaneous directions." });
      moving.add(relation.sourceIds[0]);
      if (actor && target && !motionGeometry(actor, target, relation.kind as "toward" | "away")) issues.push({ gate: "layout", message: "Place the moving object and its reference on the same row with room for an arrow." });
    }
    if (relation.kind !== "owns") continue;
    for (const id of relation.targetIds) {
      if (owned.has(id)) issues.push({ gate: "semantic", message: "An object cannot have two personal owners. Transfer it explicitly." });
      owned.add(id);
    }
  }
  if (hasDenseOverlap(projected.entities) || projected.entities.some((entity) => !withinCanvas(entity))) {
    issues.push({
      gate: "layout",
      message: "The change would overlap or clip an object or label. Choose another position or a shorter label."
    });
  }

  if (script.confidence < minimumConfidence) {
    issues.push({
      gate: "confidence",
      message: "I am not certain enough to change the drawing."
    });
  }

  return issues.length ? { ok: false, issues } : { ok: true, script, issues: [] };
}

function hasDenseOverlap(entities: SceneEntity[]): boolean {
  for (let index = 0; index < entities.length; index += 1) {
    for (let other = index + 1; other < entities.length; other += 1) {
      const a = entities[index];
      const b = entities[other];
      if (overlaps(a, b)) return true;
    }
  }
  return false;
}
