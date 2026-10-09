import { actionForAlias } from "../doodlescript/actionRegistry";
import { conceptSupports } from "../doodlescript/conceptRegistry";
import { applyDoodleScript } from "../doodlescript/scene";
import type { DoodleScript, SceneEntity, SceneState } from "../doodlescript/schema";
import { stageContactPair } from "../doodlescript/spatialStaging";
import { spatialOrder } from "../doodlescript/spatialOrder";
import { universalSceneEdges } from "../doodlescript/universalEdge";
import { validateDoodleScript } from "../doodlescript/validator";
import { emojiPreviewFor, natureEmojiPreviewFor } from "../glyphs/emojiPreview";
import { resolveVisualSymbol } from "../doodlescript/symbolOntology";

/** Promote exact action verbs, not lesson sentences or noun-specific templates.
 * Failed staging retains the original diagram; it never removes a relationship.
 * Existing scene objects stay fixed. One physical target per performer.
 */
export function groundContactPerformances(scene: SceneState, input: DoodleScript): DoodleScript {
  let result = input;
  const movable = new Set(input.commands.flatMap((command) => command.action === "create" ? [command.entity.id] : []));
  let projected = applyDoodleScript(scene, result);
  // Specialist diagrams own their geometry and must not be restaged here.
  if (projected.relations?.some((relation) => !["relatesTo", "actsOn"].includes(relation.kind))) return input;
  for (const original of projected.relations ?? []) {
    if (original.kind !== "relatesTo" || original.sourceIds.length !== 1 || original.targetIds.length !== 1) continue;
    const action = actionForAlias((original.predicate ?? "").toLowerCase().trim());
    if (action?.targeting?.gesture !== "contact") continue;
    const actorId = original.sourceIds[0]; const targetId = original.targetIds[0];
    const actor = projected.entities.find(({ id }) => id === actorId);
    const target = projected.entities.find(({ id }) => id === targetId);
    if (!actor || !movable.has(actorId) || !conceptSupports(actor.kind, "human-performance")) continue;
    if (natureEmojiPreviewFor(actor.label ?? "") || !target) continue;
    // Emoji are font glyphs: their visible edge varies by platform and is not
    // the generic bounding box. Do not fake physical contact with invisible ink.
    // Procedural art also lacks a reliable contact surface at present.
    if (target.visual || target.kind === "generic" && !target.glyph
      && resolveVisualSymbol(target.label ?? "").fallback
      && (emojiPreviewFor(target.label ?? "") || natureEmojiPreviewFor(target.label ?? ""))) continue;
    const competing = projected.relations?.some((relation) => relation.id !== original.id
      && (relation.kind === "actsOn" && (relation.sourceIds.includes(actorId) || relation.targetIds.includes(targetId))
        || relation.kind === "relatesTo" && relation.sourceIds.includes(actorId)
          && actionForAlias((relation.predicate ?? "").toLowerCase().trim())?.targeting?.gesture === "contact"));
    if (competing) continue;
    const relation = { ...original, kind: "actsOn" as const, predicate: action.predicate };
    const relations = (projected.relations ?? []).map((item) => item.id === original.id ? relation : item);
    const staged = { ...projected, relations, entities: projected.entities.map((entity) =>
      entity.id === actorId ? { ...entity, performance: action.performance } : entity) };
    // Check other edges only for competitive candidates. Never trade a correct
    // spatial relation or a visible connector for a nicer contact pose.
    const accepts = (performer: SceneEntity, target: SceneEntity) => {
      const entities = staged.entities.map((entity) => entity.id === actorId ? performer : entity.id === targetId ? target : entity);
      for (const edge of relations) {
        const order = edge.kind === "relatesTo" && spatialOrder(edge.predicate ?? "");
        if (!order) continue;
        const from = entities.find(({ id }) => id === edge.sourceIds[0]);
        const to = entities.find(({ id }) => id === edge.targetIds[0]);
        if (from && to && Math.sign(from[order.axis] - to[order.axis]) !== order.sign) return false;
      }
      return [...universalSceneEdges(relations, entities).values()].every(Boolean);
    };
    const moves = new Map(stageContactPair(staged, actorId, targetId, movable, accepts).map((move) => [move.targetId, move]));
    const candidate: DoodleScript = { ...result, commands: result.commands.map((command) => {
      if (command.action === "relate" && command.relation.id === original.id) return { ...command, relation };
      if (command.action !== "create") return command;
      const move = moves.get(command.entity.id);
      return { ...command, entity: { ...command.entity, ...(move ? { x: move.x, y: move.y } : {}),
        ...(command.entity.id === actorId ? { performance: action.performance } : {}) } };
    }) };
    // Empty staging may mean no placement, not success. The normal validator
    // checks actual reach, body/label separation, identity and scene bounds.
    const checked = validateDoodleScript(candidate, scene);
    const next = applyDoodleScript(scene, candidate);
    if (!checked.ok || !accepts(next.entities.find(({ id }) => id === actorId)!, next.entities.find(({ id }) => id === targetId)!)) continue;
    result = candidate;
    projected = next;
  }
  return result;
}
