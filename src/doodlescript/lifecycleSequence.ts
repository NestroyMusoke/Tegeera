import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const LIFECYCLE_SEQUENCE_VERSION = "1.1.0";

interface InferredLifecycle {
  starts: readonly string[];
  intermediate: string;
  finishes: readonly string[];
}

// Small, inspectable domain knowledge for language that omits its middle stage.
// Explicit three-stage descriptions remain open to any readable nouns.
export const inferredLifecycles: readonly InferredLifecycle[] = [
  { starts: ["caterpillar", "larva"], intermediate: "cocoon", finishes: ["butterfly", "moth"] }
];

const stripArticle = (text: string) => text.trim().replace(/^(?:a|an|the) /, "");
const readableStage = (text: string) => Boolean(text && text.length <= 40 && text.split(/\s+/).length <= 5
  && /^[a-z0-9][a-z0-9 '-]*$/.test(text) && !/^(?:it|that|something|thing)$/.test(text));
const implicitEnclosure = /^when (?:a|an|the) (.+?) is ready, it (?:wraps itself up|forms (?:a|an) protective case) and (?:comes|emerges) out later as (?:a|an|the) (.+)$/;
const transitionVerb = "(?:becomes|(?:changes|turns|develops) into)";
const explicitImplicitSubject = new RegExp(`^(.+?) ${transitionVerb} (.+?),? then ${transitionVerb} (.+)$`);
const explicitRepeatedSubject = /^(.+?) becomes (.+?),? and (?:then |later )?(?:that |the )?(.+?) becomes (.+)$/;

export interface LifecycleSequenceMatch {
  startText: string;
  intermediateText: string;
  finalText: string;
}

/** Resolves either three explicit open stages or a catalogued omitted middle stage. */
export function matchLifecycleSequence(text: string): LifecycleSequenceMatch | null {
  const implicit = text.match(implicitEnclosure);
  if (implicit) {
    const startText = stripArticle(implicit[1]);
    const finalText = stripArticle(implicit[2]);
    const lifecycle = inferredLifecycles.find(({ starts, finishes }) => starts.includes(startText) && finishes.includes(finalText));
    if (!lifecycle) return null;
    return { startText, intermediateText: lifecycle.intermediate, finalText };
  }
  const open = text.match(explicitImplicitSubject);
  if (open) {
    const stages = open.slice(1, 4).map(stripArticle);
    if (stages.every(readableStage) && new Set(stages).size === 3) {
      return { startText: stages[0], intermediateText: stages[1], finalText: stages[2] };
    }
  }
  const repeated = text.match(explicitRepeatedSubject);
  if (repeated) {
    const startText = stripArticle(repeated[1]);
    const intermediateText = stripArticle(repeated[2]);
    const repeatedIntermediate = stripArticle(repeated[3]);
    const finalText = stripArticle(repeated[4]);
    if (intermediateText === repeatedIntermediate
      && [startText, intermediateText, finalText].every(readableStage)
      && new Set([startText, intermediateText, finalText]).size === 3) {
      return { startText, intermediateText, finalText };
    }
  }
  return null;
}

export function isLifecycleRelation(relation: SceneRelation): boolean {
  return relation.kind === "transformsTo";
}

export function lifecycleSequenceGeometry(relations: readonly SceneRelation[], entities: readonly SceneEntity[]) {
  const transforms = relations.filter(isLifecycleRelation);
  if (transforms.length !== 2) return null;
  const first = transforms.find((relation) => transforms.some((other) => relation.targetIds[0] === other.sourceIds[0]));
  const second = first && transforms.find((relation) => relation !== first && relation.sourceIds[0] === first.targetIds[0]);
  if (!first || !second) return null;
  const start = entities.find(({ id }) => id === first.sourceIds[0]);
  const intermediate = entities.find(({ id }) => id === first.targetIds[0]);
  const final = entities.find(({ id }) => id === second.targetIds[0]);
  if (!start || !intermediate || !final || start.visualRole !== "lifecycle-start"
    || intermediate.visualRole !== "lifecycle-intermediate" || final.visualRole !== "lifecycle-final") return null;
  if (new Set([start.id, intermediate.id, final.id]).size !== 3
    || !(start.x + 22 <= intermediate.x && intermediate.x + 22 <= final.x)
    || Math.max(start.y, intermediate.y, final.y) - Math.min(start.y, intermediate.y, final.y) > 10) return null;
  return { start, intermediate, final };
}

export function planLifecycleSequence(scene: SceneState, ids: { startId: string; intermediateId: string; finalId: string }, movableIds: ReadonlySet<string>) {
  if (new Set(Object.values(ids)).size !== 3) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (Object.values(ids).some((id) => !byId.has(id))) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [
    [position(ids.startId, 18, 50), position(ids.intermediateId, 50, 48), position(ids.finalId, 82, 50)],
    [position(ids.startId, 17, 46), position(ids.intermediateId, 50, 50), position(ids.finalId, 83, 46)]
  ];
  const relations: SceneRelation[] = [
    { id: "planned-stage-one", kind: "transformsTo", sourceIds: [ids.startId], targetIds: [ids.intermediateId], predicate: "transformsTo" },
    { id: "planned-stage-two", kind: "transformsTo", sourceIds: [ids.intermediateId], targetIds: [ids.finalId], predicate: "transformsTo" }
  ];
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "lifecycle-sequence",
    connectorEdges: [{ sourceId: ids.startId, targetId: ids.intermediateId }, { sourceId: ids.intermediateId, targetId: ids.finalId }],
    validate: (projected) => Boolean(lifecycleSequenceGeometry(relations, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
