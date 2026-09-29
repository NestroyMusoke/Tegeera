import { entityVisualGeometry } from "./entityGeometry";
import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";
import { preferredAttachmentZone, resolveVisualSymbol, type VisualCapability } from "./symbolOntology";
import { visualActionRegistry } from "./visualActionRegistry";

export const PART_WHOLE_FLOW_VERSION = "1.0.0";

export interface PartWholeChannel {
  inputText: string;
  partText: string;
  flowPredicate: "flowsInto" | "illuminates";
}

export interface PartWholeFlowMatch {
  wholeText: string;
  channels: PartWholeChannel[];
}

const inputVerbPattern = visualActionRegistry.filter(({ supportsPartRouting }) => supportsPartRouting)
  .flatMap(({ aliases }) => aliases).sort((a, b) => b.length - a.length).join("|");
const inputStatementPattern = new RegExp(`^(.+?) (?:${inputVerbPattern}) (.+)$`);
const routedPredicateByCapability: Partial<Record<VisualCapability, PartWholeChannel["flowPredicate"]>> = {
  radiates: "illuminates",
  flows: "flowsInto"
};

/** Language structure only: open concept slots around reusable intake/path roles. */
export function matchPartWholeFlow(text: string): PartWholeFlowMatch | null {
  const statement = text.match(inputStatementPattern);
  if (!statement) return null;
  const rawChannels = statement[2].split(/\s+and\s+/).map((channel) => channel.trim()).filter(Boolean);
  if (!rawChannels.length || rawChannels.length > 3) return null;
  const channels = rawChannels.map((channel): PartWholeChannel | null => {
    const routed = channel.match(/^(.+?) (?:through|via) (?:its|their|the) (.+)$/);
    if (!routed) return null;
    const symbol = resolveVisualSymbol(routed[1]);
    const flowPredicate = symbol.capabilities.map((capability) => routedPredicateByCapability[capability])
      .find((predicate): predicate is PartWholeChannel["flowPredicate"] => Boolean(predicate)) ?? "flowsInto";
    return { inputText: routed[1], partText: routed[2], flowPredicate };
  });
  return channels.every((channel): channel is PartWholeChannel => Boolean(channel))
    ? { wholeText: statement[1], channels }
    : null;
}

export const isPartWholeFlowRelation = (relation: SceneRelation): boolean =>
  ["partOf", "flowsInto", "illuminates"].includes(relation.kind);

/** A visible, identity-preserving copy of a known part docks on its whole.
 * The original part remains a callout so incoming flows still have a distinct target.
 * Unknown glyphs never receive an invented silhouette. */
