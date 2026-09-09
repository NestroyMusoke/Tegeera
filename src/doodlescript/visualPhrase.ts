import { entityVisualGeometry } from "./entityGeometry";
import { entityHalfWidth, layoutPositions } from "./layout";
import { selectLayoutCandidate } from "./layoutPlanner";
import type { SceneEntity, SceneRelation, SceneState } from "./schema";
import { visualActionForPredicate } from "./visualActionRegistry";

export interface VisualPhraseMove { targetId: string; x: number; y: number }

export const isVisualAction = (relation: SceneRelation): boolean => relation.kind === "visualAction";
const phrasePositions = [
  ...layoutPositions,
  ...[12, 30, 48, 66, 84].map((x) => ({ x, y: 76 }))
];

function withPosition(entity: SceneEntity, position: { x: number; y: number }): SceneEntity {
  return { ...entity, ...position };
}

export function visualPhraseGeometry(relation: SceneRelation, entities: SceneEntity[]) {
  if (!isVisualAction(relation) || relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) return null;
  const definition = visualActionForPredicate(relation.predicate);
  const subject = entities.find((entity) => entity.id === relation.sourceIds[0]);
  const object = entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!definition || !subject || !object || subject.id === object.id) return null;
  const from = definition.direction === "subject-to-object" ? subject : object;
  const to = definition.direction === "subject-to-object" ? object : subject;
  const direction = Math.sign(to.x - from.x);
  if (!direction) return null;
  const startX = from.x * 10 + direction * (entityVisualGeometry[from.kind].contact.halfWidth * from.scale + 10);
  const endX = to.x * 10 - direction * (entityVisualGeometry[to.kind].contact.halfWidth * to.scale + 10);
  if (Math.abs(endX - startX) < 28) return null;
  const startY = from.y * 6.2 - 4;
  const endY = to.y * 6.2 - 4;
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const corridorY = (startY + endY) / 2;
  const labelX = (startX + endX) / 2;
  const labelY = corridorY - 14;
  const controlX = (startX + endX) / 2;
  const obstacles = entities.filter((entity) => entity.id !== from.id && entity.id !== to.id
    && entity.x * 10 > left && entity.x * 10 < right);
  const samples = Array.from({ length: 17 }, (_, index) => (index + 1) / 18).map((time) => {
    const remaining = 1 - time;
    return {
      x: remaining ** 3 * startX + 3 * remaining ** 2 * time * controlX
        + 3 * remaining * time ** 2 * controlX + time ** 3 * endX,
      y: remaining ** 3 * startY + 3 * remaining ** 2 * time * startY
        + 3 * remaining * time ** 2 * endY + time ** 3 * endY
    };
  });
  const blocked = obstacles.some((entity) => samples.some((point) =>
    Math.abs(point.x - entity.x * 10) < entityVisualGeometry[entity.kind].contact.halfWidth * entity.scale + 8
    && Math.abs(point.y - entity.y * 6.2) < 62 * entity.scale));
  const labelHalfWidth = definition.label.length * 4.2;
  const labelBlocked = entities.some((entity) => entity.id !== from.id && entity.id !== to.id
    && Math.abs(entity.x * 10 - labelX) < entityHalfWidth(entity) * 10 + labelHalfWidth
    && Math.abs(entity.y * 6.2 + 84 * entity.scale - labelY) < 18);
  if (blocked || labelBlocked) return null;
  const path = `M${startX} ${startY} C${controlX} ${startY} ${controlX} ${endY} ${endX} ${endY}`;
  const arrow = `M${endX - direction * 11} ${endY - 8} L${endX} ${endY} L${endX - direction * 11} ${endY + 8}`;
  return {
    subject, object, definition, from, to, startX, startY, endX, endY, path, arrow,
    labelX, labelY,
    route: subject.y === object.y ? "straight" as const : "curve" as const
  };
}

/**
 * Searches deterministic candidate pairs while treating unrelated scene objects
 * as fixed obstacles. Only IDs created by the active utterance may move.
 */
