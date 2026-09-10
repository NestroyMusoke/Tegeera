import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const CHANGING_SPEED_MOTION_VERSION = "1.0.0";

const motionPattern = /^(.+?) (?:thrown|launched|tossed|shot) (?:straight )?up(?: (?:in|into) the air)? (?:(?:slows? down)|decelerates?),? (?:stops?|pauses?) (?:for )?(?:(?:a|an) )?(?:moment|instant|briefly)(?:,? then| and then) (?:falls?|drops?) back(?: down)? (?:faster and faster|increasingly fast|and speeds? up|speeding up)$/;
const stripArticle = (text: string) => text.trim().replace(/^(?:a|an|the) /, "");

export interface ChangingSpeedMotionMatch {
  objectText: string;
  apexText: string;
  forceText: string;
}

/** Recognizes a complete ascent/apex/descent profile; the moving noun remains an open slot. */
export function matchChangingSpeedMotion(text: string): ChangingSpeedMotionMatch | null {
  const match = text.match(motionPattern);
  if (!match) return null;
  const objectText = stripArticle(match[1]);
  if (!objectText || /\b(?:thing|something|it)\b/.test(objectText)) return null;
  return { objectText, apexText: "highest point", forceText: "gravity" };
}

export function isChangingSpeedRelation(relation: SceneRelation): boolean {
  return relation.kind === "risesTo" || relation.kind === "fallsFrom" || relation.kind === "accelerates";
}

export interface ChangingSpeedGeometry {
  object: SceneEntity;
  apex: SceneEntity;
  force: SceneEntity;
  centerX: number;
  bottomY: number;
  apexY: number;
  path: string;
}

export function changingSpeedGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]): ChangingSpeedGeometry | null {
  const rises = relations.filter((relation) => relation.kind === "risesTo");
  const falls = relations.filter((relation) => relation.kind === "fallsFrom");
  const accelerates = relations.filter((relation) => relation.kind === "accelerates");
  if (rises.length !== 1 || falls.length !== 1 || accelerates.length !== 1) return null;
  if (rises[0].sourceIds[0] !== falls[0].sourceIds[0]
    || rises[0].targetIds[0] !== falls[0].targetIds[0]
    || accelerates[0].targetIds[0] !== rises[0].sourceIds[0]) return null;
  const object = entities.find(({ id }) => id === rises[0].sourceIds[0]);
  const apex = entities.find(({ id }) => id === rises[0].targetIds[0]);
  const force = entities.find(({ id }) => id === accelerates[0].sourceIds[0]);
  if (!object || !apex || !force || object.visualRole !== "trajectory-object"
    || apex.visualRole !== "trajectory-apex" || force.visualRole !== "trajectory-force") return null;
  if (!(apex.y + 30 <= object.y && force.x + 20 <= object.x)) return null;
  const centerX = object.x * 10;
  const bottomY = object.y * 6.2;
  const apexY = apex.y * 6.2;
  return {
    object, apex, force, centerX, bottomY, apexY,
    path: `M${centerX - 90} ${bottomY} C${centerX - 100} ${bottomY - 145} ${centerX - 70} ${apexY + 45} ${centerX} ${apexY} C${centerX + 70} ${apexY + 45} ${centerX + 100} ${bottomY - 145} ${centerX + 90} ${bottomY}`
  };
}

export function planChangingSpeedMotion(
  scene: SceneState,
  ids: { objectId: string; apexId: string; forceId: string },
  movableIds: ReadonlySet<string>
): { targetId: string; x: number; y: number }[] | null {
  if (new Set(Object.values(ids)).size !== 3) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [
    [position(ids.objectId, 55, 76), position(ids.apexId, 55, 23), position(ids.forceId, 18, 49)],
    [position(ids.objectId, 52, 74), position(ids.apexId, 52, 21), position(ids.forceId, 16, 48)]
  ];
  const relations: SceneRelation[] = [
    { id: "planned-rise", kind: "risesTo", sourceIds: [ids.objectId], targetIds: [ids.apexId] },
    { id: "planned-fall", kind: "fallsFrom", sourceIds: [ids.objectId], targetIds: [ids.apexId] },
    { id: "planned-acceleration", kind: "accelerates", sourceIds: [ids.forceId], targetIds: [ids.objectId] }
  ];
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "changing-speed-motion",
    validate: (projected) => Boolean(changingSpeedGeometry(relations, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
