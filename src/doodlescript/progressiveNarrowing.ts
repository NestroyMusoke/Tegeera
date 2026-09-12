import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const clean = (value: string) => value.trim().replace(/^(?:a|an|the)\s+/, "");
const readable = (value: string) => value.length > 0 && value.length <= 34 && value.split(/\s+/).length <= 5 && /^[a-z][a-z0-9 '-]*$/.test(value);
export interface ProgressiveNarrowingMatch { processText: string; collectionText: string; initialText: string; reducedText: string; foundText: string }

export function matchProgressiveNarrowing(text: string): ProgressiveNarrowingMatch | null {
  const match = text.replace(/[.?!]+$/, "").match(/^in (?:a|an|the) (.+?), you (?:keep )?(?:cutting|reducing|halving) (?:the )?(.+?) (?:in|by) half until you find (.+)$/);
  if (!match) return null;
  const processText = clean(match[1]); const collectionText = clean(match[2]); const rawTarget = clean(match[3]);
  const foundText = /^(?:what you(?:'re| are) looking for|it|the answer)$/.test(rawTarget) ? "target item" : rawTarget;
  const result = { processText, collectionText, initialText: `full ${collectionText}`, reducedText: `smaller ${collectionText}`, foundText };
  return Object.values(result).every(readable) && new Set(Object.values(result)).size === 5 ? result : null;
}

export const isProgressiveNarrowingRelation = (relation: SceneRelation) => relation.kind === "startsSearchWith" || relation.kind === "narrowsTo" || relation.kind === "findsTarget";
export function progressiveNarrowingGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const edges = relations.filter(isProgressiveNarrowingRelation); if (edges.length !== 3) return null;
  const start = edges.find(({ kind }) => kind === "startsSearchWith"); const narrow = edges.find(({ kind }) => kind === "narrowsTo"); const find = edges.find(({ kind }) => kind === "findsTarget");
  if (!start || !narrow || !find) return null;
  const byId = new Map(entities.map((entity) => [entity.id, entity] as const));
  const process = byId.get(start.sourceIds[0]); const initial = byId.get(start.targetIds[0]); const reduced = byId.get(narrow.targetIds[0]); const found = byId.get(find.targetIds[0]);
  if (!process || !initial || !reduced || !found || narrow.sourceIds[0] !== initial.id || find.sourceIds[0] !== reduced.id || process.visualRole !== "narrowing-process" || initial.visualRole !== "narrowing-initial" || reduced.visualRole !== "narrowing-reduced" || found.visualRole !== "narrowing-found" || new Set([process.id, initial.id, reduced.id, found.id]).size !== 4 || !(initial.x < reduced.x && reduced.x < found.x)) return null;
  return { process, initial, reduced, found };
}
export function planProgressiveNarrowing(scene: SceneState, ids: { processId: string; initialId: string; reducedId: string; foundId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 4) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const)); if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const positions = [[10, 76], [25, 45], [58, 45], [85, 45]] as const; const ordered = [ids.processId, ids.initialId, ids.reducedId, ids.foundId];
  const candidate = ordered.map((id, index) => ({ ...byId.get(id)!, x: positions[index][0], y: positions[index][1] }));
  const planned: SceneRelation[] = [{ id: "planned-start", kind: "startsSearchWith", sourceIds: [ids.processId], targetIds: [ids.initialId] }, { id: "planned-narrow", kind: "narrowsTo", sourceIds: [ids.initialId], targetIds: [ids.reducedId] }, { id: "planned-find", kind: "findsTarget", sourceIds: [ids.reducedId], targetIds: [ids.foundId] }];
  const selected = selectLayoutCandidate(scene, [candidate], { family: "progressive-narrowing", validate: (projected) => Boolean(progressiveNarrowingGeometry(planned, projected)) })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