export function planVisualPhrase(
  scene: SceneState,
  relation: SceneRelation,
  movableIds: ReadonlySet<string>
): VisualPhraseMove[] | null {
  const originalSubject = scene.entities.find((entity) => entity.id === relation.sourceIds[0]);
  const originalObject = scene.entities.find((entity) => entity.id === relation.targetIds[0]);
  if (!originalSubject || !originalObject || originalSubject.id === originalObject.id) return null;
  const candidatePositions = (entity: SceneEntity) => movableIds.has(entity.id)
    ? [{ x: entity.x, y: entity.y }, ...phrasePositions.filter((position) => position.x !== entity.x || position.y !== entity.y)]
    : [{ x: entity.x, y: entity.y }];
  const candidates = candidatePositions(originalSubject).flatMap((subjectPosition) =>
    candidatePositions(originalObject).map((objectPosition) => [
      withPosition(originalSubject, subjectPosition), withPosition(originalObject, objectPosition)
    ]));
  const retained = [...(scene.relations ?? []).filter(isVisualAction), relation];
  const best = selectLayoutCandidate(scene, candidates, {
    connectorEdges: retained.map((candidate) => renderedEdge(candidate))
      .flatMap((edge) => edge ? [{ sourceId: edge[0], targetId: edge[1] }] : []),
    movementWeight: 0.18,
    validate: (projected) => labelsAreClear(retained, [...projected]),
    preference: (planned) => {
      const subject = planned.find((entity) => entity.id === originalSubject.id)!;
      const object = planned.find((entity) => entity.id === originalObject.id)!;
      return Math.abs(subject.y - object.y) * 7
        + Math.abs(Math.abs(subject.x - object.x) - 28) * 1.5
        + (object.x < subject.x ? 4 : 0);
    }
  })?.entities;
  if (!best) return null;
  return best
    .filter((entity) => movableIds.has(entity.id))
    .filter((entity) => {
      const original = entity.id === originalSubject.id ? originalSubject : originalObject;
      return entity.x !== original.x || entity.y !== original.y;
    })
    .map(({ id, x, y }) => ({ targetId: id, x, y }));
}

function renderedEdge(relation: SceneRelation): [string, string] | null {
  const definition = visualActionForPredicate(relation.predicate);
  if (!definition || !isVisualAction(relation)) return null;
  return definition.direction === "subject-to-object"
    ? [relation.sourceIds[0], relation.targetIds[0]]
    : [relation.targetIds[0], relation.sourceIds[0]];
}

function labelsAreClear(relations: SceneRelation[], entities: SceneEntity[]): boolean {
  const labels = relations.map((relation) => visualPhraseGeometry(relation, entities));
  if (labels.some((geometry) => !geometry)) return false;
  return labels.every((geometry, index) => labels.slice(index + 1).every((other) => {
    if (!geometry || !other) return false;
    const combinedHalfWidth = (geometry.definition.label.length + other.definition.label.length) * 2.2;
    return Math.abs(geometry.labelX - other.labelX) >= combinedHalfWidth
      || Math.abs(geometry.labelY - other.labelY) >= 20;
  }));
}

/**
 * Coordinates all relations from one explanation before any edge is persisted.
 * A fully new acyclic component receives a topology layout; continuations fall
 * back to bounded pair planning while still validating the whole final graph.
 */
