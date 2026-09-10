import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const CIRCULATION_LOOP_VERSION = "1.0.0";

const transferPattern = /^(.+?) (?:pump|pumps|send|sends|move|moves) (.+?) (?:to|through|into) (.+?),? and (.+?) (?:send|sends|return|returns|move|moves) (?:it|(?:the )?(.+?)) back (?:full of|with|carrying) (.+)$/;
const stripArticle = (text: string) => text.trim().replace(/^(?:a|an|the) /, "");
const comparable = (text: string) => stripArticle(text).replace(/s$/, "");

export interface CirculationLoopMatch {
  sourceText: string;
  destinationText: string;
  payloadText: string;
  enrichmentText: string;
}

/** Open source/destination/payload/enrichment slots for a closed transport statement. */
export function matchCirculationLoop(text: string): CirculationLoopMatch | null {
  const match = stripArticle(text).match(transferPattern);
  if (!match) return null;
  const sourceText = stripArticle(match[1]);
  const payloadText = stripArticle(match[2]);
  const destinationText = stripArticle(match[3]);
  const returnSourceText = stripArticle(match[4]);
  const explicitReturnPayload = match[5] ? stripArticle(match[5]) : payloadText;
  const enrichmentText = stripArticle(match[6]);
  if (comparable(destinationText) !== comparable(returnSourceText)
    || comparable(payloadText) !== comparable(explicitReturnPayload)) return null;
  if (new Set([sourceText, destinationText, payloadText, enrichmentText].map(comparable)).size !== 4) return null;
  return { sourceText, destinationText, payloadText, enrichmentText };
}

export function isCirculationRelation(relation: SceneRelation): boolean {
  return relation.kind === "pumpsTo" || relation.kind === "returnsTo" || relation.kind === "carries";
}

export interface CirculationLoopGeometry {
  source: SceneEntity;
  destination: SceneEntity;
  payload: SceneEntity;
  enrichment: SceneEntity;
  sourceX: number;
  sourceY: number;
  destinationX: number;
  destinationY: number;
  upperY: number;
  lowerY: number;
}

export function circulationLoopGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]): CirculationLoopGeometry | null {
  const outbound = relations.filter((relation) => relation.kind === "pumpsTo");
  const returning = relations.filter((relation) => relation.kind === "returnsTo");
  const carrying = relations.filter((relation) => relation.kind === "carries");
  if (outbound.length !== 1 || returning.length !== 1 || carrying.length !== 1) return null;
  const payloadId = outbound[0].objectIds?.[0];
  if (!payloadId || returning[0].objectIds?.[0] !== payloadId
    || outbound[0].sourceIds[0] !== returning[0].targetIds[0]
    || outbound[0].targetIds[0] !== returning[0].sourceIds[0]
    || carrying[0].sourceIds[0] !== payloadId) return null;
  const source = entities.find(({ id }) => id === outbound[0].sourceIds[0]);
  const destination = entities.find(({ id }) => id === outbound[0].targetIds[0]);
  const payload = entities.find(({ id }) => id === payloadId);
  const enrichment = entities.find(({ id }) => id === carrying[0].targetIds[0]);
  if (!source || !destination || !payload || !enrichment
    || source.visualRole !== "circulation-source" || destination.visualRole !== "circulation-destination"
    || payload.visualRole !== "circulation-payload" || enrichment.visualRole !== "circulation-enrichment") return null;
  if (!(source.x + 28 <= destination.x && payload.y + 10 <= source.y && source.y + 10 <= enrichment.y)) return null;
  return {
    source, destination, payload, enrichment,
    sourceX: source.x * 10, sourceY: source.y * 6.2,
    destinationX: destination.x * 10, destinationY: destination.y * 6.2,
    upperY: payload.y * 6.2, lowerY: enrichment.y * 6.2
  };
}

export function planCirculationLoop(
  scene: SceneState,
  ids: { sourceId: string; destinationId: string; payloadId: string; enrichmentId: string },
  movableIds: ReadonlySet<string>
): { targetId: string; x: number; y: number }[] | null {
  if (new Set(Object.values(ids)).size !== 4) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [
    [position(ids.sourceId, 27, 46), position(ids.destinationId, 73, 46), position(ids.payloadId, 50, 25), position(ids.enrichmentId, 50, 68)],
    [position(ids.sourceId, 24, 44), position(ids.destinationId, 76, 44), position(ids.payloadId, 50, 23), position(ids.enrichmentId, 50, 66)]
  ];
  const relations: SceneRelation[] = [
    { id: "planned-outbound", kind: "pumpsTo", sourceIds: [ids.sourceId], targetIds: [ids.destinationId], objectIds: [ids.payloadId] },
    { id: "planned-return", kind: "returnsTo", sourceIds: [ids.destinationId], targetIds: [ids.sourceId], objectIds: [ids.payloadId] },
    { id: "planned-carry", kind: "carries", sourceIds: [ids.payloadId], targetIds: [ids.enrichmentId] }
  ];
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "circulation-loop",
    validate: (projected) => Boolean(circulationLoopGeometry(relations, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
