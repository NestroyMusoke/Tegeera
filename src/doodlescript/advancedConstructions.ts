import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

const stripArticle = (text: string) => text.trim().replace(/^(?:a|an|the) /, "");

export interface LifoStackMatch { stackText: string; itemsText: string; topText: string }
export function matchLifoStack(text: string): LifoStackMatch | null {
  const mentionsStack = /\bstack\b/.test(text);
  const adds = /\b(?:add|adds|adding|push|pushes|pushed|pushing)\b/.test(text);
  const removes = /\b(?:remove|removes|removing|pop|pops|popped|popping)\b/.test(text);
  const topAccess = /\btop\b/.test(text);
  const bounded = /\b(?:only|just|always)\b/.test(text) || /\b(?:at|from|onto) (?:only )?the top\b/.test(text);
  if (!mentionsStack || !adds || !removes || !topAccess || !bounded) return null;
  return { stackText: "stack", itemsText: "items", topText: "top" };
}

export const isLifoRelation = (relation: SceneRelation) => relation.kind === "accessedAt";
export function lifoStackGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const relation = relations.filter(isLifoRelation);
  if (relation.length !== 1) return null;
  const items = entities.find(({ id }) => id === relation[0].sourceIds[0]);
  const top = entities.find(({ id }) => id === relation[0].targetIds[0]);
  const stack = entities.find(({ visualRole }) => visualRole === "stack-container");
  if (!stack || !items || !top || items.visualRole !== "stack-items" || top.visualRole !== "stack-top") return null;
  if (new Set([stack.id, items.id, top.id]).size !== 3 || Math.abs(stack.x - items.x) > 3 || Math.abs(stack.x - top.x) > 3
    || !(top.y + 12 < items.y && items.y < stack.y + 5)) return null;
  return { stack, items, top, centerX: stack.x * 10, baseY: stack.y * 6.2 + 95, topY: top.y * 6.2 };
}

export interface TriangleAngleSumMatch { triangleText: string; anglesText: string; sumText: string }
export function matchTriangleAngleSum(text: string): TriangleAngleSumMatch | null {
  const triangle = /\btriangle(?:'s)?\b/.test(text);
  const angles = /\bthree angles\b/.test(text);
  const total = text.match(/\b(180 degrees\b|180°(?:\s|[.,;:!?]|$))/);
  const aggregation = /\b(?:add up to|sum to|sum up to|total)\b/.test(text);
  return triangle && angles && total && aggregation
    ? { triangleText: "triangle", anglesText: "three angles", sumText: "180 degrees" }
    : null;
}

export const isTriangleRelation = (relation: SceneRelation) => relation.kind === "trianglePartOf" || relation.kind === "sumsTo";
export function triangleAngleSumGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const edges = relations.filter(isTriangleRelation);
  if (edges.length !== 2) return null;
  const part = edges.find(({ kind }) => kind === "trianglePartOf");
  const sum = edges.find(({ kind }) => kind === "sumsTo");
  if (!part || !sum || part.sourceIds[0] !== sum.sourceIds[0]) return null;
  const angles = entities.find(({ id }) => id === part.sourceIds[0]);
  const triangle = entities.find(({ id }) => id === part.targetIds[0]);
  const total = entities.find(({ id }) => id === sum.targetIds[0]);
  if (!triangle || !angles || !total || triangle.visualRole !== "triangle-shape" || angles.visualRole !== "triangle-angles" || total.visualRole !== "triangle-sum") return null;
  if (new Set([triangle.id, angles.id, total.id]).size !== 3 || Math.abs(triangle.x - angles.x) > 4
    || Math.abs(triangle.x - total.x) > 4 || !(angles.y < triangle.y && triangle.y < total.y)) return null;
  return { triangle, angles, total, centerX: triangle.x * 10, centerY: triangle.y * 6.2 };
}

export interface ConvergentPlatesMatch { leftText: string; rightText: string; mountainText: string }
export function matchConvergentPlates(text: string): ConvergentPlatesMatch | null {
  const mountains = /\bmountains?\b/.test(text);
  const pair = /\btwo (?:large )?(?:tectonic )?(?:landmasses|plates)\b/.test(text);
  const convergence = /\b(?:converge|converges|push(?:es)? into each other|move(?:s)? (?:toward|towards|into) each other)\b/.test(text);
  const formation = /\b(?:form|forms|create|creates|produce|produces|raise|raises|rise|rises)\b/.test(text);
  if (!mountains || !pair || !convergence || !formation) return null;
  return { leftText: "left landmass", rightText: "right landmass", mountainText: "mountain" };
}

export const isConvergentRelation = (relation: SceneRelation) => relation.kind === "pushesToward";
export function convergentPlatesGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const edges = relations.filter(isConvergentRelation);
  if (edges.length !== 2 || edges[0].targetIds[0] !== edges[1].targetIds[0]) return null;
  const mountain = entities.find(({ id }) => id === edges[0].targetIds[0]);
  const sources = edges.map((edge) => entities.find(({ id }) => id === edge.sourceIds[0]));
  const left = sources.find((entity) => entity?.visualRole === "plate-left");
  const right = sources.find((entity) => entity?.visualRole === "plate-right");
  if (!mountain || !left || !right || mountain.visualRole !== "plate-mountain") return null;
  if (new Set([left.id, right.id, mountain.id]).size !== 3 || !(left.x + 18 < mountain.x && mountain.x + 18 < right.x)
    || Math.abs(left.y - right.y) > 5 || mountain.y > Math.min(left.y, right.y) - 12) return null;
  return { left, right, mountain, mountainX: mountain.x * 10, groundY: left.y * 6.2 + 55 };
}

