import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const clean = (value: string) => value.trim().replace(/^(?:a|an|the|in)\s+/, "");
const readable = (value: string) => value.length > 0 && value.length <= 30 && value.split(/\s+/).length <= 4 && /^[a-z][a-z0-9 '-]*$/.test(value);
export interface DoublingGrowthMatch { subjectText: string; oneText: string; twoText: string; fourText: string; eightText: string }

export function matchDoublingGrowth(text: string): DoublingGrowthMatch | null {
  const narrative = text.match(/^(.+?) (?:multiply|reproduce|increase) so fast that one becomes two, two becomes four, and (?:it|they) just keeps doubling$/);
  const direct = text.match(/^(?:in )?(.+?), (?:the )?(?:population|amount|number|group) doubles from one to two to four to eight$/)
    ?? text.match(/^(.+?) doubles from one to two to four to eight$/);
  const subjectText = clean((narrative ?? direct)?.[1] ?? "");
  const result = { subjectText, oneText: "1", twoText: "2", fourText: "4", eightText: "8" };
  return readable(subjectText) ? result : null;
}

export const isDoublingGrowthRelation = (relation: SceneRelation) => relation.kind === "growthStartsAt" || relation.kind === "doublesTo";

export function doublingGrowthGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const links = relations.filter(isDoublingGrowthRelation); if (links.length !== 4) return null;
  const start = links.find(({ kind }) => kind === "growthStartsAt");
  const doubles = links.filter(({ kind }) => kind === "doublesTo");
  if (!start || doubles.length !== 3) return null;
  const byId = new Map(entities.map((entity) => [entity.id, entity] as const));
  const subject = byId.get(start.sourceIds[0]); const one = byId.get(start.targetIds[0]);
  const oneEdge = one && doubles.find(({ sourceIds }) => sourceIds[0] === one.id); const two = oneEdge && byId.get(oneEdge.targetIds[0]);
  const twoEdge = two && doubles.find(({ sourceIds }) => sourceIds[0] === two.id); const four = twoEdge && byId.get(twoEdge.targetIds[0]);
  const fourEdge = four && doubles.find(({ sourceIds }) => sourceIds[0] === four.id); const eight = fourEdge && byId.get(fourEdge.targetIds[0]);
  if (!subject || !one || !two || !four || !eight || new Set([subject.id, one.id, two.id, four.id, eight.id]).size !== 5) return null;
  if (subject.visualRole !== "doubling-subject" || one.visualRole !== "doubling-one" || two.visualRole !== "doubling-two" || four.visualRole !== "doubling-four" || eight.visualRole !== "doubling-eight") return null;
  if (!(one.x < two.x && two.x < four.x && four.x < eight.x && Math.max(one.y, two.y, four.y, eight.y) - Math.min(one.y, two.y, four.y, eight.y) <= 4)) return null;
  return { subject, stages: [one, two, four, eight] as const };
}

export function planDoublingGrowth(scene: SceneState, ids: { subjectId: string; oneId: string; twoId: string; fourId: string; eightId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 5) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const)); if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const ordered = [ids.subjectId, ids.oneId, ids.twoId, ids.fourId, ids.eightId];
  const positions = [[10, 18], [14, 50], [36, 50], [60, 50], [84, 50]] as const;
  const candidate = ordered.map((id, index) => ({ ...byId.get(id)!, x: positions[index][0], y: positions[index][1] }));
  const planned: SceneRelation[] = [
    { id: "planned-start", kind: "growthStartsAt", sourceIds: [ids.subjectId], targetIds: [ids.oneId] },
    { id: "planned-1", kind: "doublesTo", sourceIds: [ids.oneId], targetIds: [ids.twoId] },
    { id: "planned-2", kind: "doublesTo", sourceIds: [ids.twoId], targetIds: [ids.fourId] },
    { id: "planned-3", kind: "doublesTo", sourceIds: [ids.fourId], targetIds: [ids.eightId] }
  ];
  const selected = selectLayoutCandidate(scene, [candidate], { family: "doubling-growth", validate: (projected) => Boolean(doublingGrowthGeometry(planned, projected)) })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
