import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const clean = (value: string) => value.trim().replace(/^(?:a|an|the)\s+/, "");
const readable = (value: string) => value.length > 0 && value.length <= 30 && value.split(/\s+/).length <= 4 && /^[a-z][a-z0-9 '-]*$/.test(value);

export interface ProcessorMemoryMatch { processorText: string; memoryText: string }

/** Extracts the real system relationship and deliberately drops any body-part metaphor. */
export function matchProcessorMemoryLink(text: string): ProcessorMemoryMatch | null {
  const analogy = text.match(/^(?:the )?(.+?) is (?:a |the )?(?:brain|control center) of (?:a |the )?(.+?), but it needs (?:the )?(.+?) nearby to (?:work|run) (?:fast|quickly)$/);
  if (analogy) {
    const result = { processorText: clean(analogy[1]), memoryText: clean(analogy[3]) };
    return Object.values(result).every(readable) ? result : null;
  }
  const direct = text.match(/^(?:a |the )?(.+?) (?:communicates with|exchanges data with|passes data back and forth with) (?:a |the )?(?:nearby )?(.+?) to (?:work|run|respond) (?:fast|quickly)$/);
  if (!direct) return null;
  const result = { processorText: clean(direct[1]), memoryText: clean(direct[2]) };
  return Object.values(result).every(readable) ? result : null;
}

export const isProcessorMemoryRelation = (relation: SceneRelation) => relation.kind === "exchangesWith" || relation.kind === "keptNear";

export function processorMemoryGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const links = relations.filter(isProcessorMemoryRelation);
  if (links.length !== 2) return null;
  const exchange = links.find(({ kind }) => kind === "exchangesWith");
  const proximity = links.find(({ kind }) => kind === "keptNear");
  if (!exchange || !proximity || exchange.sourceIds[0] !== proximity.sourceIds[0] || exchange.targetIds[0] !== proximity.targetIds[0]) return null;
  const processor = entities.find(({ id }) => id === exchange.sourceIds[0]);
  const memory = entities.find(({ id }) => id === exchange.targetIds[0]);
  if (!processor || !memory || processor.id === memory.id || processor.visualRole !== "compute-unit" || memory.visualRole !== "memory-unit") return null;
  if (!(processor.x < memory.x && Math.abs(processor.y - memory.y) <= 4 && memory.x - processor.x >= 24 && memory.x - processor.x <= 44)) return null;
  return { processor, memory };
}

export function planProcessorMemoryLink(scene: SceneState, ids: { processorId: string; memoryId: string }, movableIds: ReadonlySet<string>) {
  if (ids.processorId === ids.memoryId) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (!byId.has(ids.processorId) || !byId.has(ids.memoryId)) return null;
  const candidate = [{ ...byId.get(ids.processorId)!, x: 32, y: 48 }, { ...byId.get(ids.memoryId)!, x: 68, y: 48 }];
  const planned: SceneRelation[] = [
    { id: "planned-exchange", kind: "exchangesWith", sourceIds: [ids.processorId], targetIds: [ids.memoryId] },
    { id: "planned-near", kind: "keptNear", sourceIds: [ids.processorId], targetIds: [ids.memoryId] }
  ];
  const selected = selectLayoutCandidate(scene, [candidate], { family: "processor-memory-link", validate: (projected) => Boolean(processorMemoryGeometry(planned, projected)) })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