export function planVisualPhraseGraph(
  scene: SceneState,
  relations: SceneRelation[],
  movableIds: ReadonlySet<string>
): VisualPhraseMove[] | null {
  if (!relations.length || relations.some((relation) => !isVisualAction(relation))) return null;
  const nodeIds = new Set(relations.flatMap((relation) => [...relation.sourceIds, ...relation.targetIds]));
  const nodes = scene.entities.filter((entity) => nodeIds.has(entity.id));
  if (nodes.length !== nodeIds.size) return null;

  if ([...nodeIds].every((id) => movableIds.has(id))) {
    const incoming = new Map(nodes.map((node) => [node.id, 0]));
    const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
    for (const relation of relations) {
      const edge = renderedEdge(relation);
      if (!edge) return null;
      incoming.set(edge[1], (incoming.get(edge[1]) ?? 0) + 1);
      outgoing.get(edge[0])?.push(edge[1]);
    }
    const rank = new Map(nodes.map((node) => [node.id, 0]));
    const queue = nodes.filter((node) => incoming.get(node.id) === 0).sort((a, b) => a.id.localeCompare(b.id));
    let visited = 0;
    while (queue.length) {
      const node = queue.shift()!;
      visited += 1;
      for (const targetId of [...(outgoing.get(node.id) ?? [])].sort()) {
        rank.set(targetId, Math.max(rank.get(targetId) ?? 0, (rank.get(node.id) ?? 0) + 1));
        incoming.set(targetId, (incoming.get(targetId) ?? 0) - 1);
        if (incoming.get(targetId) === 0) {
          queue.push(nodes.find((candidate) => candidate.id === targetId)!);
          queue.sort((a, b) => a.id.localeCompare(b.id));
        }
      }
    }
    if (visited !== nodes.length) return null;
    const maxRank = Math.max(...rank.values());
    const layers = Array.from({ length: maxRank + 1 }, (_, layer) => nodes
      .filter((node) => rank.get(node.id) === layer)
      .sort((a, b) => a.id.localeCompare(b.id)));
    if (layers.some((layer) => layer.length > 3)) return null;
    const widths = layers.map((layer) => Math.max(...layer.map(entityHalfWidth)));
    const minimumGaps = Array.from({ length: maxRank }, (_, layer) => widths[layer] + widths[layer + 1] + 6);
    const minimumSpan = minimumGaps.reduce((total, gap) => total + gap, 0);
    const availableSpan = 98 - widths[0] - widths.at(-1)!;
    if (minimumSpan > availableSpan) return null;
    const desiredSpan = maxRank ? Math.max(minimumSpan, Math.min(availableSpan, maxRank * 32)) : 0;
    const gapBonus = maxRank ? (desiredSpan - minimumSpan) / maxRank : 0;
    const xByLayer = [50 - desiredSpan / 2];
    for (let layer = 1; layer < layers.length; layer += 1) {
      xByLayer.push(xByLayer[layer - 1] + minimumGaps[layer - 1] + gapBonus);
    }
    const rowsFor = (count: number) => count === 1 ? [44] : count === 2 ? [27, 61] : [18, 44, 70];
    const base = layers.flatMap((layer, layerIndex) => layer.map((node, rowIndex) => ({
      ...node, x: xByLayer[layerIndex], y: rowsFor(layer.length)[rowIndex]
    })));
    const candidates = [0, 10, -10].map((offset) => base.map((entity) => ({ ...entity, y: entity.y + offset })))
    const connectorEdges = relations.map((relation) => renderedEdge(relation))
      .flatMap((edge) => edge ? [{ sourceId: edge[0], targetId: edge[1] }] : []);
    const best = selectLayoutCandidate(scene, candidates, {
      connectorEdges,
      validate: (projected) => labelsAreClear(relations, [...projected])
    })?.entities;
    if (!best) return null;
    return best.filter((entity) => {
      const original = scene.entities.find((candidate) => candidate.id === entity.id)!;
      return entity.x !== original.x || entity.y !== original.y;
    }).map(({ id, x, y }) => ({ targetId: id, x, y }));
  }

  let projected = scene;
  const finalMoves = new Map<string, VisualPhraseMove>();
  for (const relation of relations) {
    const moves = planVisualPhrase(projected, relation, movableIds);
    if (!moves) return null;
    moves.forEach((move) => finalMoves.set(move.targetId, move));
    projected = {
      ...projected,
      entities: projected.entities.map((entity) => {
        const move = moves.find((candidate) => candidate.targetId === entity.id);
        return move ? { ...entity, x: move.x, y: move.y } : entity;
      })
    };
  }
  if (!labelsAreClear([...(scene.relations ?? []).filter(isVisualAction), ...relations], projected.entities)) return null;
  return [...finalMoves.values()].sort((a, b) => a.targetId.localeCompare(b.targetId));
}
