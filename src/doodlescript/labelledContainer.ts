import { selectLayoutCandidate } from "./layoutPlanner";
import { isSideBySideRelation, spatialOrder } from "./spatialOrder";
import { entityHalfWidth, overlaps, withinCanvas } from "./layout";
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
  if (!containerText || !contentText || containerText === contentText
    || /^(?:itself|himself|herself|themselves|it|that|something|thing)$/.test(contentText)) return null;
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

/** Shared by artwork rendering and external relation routing, in SVG units. */
export function containedArtworkPlacement(geometry: LabelledContainerGeometry) {
  return { x: geometry.centerX, y: geometry.centerY + 15, scale: 0.75 };
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
  movableIds: ReadonlySet<string>,
  accepts?: (projected: readonly SceneEntity[]) => boolean
): { targetId: string; x: number; y: number }[] | null {
  if (containerId === contentId) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (!byId.has(containerId) || !byId.has(contentId)) return null;
  const position = (id: string, x: number, y: number) => ({ ...byId.get(id)!, x, y });
  const context = scene.entities.filter((entity) => entity.id !== containerId && entity.id !== contentId && movableIds.has(entity.id));
  if (context.length > 3) return null;
  const relation: SceneRelation = { id: "planned-contains", kind: "contains", sourceIds: [containerId], targetIds: [contentId] };
  const visibleBounds = (entity: SceneEntity, geometry: LabelledContainerGeometry) => {
    if (entity.id === containerId) return { left: geometry.centerX - geometry.width / 2,
      right: geometry.centerX + geometry.width / 2, top: geometry.centerY - geometry.height / 2 - 22,
      bottom: geometry.centerY + geometry.height / 2, centerY: geometry.centerY };
    const artwork = entity.id === contentId ? containedArtworkPlacement(geometry) : null;
    const cx = artwork?.x ?? entity.x * 10, cy = artwork?.y ?? entity.y * 6.2;
    const scale = artwork?.scale ?? entity.scale;
    return { left: cx - entityHalfWidth(entity) * 10, right: cx + entityHalfWidth(entity) * 10,
      top: cy - 14 * scale * 6.2, bottom: cy + 14 * scale * 6.2, centerY: cy };
  };
  const validPlacement = (projected: readonly SceneEntity[]) => {
      const geometry = labelledContainerGeometry(relation, projected);
      if (!geometry) return false;
      const enclosure = visibleBounds(geometry.container, geometry);
      if (projected.some((entity) => {
        if (entity.id === containerId || entity.id === contentId) return false;
        const box = visibleBounds(entity, geometry);
        return box.left < enclosure.right && box.right > enclosure.left
          && box.top < enclosure.bottom && box.bottom > enclosure.top;
      })) return false;
      return (scene.relations ?? []).every((edge) => {
        const order = edge.kind === "relatesTo" && edge.predicate && spatialOrder(edge.predicate);
        const beside = edge.kind === "relatesTo" && edge.predicate && isSideBySideRelation(edge.predicate);
        if (!order && !beside) return true;
        const from = projected.find((entity) => entity.id === edge.sourceIds[0]);
        const to = projected.find((entity) => entity.id === edge.targetIds[0]);
        if (!from || !to) return true;
        const a = visibleBounds(from, geometry), b = visibleBounds(to, geometry);
        if (beside && Math.abs(a.centerY - b.centerY) > 1) return false;
        if (!order) return true;
        if (from.id === containerId || to.id === containerId) {
          return order.axis === "x" ? order.sign < 0 ? a.right <= b.left : a.left >= b.right
            : order.sign < 0 ? a.bottom <= b.top : a.top >= b.bottom;
        }
        return Math.sign(from[order.axis] - to[order.axis]) === order.sign;
      });
  };
  // Bound search and prune geometric/semantic failures before expanding them.
  const candidates = [52, 45, 59].flatMap((x) => [32, 42].flatMap((y) => {
    const pair = [position(containerId, x, y), position(contentId, x, y + 30)];
    const slots = [12, 88].flatMap((slotX) => [y + 72 / 6.2, 85, 16].map((slotY) => ({ x: slotX, y: slotY })));
    slots.push({ x, y: 16 }, { x, y: 85 });
    let partial = [pair];
    for (const entity of context) {
      partial = partial.flatMap((placed) => slots.flatMap((slot) => {
        const next = position(entity.id, slot.x, slot.y);
        const candidate = [...placed, next];
        return withinCanvas(next) && !placed.some((other) => overlaps(next, other))
          && validPlacement(candidate) ? [candidate] : [];
      }));
    }
    return partial;
  }));
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "labelled-container",
    validate: (projected) => validPlacement(projected) && (!accepts || accepts(projected))
  })?.entities;
  return selected?.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y })) ?? null;
}
