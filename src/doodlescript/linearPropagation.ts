import { overlaps, withinCanvas } from "./layout";
import type { DoodleScript, SceneEntity, SceneRelation, SceneState } from "./schema";

export interface LinearPropagationMatch { source: string; medium: string; payload: string; destination: string }
const clean = (value: string) => value.trim().replace(/^(?:a|an|the)\s+/, "");
const readable = (value: string) => value.length > 0 && value.length <= 30 && value.split(/\s+/).length <= 5
  && /^[a-z][a-z '-]*$/.test(value) && !/\b(?:and|but|if|unless|not|never|might|may|could)\b/.test(value);

/** Extracts a directional propagation relationship; nouns remain open slots. */
export function matchLinearPropagation(input: string): LinearPropagationMatch | null {
  if (input.length > 500) return null;
  const text = input.toLowerCase().trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  // Addition requests and unresolved references are not standalone replacement
  // explanations. Let the ordinary interpreter clarify or resolve them.
  if (/^(?:add|also|include|another|and)\b/.test(text)) return null;
  if (/\b(?:no|not|never|cannot|can't|doesn't|don't|isn't|aren't|without|might|may|maybe|perhaps|possibly|probably|could|if|unless|provided|assuming)\b/.test(text)) return null;
  const thermal = text.match(/^(?:when you |you )heat (.+?) at one end,? (?:the )?(heat|thermal energy) (?:slowly )?(?:moves|spreads|travels) (?:along|through)(?: it)? to (?:the )?(other end|far end|opposite end)$/);
  const direct = text.match(/^(.+?) (?:slowly )?(?:moves|spreads|travels|propagates) (?:along|through) (.+?) from (.+?) to (.+)$/);
  if (!thermal && /^(?:what|why|how|where|when|whether|who)\b/.test(text)) return null;
  const result = thermal ? { source: "heat source", medium: clean(thermal[1]), payload: thermal[2], destination: thermal[3] }
    : direct ? { payload: clean(direct[1]), medium: clean(direct[2]), source: clean(direct[3]), destination: clean(direct[4]) } : null;
  if (!result || !Object.values(result).every(readable) || new Set(Object.values(result)).size !== 4) return null;
  if (Object.values(result).some((value) => /^(?:it|this|that|they|them|these|those|same|existing|previous)(?:\s|$)/.test(value))) return null;
  if (["left", "right"].some((side) => new RegExp(`\\b${side}\\b`).test(result.source) && new RegExp(`\\b${side}\\b`).test(result.destination))) return null;
  return result;
}

export const isPropagationEntity = (entity: SceneEntity) => entity.propagationRole !== undefined;
export function linearPropagationGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const nodes = entities.filter(isPropagationEntity);
  if (nodes.length !== 4 || entities.length !== 4) return null;
  const source = nodes.find((entity) => entity.propagationRole === "source");
  const medium = nodes.find((entity) => entity.propagationRole === "medium");
  const payload = nodes.find((entity) => entity.propagationRole === "payload");
  const destination = nodes.find((entity) => entity.propagationRole === "destination");
  if (!source || !medium || !payload || !destination) return null;
  const ids = new Set(nodes.map(({ id }) => id));
  const edges = relations.filter((edge) => [...edge.sourceIds, ...edge.targetIds].some((id) => ids.has(id)));
  const expected = [["enters", source.id, medium.id], ["propagatesThrough", payload.id, medium.id], ["reaches", payload.id, destination.id]];
  if (edges.length !== 3 || !expected.every(([predicate, from, to]) => edges.some((edge) => edge.kind === "relatesTo"
    && edge.predicate === predicate && edge.sourceIds.length === 1 && edge.targetIds.length === 1
    && edge.sourceIds[0] === from && edge.targetIds[0] === to))) return null;
  // Rendering uses these semantic anchors, so moved endpoints cannot silently
  // produce a contradictory arrow or a detached source.
  if (!((source.x < medium.x && medium.x < destination.x || source.x > medium.x && medium.x > destination.x) && Math.abs(source.y - destination.y) < 1
    && Math.abs(payload.x - medium.x) < 1 && payload.y < source.y && medium.y > source.y)) return null;
  return { source, medium, payload, destination, relationId: edges.find(({ predicate }) => predicate === "enters")!.id,
    thermal: /^(?:heat|thermal energy)$/i.test(payload.label ?? "") };
}

export function buildLinearPropagation(match: LinearPropagationMatch, scene: SceneState, sourceText: string, reverseDirection?: boolean): DoodleScript | null {
  // Complete propagation explanations can replace a prior propagation scene
  // atomically. The old scene remains in the application's Undo history.
  // Other kinds of scene still require an explicit new-scene action.
  const replacing = scene.entities.length > 0;
  if (replacing && !linearPropagationGeometry(scene.relations ?? [], scene.entities)) return null;
  const reversed = reverseDirection ?? (/\bright\b/.test(match.source) || /\bleft\b/.test(match.destination));
  const positions = { source: { x: reversed ? 82 : 18, y: 50 }, medium: { x: 50, y: 65 }, payload: { x: 50, y: 28 }, destination: { x: reversed ? 18 : 82, y: 50 } };
  const entities: SceneEntity[] = (Object.keys(positions) as Array<keyof typeof positions>).map((role) => ({
    id: `propagation-${scene.revision + 1}-${role}`, kind: "generic", label: match[role], propagationRole: role,
    ...positions[role], scale: 1, direction: "right", highlighted: false
  }));
  if (entities.some((entity, index) => !withinCanvas(entity) || entities.slice(index + 1).some((other) => overlaps(entity, other)))) return null;
  const id = (role: keyof typeof positions) => entities.find((entity) => entity.propagationRole === role)!.id;
  const relations: SceneRelation[] = [["enters", "source", "medium"], ["propagatesThrough", "payload", "medium"], ["reaches", "payload", "destination"]]
    .map(([predicate, from, to], index) => ({ id: `propagation-${scene.revision + 1}-edge-${index}`, kind: "relatesTo",
      predicate, sourceIds: [id(from as keyof typeof positions)], targetIds: [id(to as keyof typeof positions)] }));
  return { schemaVersion: "2.27.0", sceneId: scene.sceneId, revision: scene.revision + 1, confidence: 1, sourceText,
    commands: [...(replacing ? [{ action: "clear" as const }] : []), ...entities.map((entity) => ({ action: "create" as const, entity })),
      ...relations.map((relation) => ({ action: "relate" as const, relation }))],
    context: { subjectIds: [id("payload")], objectIds: [id("medium"), id("destination")] } };
}
