import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";

export const LABELLED_CONTAINER_VERSION = "1.0.0";

const shapeWords = ["box", "container", "cell", "jar", "bin"] as const;
const labelWords = ["labeled", "labelled", "named"] as const;
const containmentVerbs = ["holds", "contains", "stores", "keeps"] as const;
const alternatives = (values: readonly string[]) => [...values].sort((a, b) => b.length - a.length).join("|");
const labelledContainerPattern = new RegExp(
  `^(.+?) is (?:just )?(?:a|an|the) (?:${alternatives(labelWords)}) (${alternatives(shapeWords)}) (?:that )?(?:${alternatives(containmentVerbs)}) (.+)$`
);

export interface LabelledContainerMatch {
  containerText: string;
  contentText: string;
  shape: typeof shapeWords[number];
}

const stripArticle = (text: string) => text.trim().replace(/^(?:a|an|the) /, "");

/** Open semantic slots around a labelled containment construction. */
export function matchLabelledContainer(text: string): LabelledContainerMatch | null {
  const match = text.match(labelledContainerPattern);
  if (!match) return null;
  const shape = match[2] as typeof shapeWords[number];
  const containerText = stripArticle(match[1]);
  const contentText = stripArticle(match[3]);
  if (!containerText || !contentText || containerText === contentText) return null;
  return { containerText, contentText, shape };
}

export interface LabelledContainerGeometry {
  container: SceneEntity;
  content: SceneEntity;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export function labelledContainerGeometry(relation: SceneRelation, entities: readonly SceneEntity[]): LabelledContainerGeometry | null {
  if (relation.kind !== "contains" || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const container = entities.find(({ id }) => id === relation.sourceIds[0]);
  const content = entities.find(({ id }) => id === relation.targetIds[0]);
  if (!container || !content || container.visualRole !== "container" || content.visualRole !== "contained") return null;
  const dx = Math.abs(container.x - content.x);
  const dy = content.y - container.y;
  if (dx > 4 || dy < 24 || dy > 38) return null;
  return {
    container, content, centerX: container.x * 10, centerY: container.y * 6.2 + 72,
    width: Math.max(380, Math.min(470, 250 + Math.max(container.label?.length ?? 0, content.label?.length ?? 0) * 10)),
    height: 220
  };
}

export function planLabelledContainer(
  scene: SceneState,
  containerId: string,
  contentId: string,
  movableIds: ReadonlySet<string>
): { targetId: string; x: number; y: number }[] | null {
  if (containerId === contentId) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (!byId.has(containerId) || !byId.has(contentId)) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const candidates = [52, 45, 59].map((x) => [position(containerId, x, 32), position(contentId, x, 62)]);
  const relation: SceneRelation = { id: "planned-contains", kind: "contains", sourceIds: [containerId], targetIds: [contentId] };
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "labelled-container",
    validate: (projected) => Boolean(labelledContainerGeometry(relation, projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
