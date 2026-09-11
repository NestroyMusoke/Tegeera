import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const REFLECTION_RAY_VERSION = "1.0.0";

const source = "(?:light|a light ray|the light ray|a ray|the ray|a beam|the beam)";
const surface = "(?:something|an object|the object|a surface|the surface|a mirror|the mirror|a wall|the wall|glass)";
const patterns = [
  new RegExp(`^(${source}) travels? (?:in a straight line )?(?:toward|towards|until it hits) (${surface}) and (?:it )?(?:bounces|reflects) off(?: it)?$`),
  new RegExp(`^(${source}) (?:shines|moves) (?:toward|towards) (${surface}) and (?:then )?(?:bounces|reflects) off(?: it)?$`),
  new RegExp(`^(${source}) hits (${surface}) and (?:then )?(?:bounces|reflects) off(?: it)?$`)
];

export interface ReflectionRayMatch {
  incidentText: string;
  surfaceText: string;
  reflectedText: string;
}

const normalizeSource = (value: string) => /beam/.test(value) ? "light beam" : /ray/.test(value) ? "light ray" : "light";
const normalizeSurface = (value: string) => /mirror/.test(value) ? "mirror" : /wall/.test(value) ? "wall" : /glass/.test(value) ? "glass" : "surface";

/** Matches an open optical construction through controlled source/surface slots. */
export function matchReflectionRay(text: string): ReflectionRayMatch | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return {
      incidentText: normalizeSource(match[1]),
      surfaceText: normalizeSurface(match[2]),
      reflectedText: "reflected light"
    };
  }
  return null;
}

export function isReflectionRelation(relation: SceneRelation): boolean {
  return relation.kind === "travelsTo" || relation.kind === "reflectsFrom";
}

export interface Point { x: number; y: number }

/** Reflects an incoming vector about a unit normal: r = v - 2(v·n)n. */
export function reflectVector(incoming: Point, normal: Point): Point {
  const magnitude = Math.hypot(normal.x, normal.y);
  if (!magnitude) return { x: 0, y: 0 };
  const n = { x: normal.x / magnitude, y: normal.y / magnitude };
  const dot = incoming.x * n.x + incoming.y * n.y;
  return { x: incoming.x - 2 * dot * n.x, y: incoming.y - 2 * dot * n.y };
}

export function reflectionRayGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const optics = relations.filter(isReflectionRelation);
  if (optics.length !== 2) return null;
  const incidentRelation = optics.find(({ kind }) => kind === "travelsTo");
  const reflectedRelation = optics.find(({ kind }) => kind === "reflectsFrom");
  if (!incidentRelation || !reflectedRelation || incidentRelation.targetIds[0] !== reflectedRelation.targetIds[0]) return null;
  const incident = entities.find(({ id }) => id === incidentRelation.sourceIds[0]);
  const surface = entities.find(({ id }) => id === incidentRelation.targetIds[0]);
  const reflected = entities.find(({ id }) => id === reflectedRelation.sourceIds[0]);
  if (!incident || !surface || !reflected || incident.visualRole !== "optics-incident"
    || surface.visualRole !== "optics-surface" || reflected.visualRole !== "optics-reflected") return null;
  if (new Set([incident.id, surface.id, reflected.id]).size !== 3
    || !(incident.x + 18 <= surface.x && surface.x + 18 <= reflected.x)
    || surface.y < Math.max(incident.y, reflected.y) + 18
    || Math.abs(incident.y - reflected.y) > 10) return null;
  const impact = { x: surface.x * 10, y: surface.y * 6.2 - 42 };
  const incidentStart = { x: incident.x * 10, y: incident.y * 6.2 };
  const incoming = { x: impact.x - incidentStart.x, y: impact.y - incidentStart.y };
  const outgoing = reflectVector(incoming, { x: 0, y: -1 });
  return {
    incident, surface, reflected, impact, incidentStart,
    reflectedEnd: { x: impact.x + outgoing.x, y: impact.y + outgoing.y },
    normalEnd: { x: impact.x, y: impact.y - 150 }
  };
}

export function planReflectionRay(scene: SceneState, ids: { incidentId: string; surfaceId: string; reflectedId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 3) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [
    [position(ids.incidentId, 20, 31), position(ids.surfaceId, 50, 66), position(ids.reflectedId, 80, 31)],
    [position(ids.incidentId, 18, 28), position(ids.surfaceId, 50, 64), position(ids.reflectedId, 82, 28)]
  ];
  const relations: SceneRelation[] = [
    { id: "planned-incident", kind: "travelsTo", sourceIds: [ids.incidentId], targetIds: [ids.surfaceId], predicate: "travelsTo" },
    { id: "planned-reflection", kind: "reflectsFrom", sourceIds: [ids.reflectedId], targetIds: [ids.surfaceId], predicate: "reflectsFrom" }
  ];
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "reflection-ray",
    connectorEdges: [{ sourceId: ids.incidentId, targetId: ids.surfaceId }, { sourceId: ids.surfaceId, targetId: ids.reflectedId }],
    validate: (projected) => Boolean(reflectionRayGeometry(relations, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