export interface OrderedRoutineMatch { firstText: string; middleText: string; finalText: string }
const readableStep = (value: string) => value.length > 0 && value.length <= 36 && value.split(/\s+/).length <= 5 && /^[a-z][a-z '-]*$/.test(value);
export function matchOrderedRoutine(text: string): OrderedRoutineMatch | null {
  const patterns = [
    /^first (?:you )?(.+?), then (?:you )?(.+?), then (?:you )?(.+)$/,
    /^first (?:you )?(.+?), next (?:you )?(.+?), finally (?:you )?(.+)$/,
    /^begin by (.+?), then (.+?), (?:and )?finally (.+)$/
  ];
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (!match) return null;
  const steps = match.slice(1, 4).map(stripArticle);
  if (!steps.every(readableStep) || new Set(steps).size !== 3) return null;
  return { firstText: steps[0], middleText: steps[1], finalText: steps[2] };
}

export const isRoutineRelation = (relation: SceneRelation) => relation.kind === "routineBefore";
export function orderedRoutineGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const edges = relations.filter(isRoutineRelation);
  if (edges.length !== 2) return null;
  const firstEdge = edges.find((edge) => edges.some((next) => edge.targetIds[0] === next.sourceIds[0]));
  const secondEdge = firstEdge && edges.find((edge) => edge !== firstEdge && edge.sourceIds[0] === firstEdge.targetIds[0]);
  if (!firstEdge || !secondEdge) return null;
  const first = entities.find(({ id }) => id === firstEdge.sourceIds[0]);
  const middle = entities.find(({ id }) => id === firstEdge.targetIds[0]);
  const final = entities.find(({ id }) => id === secondEdge.targetIds[0]);
  if (!first || !middle || !final || first.visualRole !== "routine-first" || middle.visualRole !== "routine-middle" || final.visualRole !== "routine-final") return null;
  if (new Set([first.id, middle.id, final.id]).size !== 3 || !(first.x + 20 < middle.x && middle.x + 20 < final.x)
    || Math.max(first.y, middle.y, final.y) - Math.min(first.y, middle.y, final.y) > 8) return null;
  return { first, middle, final };
}

type PlannerSpec = { ids: string[]; roles: [number, number][]; family: "lifo-stack" | "triangle-angle-sum" | "convergent-plates" | "ordered-routine"; relations: SceneRelation[]; validate: (relations: readonly SceneRelation[], entities: readonly SceneEntity[]) => unknown };
function planConstruction(scene: SceneState, spec: PlannerSpec, movableIds: ReadonlySet<string>) {
  if (new Set(spec.ids).size !== spec.ids.length) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (spec.ids.some((id) => !byId.has(id))) return null;
  const candidate = spec.ids.map((id, index) => ({ ...byId.get(id)!, x: spec.roles[index][0], y: spec.roles[index][1] }));
  const selected = selectLayoutCandidate(scene, [candidate], { family: spec.family, validate: (entities) => Boolean(spec.validate(spec.relations, entities)) })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}

export const planLifoStack = (scene: SceneState, ids: { stackId: string; itemsId: string; topId: string }, movable: ReadonlySet<string>) => planConstruction(scene, {
  ids: [ids.stackId, ids.itemsId, ids.topId], roles: [[50, 75], [50, 48], [50, 20]], family: "lifo-stack",
  relations: [{ id: "planned-stack", kind: "accessedAt", sourceIds: [ids.itemsId], targetIds: [ids.topId], predicate: "accessedAt" }], validate: lifoStackGeometry
}, movable);

export const planTriangleAngleSum = (scene: SceneState, ids: { triangleId: string; anglesId: string; sumId: string }, movable: ReadonlySet<string>) => planConstruction(scene, {
  ids: [ids.triangleId, ids.anglesId, ids.sumId], roles: [[50, 47], [50, 20], [50, 78]], family: "triangle-angle-sum",
  relations: [{ id: "planned-part", kind: "trianglePartOf", sourceIds: [ids.anglesId], targetIds: [ids.triangleId], predicate: "partOf" }, { id: "planned-sum", kind: "sumsTo", sourceIds: [ids.anglesId], targetIds: [ids.sumId], predicate: "sumsTo" }], validate: triangleAngleSumGeometry
}, movable);

export const planConvergentPlates = (scene: SceneState, ids: { leftId: string; rightId: string; mountainId: string }, movable: ReadonlySet<string>) => planConstruction(scene, {
  ids: [ids.leftId, ids.rightId, ids.mountainId], roles: [[20, 61], [80, 61], [50, 35]], family: "convergent-plates",
  relations: [{ id: "planned-left", kind: "pushesToward", sourceIds: [ids.leftId], targetIds: [ids.mountainId], predicate: "pushesToward" }, { id: "planned-right", kind: "pushesToward", sourceIds: [ids.rightId], targetIds: [ids.mountainId], predicate: "pushesToward" }], validate: convergentPlatesGeometry
}, movable);

export const planOrderedRoutine = (scene: SceneState, ids: { firstId: string; middleId: string; finalId: string }, movable: ReadonlySet<string>) => planConstruction(scene, {
  ids: [ids.firstId, ids.middleId, ids.finalId], roles: [[18, 48], [50, 48], [82, 48]], family: "ordered-routine",
  relations: [{ id: "planned-first", kind: "routineBefore", sourceIds: [ids.firstId], targetIds: [ids.middleId], predicate: "before" }, { id: "planned-second", kind: "routineBefore", sourceIds: [ids.middleId], targetIds: [ids.finalId], predicate: "before" }], validate: orderedRoutineGeometry
}, movable);
