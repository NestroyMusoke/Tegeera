import {
  doodleScriptSchema,
  type DoodleCommand,
  type DoodleScript,
  type SceneEntity,
  type SceneState
} from "./schema";

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

  for (const command of script.commands) {
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

  const created = script.commands
    .filter(
      (command): command is Extract<DoodleCommand, { action: "create" }> =>
        command.action === "create"
    )
    .map((command) => command.entity);

  if (hasDenseOverlap([...scene.entities, ...created])) {
    issues.push({
      gate: "layout",
      message: "The requested objects would overlap too closely."
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
      if (Math.abs(a.x - b.x) < 4 && Math.abs(a.y - b.y) < 7) return true;
    }
  }
  return false;
}
