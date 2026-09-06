import type { SceneEntity, SceneRelation } from "./schema";

export const isQueue = (relation: SceneRelation) => relation.kind === "queuedFor";

export function queueGeometry(relation: SceneRelation, entities: SceneEntity[]) {
  if (!isQueue(relation) || relation.targetIds.length !== 1) return null;
  const sources = relation.sourceIds.map((id) => entities.find((entity) => entity.id === id));
  const cpu = entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!cpu || sources.some((entity) => !entity)) return null;
  const processes = sources as SceneEntity[];
  if (cpu.kind !== "cpu" || processes.some((entity) => entity.kind !== "process" || entity.y !== cpu.y)) return null;
  if (processes.some((entity, index) => index > 0 && entity.x <= processes[index - 1].x)) return null;
  if (processes.at(-1)!.x >= cpu.x) return null;
  return { processes, cpu, y: cpu.y * 6.2 + 92, startX: processes[0].x * 10, endX: cpu.x * 10 - 62 };
}