export function partWholeAttachmentGeometry(
  relation: SceneRelation, relations: readonly SceneRelation[], entities: readonly SceneEntity[]
): { x: number; y: number; scale: number } | null {
  if (relation.kind !== "partOf" || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const part = entities.find(({ id }) => id === relation.sourceIds[0]);
  const whole = entities.find(({ id }) => id === relation.targetIds[0]);
  if (!part || !whole || part.id === whole.id || part.visualRole || whole.visualRole) return null;
  const known = (entity: SceneEntity) => Boolean(entity.glyph) || entity.kind !== "generic"
    || !resolveVisualSymbol(entity.label ?? entity.kind).fallback;
  if (!known(part) || !known(whole)) return null;
  const siblings = relations.filter((other) => other.kind === "partOf" && other.targetIds[0] === whole.id
    && entities.some(({ id }) => id === other.sourceIds[0])).sort((a, b) => {
      const first = entities.find(({ id }) => id === a.sourceIds[0])!;
      const second = entities.find(({ id }) => id === b.sourceIds[0])!;
      const priority = (entity: SceneEntity) => ({ top: -1, left: 0, right: 0, bottom: 1 })[preferredAttachmentZone(entity.label ?? entity.kind) ?? "left"];
      return priority(first) - priority(second) || first.y - second.y || first.x - second.x || a.id.localeCompare(b.id);
    });
  const index = siblings.findIndex(({ id }) => id === relation.id);
  if (index < 0) return null;
  const x = whole.x * 10, y = whole.y * 6.2;
  const scale = Math.min(0.72, part.scale * 0.72, whole.scale * 0.72);
  if (siblings.length === 1) {
    const preferred = preferredAttachmentZone(part.label ?? part.kind);
    if (preferred) return { x: x + (preferred === "left" ? -52 : preferred === "right" ? 52 : 0) * whole.scale,
      y: y + (preferred === "top" ? -55 : preferred === "bottom" ? 55 : 0) * whole.scale, scale };
    const dx = part.x * 10 - x, dy = part.y * 6.2 - y;
    return Math.abs(dx) >= Math.abs(dy)
      ? { x: x + Math.sign(dx || -1) * 52 * whole.scale, y, scale }
      : { x, y: y + Math.sign(dy || 1) * 55 * whole.scale, scale };
  }
  // Vertical docking keeps the crown/body/base readable for two or three parts.
  // More complex assemblies need reviewed artwork rather than overlapping copies.
  if (siblings.length > 3) return null;
  return { x, y: y + (index - (siblings.length - 1) / 2) * (siblings.length === 2 ? 110 : 56) * whole.scale,
    scale: siblings.length === 3 ? Math.min(scale, 0.5) : scale };
}

export function partWholeFlowGeometry(relation: SceneRelation, entities: readonly SceneEntity[]) {
  if (!isPartWholeFlowRelation(relation) || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const source = entities.find(({ id }) => id === relation.sourceIds[0]);
  const target = entities.find(({ id }) => id === relation.targetIds[0]);
  if (!source || !target || source.id === target.id) return null;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx * 10, dy * 6.2);
  if (length < 105) return null;
  const unitX = dx * 10 / length;
  const unitY = dy * 6.2 / length;
  const sourceRadius = entityVisualGeometry[source.kind].contact.halfWidth * source.scale + 9;
  const targetRadius = entityVisualGeometry[target.kind].contact.halfWidth * target.scale + 9;
  const startX = source.x * 10 + unitX * sourceRadius;
  const startY = source.y * 6.2 + unitY * sourceRadius;
  const endX = target.x * 10 - unitX * targetRadius;
  const endY = target.y * 6.2 - unitY * targetRadius;
  return { source, target, startX, startY, endX, endY, unitX, unitY };
}

export function planPartWholeFlow(
  scene: SceneState,
  wholeId: string,
  channels: readonly { inputId: string; partId: string; flowPredicate: PartWholeChannel["flowPredicate"] }[],
  movableIds: ReadonlySet<string>
): { targetId: string; x: number; y: number }[] | null {
  if (!channels.length || channels.length > 3) return null;
  const ids = [wholeId, ...channels.flatMap(({ inputId, partId }) => [inputId, partId])];
  if (new Set(ids).size !== ids.length) return null;
  const byId = new Map(scene.entities.map((entity) => [entity.id, entity] as const));
  if (ids.some((id) => !byId.has(id))) return null;
  const rows = channels.length === 1 ? [44] : channels.length === 2 ? [27, 61] : [20, 44, 68];
  const arrangements = [{ inputX: 18, partX: 48, wholeX: 79 }];
  const position = (id: string, x: number, y: number) => movableIds.has(id) ? { ...byId.get(id)!, x, y } : byId.get(id)!;
  const candidates = arrangements.map(({ inputX, partX, wholeX }) => [
    position(wholeId, wholeX, 44),
    ...channels.flatMap((channel, index) => [
      position(channel.inputId, inputX, rows[index]),
      position(channel.partId, partX, rows[index])
    ])
  ]);
  const relations: SceneRelation[] = channels.flatMap((channel, index) => [
    { id: `planned-part-${index}`, kind: "partOf", sourceIds: [channel.partId], targetIds: [wholeId] },
    { id: `planned-flow-${index}`, kind: channel.flowPredicate, sourceIds: [channel.inputId], targetIds: [channel.partId] }
  ]);
  const selected = selectLayoutCandidate(scene, candidates, {
    family: "part-whole-flow",
    connectorEdges: relations.map((relation) => ({ sourceId: relation.sourceIds[0], targetId: relation.targetIds[0] })),
    validate: (projected) => relations.every((relation) => partWholeFlowGeometry(relation, projected))
  })?.entities;
  if (!selected) return null;
  return selected.filter(({ id }) => movableIds.has(id)).map(({ id, x, y }) => ({ targetId: id, x, y }));
}
