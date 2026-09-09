import type { SceneEntity, SceneRelation, SceneState } from "./schema";
import { selectLayoutCandidate } from "./layoutPlanner";

export const FORCE_DIAGRAM_VERSION = "1.0.0";

const appliedVerbs = ["push", "pushes", "pushing", "pull", "pulls", "pulling"] as const;
const resistanceTerms = ["friction", "drag", "resistance"] as const;
const slowingVerbs = ["slows", "decelerates", "reduces the speed of"] as const;

export interface ForceDiagramMatch {
  bodyText: string;
  surfaceText: string;
  appliedForceText: string;
  opposingForceText: string;
  appliedDirection: "left" | "right";
}

const alternatives = (items: readonly string[]) => [...items].sort((a, b) => b.length - a.length).join("|");
const forcePattern = new RegExp(
  `^(?:if )?(?:you|someone|a person) (${alternatives(appliedVerbs)}) (.+?) (?:on|across|along) (.+?),? (${alternatives(resistanceTerms)}) (${alternatives(slowingVerbs)}) (?:it|the object|the body)(?: down)?$`
);

/** Open noun slots around reusable mechanical roles; no lesson sentence is stored. */
export function matchForceDiagram(text: string): ForceDiagramMatch | null {
  const match = text.match(forcePattern);
  if (!match) return null;
  const appliedForceText = /pull/.test(match[1]) ? "pull" : "push";
  return {
    bodyText: match[2].replace(/^(?:a|an|the) /, ""),
    surfaceText: match[3].replace(/^(?:a|an|the) /, ""),
    appliedForceText,
    opposingForceText: match[4],
    appliedDirection: appliedForceText === "pull" ? "left" : "right"
  };
}

export const isForceRelation = (relation: SceneRelation): boolean =>
  ["appliedTo", "opposes", "contacts"].includes(relation.kind);

export interface ForceDiagramGeometry {
  body: SceneEntity;
  surface: SceneEntity;
  appliedForce: SceneEntity;
  opposingForce: SceneEntity;
  direction: 1 | -1;
  bodyX: number;
  bodyY: number;
  surfaceY: number;
  contactY: number;
  appliedStartX: number;
  appliedEndX: number;
  opposingStartX: number;
  opposingEndX: number;
}

export function forceDiagramGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]): ForceDiagramGeometry | null {
  const applied = relations.find(({ kind }) => kind === "appliedTo");
  const opposed = relations.find(({ kind, targetIds }) => kind === "opposes" && targetIds[0] === applied?.sourceIds[0]);
  const contact = relations.find(({ kind }) => kind === "contacts");
  if (!applied || !opposed || !contact) return null;
  const byId = new Map(entities.map((entity) => [entity.id, entity] as const));
  const appliedForce = byId.get(applied.sourceIds[0]);
  const body = byId.get(applied.targetIds[0]);
  const opposingForce = byId.get(opposed.sourceIds[0]);
  const surface = byId.get(contact.targetIds[0]);
  if (!appliedForce || !body || !opposingForce || !surface
    || opposed.targetIds[0] !== appliedForce.id || contact.sourceIds[0] !== body.id
    || appliedForce.visualRole !== "force" || opposingForce.visualRole !== "force"
    || (body.visualRole ?? "object") !== "object" || surface.visualRole !== "surface") return null;
  const direction: 1 | -1 = appliedForce.direction === "left" ? -1 : 1;
  const bodyX = body.x * 10;
  const bodyY = body.y * 6.2;
  const surfaceY = surface.y * 6.2;
  const appliedLength = 165;
  const opposingLength = 104;
  if (surfaceY - bodyY < 120 || surfaceY - bodyY > 240) return null;
  return {
    body, surface, appliedForce, opposingForce, direction, bodyX, bodyY, surfaceY,
    contactY: bodyY + 61,
    appliedStartX: bodyX - direction * (70 + appliedLength),
    appliedEndX: bodyX - direction * 70,
    opposingStartX: bodyX + direction * (70 + opposingLength),
    opposingEndX: bodyX + direction * 70
  };
}

export function planForceDiagram(
  scene: SceneState,
  ids: { bodyId: string; surfaceId: string; appliedForceId: string; opposingForceId: string },
  movableIds: ReadonlySet<string>,
  appliedDirection: "left" | "right"
): { targetId: string; x: number; y: number; direction?: SceneEntity["direction"] }[] | null {
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id)) || new Set(Object.values(ids)).size !== 4) return null;
  const arrangements = [
    { bodyX: 52, forceY: 40, surfaceY: 72, appliedX: 18, opposingX: 83 },
    { bodyX: 48, forceY: 40, surfaceY: 72, appliedX: 16, opposingX: 80 }
  ];
  const candidate = (id: string, x: number, y: number, direction?: "left" | "right") => ({ ...byId.get(id)!, x, y, ...(direction ? { direction } : {}) });
  const candidates = arrangements.map((a) => {
    const appliedX = appliedDirection === "right" ? a.appliedX : a.opposingX;
    const opposingX = appliedDirection === "right" ? a.opposingX : a.appliedX;
    return [
    candidate(ids.bodyId, a.bodyX, a.forceY),
    candidate(ids.surfaceId, a.bodyX, a.surfaceY),
    candidate(ids.appliedForceId, appliedX, a.forceY, appliedDirection),
    candidate(ids.opposingForceId, opposingX, a.forceY, appliedDirection === "right" ? "left" : "right")
  ];
  });
  const relations: SceneRelation[] = [
    { id: "planned-applied", kind: "appliedTo", sourceIds: [ids.appliedForceId], targetIds: [ids.bodyId] },
    { id: "planned-opposes", kind: "opposes", sourceIds: [ids.opposingForceId], targetIds: [ids.appliedForceId] },
    { id: "planned-contact", kind: "contacts", sourceIds: [ids.bodyId], targetIds: [ids.surfaceId] }
  ];
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "force-diagram",
    validate: (projected) => Boolean(forceDiagramGeometry(relations, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y, direction }) => ({ targetId: id, x, y, direction })) ?? null;
}
