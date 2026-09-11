import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const WATER_CYCLE_LOOP_VERSION = "1.0.0";

const cyclePattern = /^(rain|rainfall) (?:falls|comes down),? (?:and )?(?:soaks|seeps|sinks) into (?:the )?(soil|ground),? and some of it (?:later )?(?:comes|rises|travels) back up as (evaporation|water vapou?r)$/;

export interface WaterCycleLoopMatch {
  cloudText: string;
  rainText: string;
  soilText: string;
  waterText: string;
  evaporationText: string;
}

/** Binds state/location roles for a complete precipitation-infiltration-return cycle. */
export function matchWaterCycleLoop(text: string): WaterCycleLoopMatch | null {
  const match = text.match(cyclePattern);
  if (!match) return null;
  return {
    cloudText: "cloud", rainText: match[1] === "rainfall" ? "rain" : match[1],
    soilText: match[2], waterText: "water", evaporationText: "evaporation"
  };
}

export function isWaterCycleRelation(relation: SceneRelation): boolean {
  return relation.kind === "fallsTo" || relation.kind === "infiltrates" || relation.kind === "evaporatesTo";
}

export function waterCycleGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const falls = relations.filter(({ kind }) => kind === "fallsTo");
  const infiltrates = relations.filter(({ kind }) => kind === "infiltrates");
  const evaporates = relations.filter(({ kind }) => kind === "evaporatesTo");
  if (falls.length !== 1 || infiltrates.length !== 1 || evaporates.length !== 1
    || falls[0].targetIds[0] !== infiltrates[0].targetIds[0]) return null;
  const rain = entities.find(({ id }) => id === falls[0].sourceIds[0]);
  const soil = entities.find(({ id }) => id === falls[0].targetIds[0]);
  const water = entities.find(({ id }) => id === infiltrates[0].sourceIds[0]);
  const evaporation = entities.find(({ id }) => id === evaporates[0].sourceIds[0]);
  const cloud = entities.find(({ id }) => id === evaporates[0].targetIds[0]);
  if (!rain || !soil || !water || !evaporation || !cloud || rain.visualRole !== "cycle-rain"
    || soil.visualRole !== "cycle-soil" || water.visualRole !== "cycle-water"
    || evaporation.visualRole !== "cycle-evaporation" || cloud.visualRole !== "cycle-cloud") return null;
  if (new Set([rain.id, soil.id, water.id, evaporation.id, cloud.id]).size !== 5
    || !(cloud.y + 12 <= rain.y && rain.y + 18 <= soil.y && evaporation.x + 20 <= cloud.x && soil.y + 10 <= water.y)) return null;
  return { cloud, rain, soil, water, evaporation };
}

export function planWaterCycleLoop(scene: SceneState, ids: { cloudId: string; rainId: string; soilId: string; waterId: string; evaporationId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 5) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [[
    position(ids.cloudId, 62, 16), position(ids.rainId, 62, 43), position(ids.soilId, 62, 70),
    position(ids.waterId, 76, 84), position(ids.evaporationId, 25, 58)
  ]];
  const relations: SceneRelation[] = [
    { id: "planned-rain", kind: "fallsTo", sourceIds: [ids.rainId], targetIds: [ids.soilId], predicate: "fallsTo" },
    { id: "planned-infiltration", kind: "infiltrates", sourceIds: [ids.waterId], targetIds: [ids.soilId], predicate: "infiltrates" },
    { id: "planned-evaporation", kind: "evaporatesTo", sourceIds: [ids.evaporationId], targetIds: [ids.cloudId], predicate: "evaporatesTo" }
  ];
  const selected = selectLayoutCandidate(scene, candidates, { family: "water-cycle-loop", validate: (projected) => Boolean(waterCycleGeometry(relations, projected)) })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
