import type {
  DoodleCommand,
  DoodleScript,
  SceneEntity,
  SceneState
} from "./schema";

export const initialScene: SceneState = {
  sceneId: "welcome",
  revision: 0,
  entities: [],
  message: "Tell me what you want your class to see."
};

function applyCommand(
  entities: SceneEntity[],
  command: DoodleCommand
): SceneEntity[] {
  switch (command.action) {
    case "relate":
      return entities;
    case "create":
      return [...entities, command.entity];
    case "move":
      return entities.map((entity) =>
        entity.id === command.targetId
          ? {
              ...entity,
              x: command.x ?? entity.x,
              y: command.y ?? entity.y,
              direction: command.direction ?? entity.direction
            }
          : entity
      );
    case "update":
      return entities.map((entity) =>
        entity.id === command.targetId
          ? {
              ...entity,
              label: command.label ?? entity.label,
              highlighted: command.highlighted ?? entity.highlighted,
              direction: command.direction ?? entity.direction
            }
          : entity
      );
    case "remove":
      return entities.filter((entity) => entity.id !== command.targetId);
    case "clear":
      return [];
  }
}

export function applyDoodleScript(
  scene: SceneState,
  script: DoodleScript
): SceneState {
  let relations = [...(scene.relations ?? [])];
  for (const command of script.commands) {
    if (command.action === "clear") relations = [];
    if (command.action === "relate") relations.push(command.relation);
    if (command.action === "remove") {
      relations = relations.map((relation) => ({
        ...relation,
        sourceIds: relation.sourceIds.filter((id) => id !== command.targetId),
        targetIds: relation.targetIds.filter((id) => id !== command.targetId)
      })).filter((relation) => relation.sourceIds.length && relation.targetIds.length);
    }
  }
  return {
    sceneId: script.sceneId,
    revision: scene.revision + 1,
    entities: script.commands.reduce(applyCommand, scene.entities),
    relations,
    message: undefined
  };
}
