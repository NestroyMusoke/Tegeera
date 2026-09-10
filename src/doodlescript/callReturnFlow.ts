import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const CALL_RETURN_FLOW_VERSION = "1.0.0";

const stripArticle = (text: string) => text.trim().replace(/^(?:a|an|the) /, "");
const comparable = (text: string) => stripArticle(text).replace(/s$/, "");
const explanatoryPattern = /^when (?:you|we) call (?:a|an|the) (.+?), (?:a|an|the) (.+?) (?:jumps|moves) to (?:that|the) (.+?), (?:runs|executes) it, then (?:comes|returns) back to where it (?:left off|stopped)$/;
const directPattern = /^(?:a|an|the) (.+?) calls (?:a|an|the) (.+?), (?:control|execution) (?:jumps|moves) to (?:that|the) (.+?), (?:runs|executes) it, then returns to (?:the )?(?:same )?(?:call site|return point)$/;

export interface CallReturnFlowMatch {
  callerText: string;
  functionText: string;
  callSiteText: string;
}

/** Recognizes a complete control transfer and return while keeping domain nouns open. */
export function matchCallReturnFlow(text: string): CallReturnFlowMatch | null {
  const explanatory = text.match(explanatoryPattern);
  const direct = text.match(directPattern);
  const match = explanatory ?? direct;
  if (!match) return null;
  const functionText = stripArticle(match[1 + (direct ? 1 : 0)]);
  const callerText = stripArticle(match[2 - (direct ? 1 : 0)]);
  const repeatedFunction = stripArticle(match[3]);
  if (!callerText || !functionText || comparable(functionText) !== comparable(repeatedFunction)) return null;
  if (/^(?:it|something|thing)$/.test(callerText) || new Set([callerText, functionText].map(comparable)).size !== 2) return null;
  return { callerText, functionText, callSiteText: "call site" };
}

export function isCallReturnRelation(relation: SceneRelation): boolean {
  return relation.kind === "calls" || relation.kind === "returnsControlTo";
}

export interface CallReturnGeometry {
  caller: SceneEntity;
  fn: SceneEntity;
  callSite: SceneEntity;
  callerX: number;
  mainY: number;
  callX: number;
  functionY: number;
}

export function callReturnGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]): CallReturnGeometry | null {
  const calls = relations.filter(({ kind }) => kind === "calls");
  const returns = relations.filter(({ kind }) => kind === "returnsControlTo");
  if (calls.length !== 1 || returns.length !== 1 || calls[0].targetIds[0] !== returns[0].sourceIds[0]) return null;
  const caller = entities.find(({ id }) => id === calls[0].sourceIds[0]);
  const fn = entities.find(({ id }) => id === calls[0].targetIds[0]);
  const callSite = entities.find(({ id }) => id === returns[0].targetIds[0]);
  if (!caller || !fn || !callSite || caller.visualRole !== "control-caller"
    || fn.visualRole !== "control-function" || callSite.visualRole !== "control-call-site") return null;
  if (new Set([caller.id, fn.id, callSite.id]).size !== 3
    || !(caller.x + 20 <= callSite.x && callSite.y + 25 <= fn.y)) return null;
  return { caller, fn, callSite, callerX: caller.x * 10, mainY: callSite.y * 6.2, callX: callSite.x * 10, functionY: fn.y * 6.2 };
}

export function planCallReturnFlow(scene: SceneState, ids: { callerId: string; functionId: string; callSiteId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 3) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [
    [position(ids.callerId, 24, 28), position(ids.callSiteId, 58, 28), position(ids.functionId, 58, 68)],
    [position(ids.callerId, 22, 26), position(ids.callSiteId, 62, 26), position(ids.functionId, 62, 67)]
  ];
  const relations: SceneRelation[] = [
    { id: "planned-call", kind: "calls", sourceIds: [ids.callerId], targetIds: [ids.functionId], predicate: "calls" },
    { id: "planned-return", kind: "returnsControlTo", sourceIds: [ids.functionId], targetIds: [ids.callSiteId], predicate: "returnsTo" }
  ];
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "call-return-flow",
    validate: (projected) => Boolean(callReturnGeometry(relations, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
