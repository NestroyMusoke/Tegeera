import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const LANDSCAPE_FLOW_VERSION = "1.0.0";

const WATERCOURSE = /\b(?:river|rivers|stream|streams|creek|creeks|watercourse|watercourses|water)\b/;
const ELEVATED_SOURCE = /\b(?:higher ground|high ground|highlands?|uplands?|hills?|mountains?|slopes?|plateaus?|springs?)\b/;
const WATER_DESTINATION = /\b(?:sea|seas|ocean|oceans|lake|lakes|reservoir|reservoirs|estuary|estuaries)\b/;
const constructionPattern = /^(.+?) (?:usually |generally |normally )?(?:flow|flows|run|runs) (?:(?:down|downhill|downwards?) )?from (.+?)(?: (?:down|downhill|downwards?))? (?:to|into|towards?) (.+)$/;
const stripArticle = (text: string) => text.trim().replace(/^(?:a|an|the) /, "");

export interface LandscapeFlowMatch {
  watercourseText: string;
  sourceText: string;
  destinationText: string;
}

/** Open semantic slots constrained by landscape roles, never by a complete lesson sentence. */
export function matchLandscapeFlow(text: string): LandscapeFlowMatch | null {
  const match = text.match(constructionPattern);
  if (!match) return null;
  const watercourseText = stripArticle(match[1]);
  const sourceText = stripArticle(match[2]).replace(/ (?:down|downhill|downwards?)$/, "");
  const destinationText = stripArticle(match[3]);
  if (!WATERCOURSE.test(watercourseText) || !ELEVATED_SOURCE.test(sourceText) || !WATER_DESTINATION.test(destinationText)) return null;
  if (new Set([watercourseText, sourceText, destinationText]).size !== 3) return null;
  return { watercourseText, sourceText, destinationText };
}

export function isLandscapeFlowRelation(relation: SceneRelation): boolean {
  return relation.kind === "flowsFrom" || relation.kind === "flowsTo";
}

export interface LandscapeFlowGeometry {
  watercourse: SceneEntity;
  source: SceneEntity;
  destination: SceneEntity;
  sourceX: number;
  sourceY: number;
  riverX: number;
  riverY: number;
  destinationX: number;
  destinationY: number;
  riverPath: string;
}

export function landscapeFlowGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]): LandscapeFlowGeometry | null {
  const from = relations.filter((relation) => relation.kind === "flowsFrom");
  const to = relations.filter((relation) => relation.kind === "flowsTo");
  if (from.length !== 1 || to.length !== 1 || from[0].sourceIds[0] !== to[0].sourceIds[0]) return null;
  const watercourse = entities.find(({ id }) => id === from[0].sourceIds[0]);
  const source = entities.find(({ id }) => id === from[0].targetIds[0]);
  const destination = entities.find(({ id }) => id === to[0].targetIds[0]);
  if (!watercourse || !source || !destination || watercourse.visualRole !== "watercourse"
    || source.visualRole !== "elevated-source" || destination.visualRole !== "water-destination") return null;
  if (!(source.x + 16 <= watercourse.x && watercourse.x + 16 <= destination.x
    && source.y + 12 <= watercourse.y && watercourse.y + 8 <= destination.y)) return null;
  const sourceX = source.x * 10;
  const sourceY = source.y * 6.2;
  const riverX = watercourse.x * 10;
  const riverY = watercourse.y * 6.2;
  const destinationX = destination.x * 10;
  const destinationY = destination.y * 6.2;
  return {
    watercourse, source, destination, sourceX, sourceY, riverX, riverY, destinationX, destinationY,
    riverPath: `M${sourceX + 6} ${sourceY + 34} C${sourceX + 90} ${sourceY + 58} ${riverX - 95} ${riverY - 18} ${riverX} ${riverY} S${destinationX - 82} ${destinationY - 18} ${destinationX - 24} ${destinationY}`
  };
}

export function planLandscapeFlow(
  scene: SceneState,
  ids: { watercourseId: string; sourceId: string; destinationId: string },
  movableIds: ReadonlySet<string>
): { targetId: string; x: number; y: number }[] | null {
  if (new Set(Object.values(ids)).size !== 3) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [
    [position(ids.sourceId, 24, 27), position(ids.watercourseId, 52, 48), position(ids.destinationId, 80, 62)],
    [position(ids.sourceId, 20, 29), position(ids.watercourseId, 49, 50), position(ids.destinationId, 78, 64)],
    [position(ids.sourceId, 28, 25), position(ids.watercourseId, 55, 46), position(ids.destinationId, 82, 60)]
  ];
  const relations: SceneRelation[] = [
    { id: "planned-landscape-from", kind: "flowsFrom", sourceIds: [ids.watercourseId], targetIds: [ids.sourceId] },
    { id: "planned-landscape-to", kind: "flowsTo", sourceIds: [ids.watercourseId], targetIds: [ids.destinationId] }
  ];
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "landscape-flow",
    validate: (projected) => Boolean(landscapeFlowGeometry(relations, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
