import {
  doodleScriptSchema,
  type DoodleCommand,
  type DoodleScript,
  type SceneState
} from "./schema";
import { applyDoodleScript } from "./scene";
import { overlaps, withinCanvas } from "./layout";
import { isMotion, motionGeometry } from "./motion";
import { isQueue, queueGeometry } from "./queue";
import { actionRegistry } from "./actionRegistry";
import { contactPairIsVisuallySafe, solveContactArm } from "./contactGeometry";
import { handoverIsVisuallySafe, handoverParticipants } from "./handover";
import { eventFlowGeometry, hasDirectedCycle, isEventRelation } from "./eventRelations";
import { visualPhraseGeometry, isVisualAction } from "./visualPhrase";
import { visualActionForPredicate } from "./visualActionRegistry";
import { relationCardinalityIssues, relationForKind, relationPredicateIsRegistered, relationSourceCapability, relationSupportsVersion } from "./relationRegistry";
import { conceptSupports, sharedOrderedDomain } from "./conceptRegistry";
import { isPartWholeFlowRelation, partWholeFlowGeometry } from "./partWholeFlow";
import { forceDiagramGeometry, isForceRelation } from "./forceDiagram";
import { labelledContainerGeometry } from "./labelledContainer";
import { geometricConstructionGeometry } from "./geometricConstruction";
import { isLandscapeFlowRelation, landscapeFlowGeometry } from "./landscapeFlow";
import { circulationLoopGeometry, isCirculationRelation } from "./circulationLoop";
import { changingSpeedGeometry, isChangingSpeedRelation } from "./changingSpeedMotion";
import { callReturnGeometry, isCallReturnRelation } from "./callReturnFlow";
import { fractionSubtractionGeometry } from "./fractionSubtraction";
import { isWaterCycleRelation, waterCycleGeometry } from "./waterCycleLoop";
import { isLifecycleRelation, lifecycleSequenceGeometry } from "./lifecycleSequence";

export type GateName = "schema" | "semantic" | "layout" | "confidence";

export interface GateIssue {
  gate: GateName;
  message: string;
}

export type ValidationResult =
  | { ok: true; script: DoodleScript; issues: [] }
  | { ok: false; issues: GateIssue[] };

const idsAfterCommand = (
  ids: Set<string>,
  command: DoodleCommand
): Set<string> => {
  const next = new Set(ids);
  if (command.action === "create") next.add(command.entity.id);
  if (command.action === "remove") next.delete(command.targetId);
  if (command.action === "clear") next.clear();
  return next;
};

export function validateDoodleScript(
  candidate: unknown,
  scene: SceneState,
  minimumConfidence = 0.58
): ValidationResult {
  const parsed = doodleScriptSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        gate: "schema",
        message: `${issue.path.join(".") || "script"}: ${issue.message}`
      }))
    };
  }

  const script = parsed.data;
  const issues: GateIssue[] = [];
  const holdCommands = script.commands.filter((command) => command.action === "hold");
  if (holdCommands.length) {
    if (script.schemaVersion !== "2.5.0") issues.push({ gate: "schema", message: "Scene hold requires DoodleScript 2.5.0." });
    if (holdCommands.length !== 1 || script.commands.length !== 1) issues.push({ gate: "semantic", message: "A scene hold cannot be combined with drawing commands." });
    if (script.context) issues.push({ gate: "semantic", message: "A scene hold must preserve conversation context unchanged." });
  }
  let ids = new Set(scene.entities.map((entity) => entity.id));
  const relationIds = new Set((scene.relations ?? []).map((relation) => relation.id));
  const relationKinds = new Map((scene.relations ?? []).map((relation) => [relation.id, relation.kind]));
  if (script.revision !== scene.revision + 1 || (scene.sceneId !== "welcome" && script.sceneId !== scene.sceneId)) {
    issues.push({ gate: "semantic", message: "This change belongs to an older or different scene. Please try again." });
  }

  for (const command of script.commands) {
    const changesPerformance = command.action === "create" ? Boolean(command.entity.performance)
      : command.action === "update" ? command.performance !== undefined : false;
    if (changesPerformance && !["1.5.0", "1.6.0", "1.7.0", "1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0"].includes(script.schemaVersion)) {
      issues.push({ gate: "schema", message: "Character performances require DoodleScript 1.5.0." });
    }
    if (command.action === "unrelate") {
      const existingKind = relationKinds.get(command.relationId);
      if (existingKind && !relationSupportsVersion(existingKind, script.schemaVersion)) {
        const definition = relationForKind(existingKind);
        issues.push({ gate: "schema", message: `${definition.label} edits require DoodleScript ${definition.minimumVersion} or later.` });
      }
      if (!["1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0", "1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Relationship edits require DoodleScript 1.2.0 or later." });
      if (!relationIds.delete(command.relationId)) issues.push({ gate: "semantic", message: "That relationship no longer exists." });
      relationKinds.delete(command.relationId);
    }
    if (command.action === "clear") { relationIds.clear(); relationKinds.clear(); }
    if (command.action === "relate") {
      const relation = command.relation;
      const members = [...relation.sourceIds, ...relation.targetIds, ...(relation.objectIds ?? [])];
      const definition = relationForKind(relation.kind);
      if (!relationSupportsVersion(relation.kind, script.schemaVersion)) {
        issues.push({ gate: "schema", message: `${definition.label} requires DoodleScript ${definition.minimumVersion} or later.` });
      }
      for (const message of relationCardinalityIssues(relation)) issues.push({ gate: "semantic", message });
      if (isMotion(relation)) {
        if (!["1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0", "1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Directed motion requires DoodleScript 1.3.0 or later." });
        if (relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) issues.push({ gate: "semantic", message: "Motion needs one actor and one reference object." });
      }
      if (isQueue(relation)) {
        if (relation.targetIds.length !== 1) issues.push({ gate: "semantic", message: "An ordered queue needs exactly one destination." });
      }
      if (relation.kind === "actsOn") {
        if (!["1.6.0", "1.7.0", "1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Targeted performances require DoodleScript 1.6.0 or later." });
        if (relation.sourceIds.length !== 1 || relation.targetIds.length !== 1 || !relation.predicate) {
          issues.push({ gate: "semantic", message: "A targeted performance needs one actor, one target and an action." });
        }
        const action = actionRegistry.find((candidate) => candidate.predicate === relation.predicate);
        const validTargetSyntax = action?.targeting?.syntax === "direct"
          ? !relation.preposition
          : Boolean(relation.preposition && action?.targeting?.prepositions.includes(relation.preposition));
        if (!action?.targeting || !validTargetSyntax) {
          issues.push({ gate: "semantic", message: "That action and target syntax are not registered together." });
        }
      }
      if (relation.kind === "handover") {
        if (!["1.7.0", "1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Handovers require DoodleScript 1.7.0 or later." });
        if (relation.sourceIds.length !== 1 || relation.targetIds.length !== 1 || relation.objectIds?.length !== 1) {
          issues.push({ gate: "semantic", message: "A handover needs exactly one giver, recipient, and transferred object." });
        }
      } else if (relation.objectIds && !["pumpsTo", "returnsTo"].includes(relation.kind)) {
        issues.push({ gate: "semantic", message: "Only a handover or circulation path can declare a transported object role." });
      }
      if (isEventRelation(relation)) {
        if (!["1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Event relationships require DoodleScript 1.8.0 or later." });
        if (relation.sourceIds.length !== 1 || relation.targetIds.length !== 1) {
          issues.push({ gate: "semantic", message: "An event relationship needs exactly one source and one result." });
        }
      }
      if (isVisualAction(relation)) {
        if (!["1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Visual actions require DoodleScript 1.9.0 or later." });
        if (relation.sourceIds.length !== 1 || relation.targetIds.length !== 1 || !relation.predicate) {
          issues.push({ gate: "semantic", message: "A visual action needs one subject, one object and a registered predicate." });
        }
        const action = visualActionForPredicate(relation.predicate);
        const validSyntax = action?.syntax === "direct" ? !relation.preposition
          : Boolean(relation.preposition && action?.prepositions.includes(relation.preposition));
        if (!action || !validSyntax) issues.push({ gate: "semantic", message: "That visual action syntax is not registered." });
      }
      if (script.schemaVersion === "1.0.0") {
        issues.push({ gate: "schema", message: "Relationships require DoodleScript 1.1.0." });
      }
      if (relationIds.has(relation.id) || members.some((id) => !ids.has(id)) || new Set(members).size !== members.length) {
        issues.push({ gate: "semantic", message: "A relationship has duplicate or missing references." });
      }
      if (relation.kind === "owns" && relation.sourceIds.length !== 1) {
        issues.push({ gate: "semantic", message: "Personal ownership needs one owner." });
      }
      relationIds.add(relation.id);
      relationKinds.set(relation.id, relation.kind);
    }
    if (command.action === "create" && ids.has(command.entity.id)) {
      issues.push({
        gate: "semantic",
        message: `Entity "${command.entity.id}" already exists.`
      });
    }

    if (
      (command.action === "move" ||
        command.action === "update" ||
        command.action === "remove") &&
      !ids.has(command.targetId)
    ) {
      issues.push({
        gate: "semantic",
        message: `Entity "${command.targetId}" does not exist.`
      });
    }

    ids = idsAfterCommand(ids, command);
  }

  const projected = applyDoodleScript(scene, script);
  if (script.context) {
    if (!["1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0", "1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0"].includes(script.schemaVersion)) issues.push({ gate: "schema", message: "Conversation context requires DoodleScript 1.2.0 or later." });
    for (const references of [script.context.subjectIds, script.context.objectIds]) {
      if (new Set(references).size !== references.length || references.some((id) => !ids.has(id))) {
        issues.push({ gate: "semantic", message: "Conversation context refers to missing or duplicate objects." });
      }
    }
  }
  const owned = new Set<string>();
  const moving = new Set<string>();
  const targeting = new Set<string>();
  const handedOver = new Set<string>();
  const eventEdges = new Set<string>();
  const visualActionEdges = new Set<string>();
  const forceRelations = (projected.relations ?? []).filter(isForceRelation);
  if (forceRelations.length && (forceRelations.length !== 3 || !forceDiagramGeometry(forceRelations, projected.entities))) {
    issues.push({ gate: "semantic", message: "A force diagram needs one coherent applied force, opposing force, body, and contact surface." });
  }
  const landscapeRelations = (projected.relations ?? []).filter(isLandscapeFlowRelation);
  if (landscapeRelations.length && (landscapeRelations.length !== 2 || !landscapeFlowGeometry(landscapeRelations, projected.entities))) {
    issues.push({ gate: "semantic", message: "A landscape flow needs one watercourse connecting a distinct elevated source to a lower water destination." });
  }
  const circulationRelations = (projected.relations ?? []).filter(isCirculationRelation);
  if (circulationRelations.length && (circulationRelations.length !== 3 || !circulationLoopGeometry(circulationRelations, projected.entities))) {
    issues.push({ gate: "semantic", message: "A circulation loop needs one outbound path, one return path, one shared payload, and one enrichment." });
  }
  const changingSpeedRelations = (projected.relations ?? []).filter(isChangingSpeedRelation);
  if (changingSpeedRelations.length && (changingSpeedRelations.length !== 3 || !changingSpeedGeometry(changingSpeedRelations, projected.entities))) {
    issues.push({ gate: "semantic", message: "Changing-speed motion needs one object, one shared apex, and one accelerating force across a complete ascent and descent." });
  }
  const callReturnRelations = (projected.relations ?? []).filter(isCallReturnRelation);
  if (callReturnRelations.length && (callReturnRelations.length !== 2 || !callReturnGeometry(callReturnRelations, projected.entities))) {
    issues.push({ gate: "semantic", message: "A call and return needs one caller, one function, and a return to the original call site." });
  }
  const arithmeticRelations = (projected.relations ?? []).filter(({ kind }) => kind === "subtracts" || kind === "resultsIn");
  if (arithmeticRelations.length && (arithmeticRelations.length !== 2 || !fractionSubtractionGeometry(projected.relations ?? [], projected.entities))) {
    issues.push({ gate: "semantic", message: "Fraction subtraction needs a valid starting fraction, removed part, whole, and equivalent remainder." });
  }
  const waterCycleRelations = (projected.relations ?? []).filter(isWaterCycleRelation);
  if (waterCycleRelations.length && (waterCycleRelations.length !== 3 || !waterCycleGeometry(waterCycleRelations, projected.entities))) {
    issues.push({ gate: "semantic", message: "A water cycle needs one rain path, one soil infiltration, and one evaporation return to a cloud." });
  }
  const lifecycleRelations = (projected.relations ?? []).filter(isLifecycleRelation);
  if (lifecycleRelations.length && (lifecycleRelations.length !== 2 || !lifecycleSequenceGeometry(lifecycleRelations, projected.entities))) {
    issues.push({ gate: "semantic", message: "A lifecycle sequence needs three distinct stages joined by exactly two ordered transformations." });
  }
  for (const entity of projected.entities) {
    if (entity.performance && !conceptSupports(entity.kind, "human-performance")) {
      issues.push({ gate: "semantic", message: "Articulated character performance can only target a person." });
    }
  }
  for (const relation of projected.relations ?? []) {
    if (isVisualAction(relation)) {
      const edge = `${relation.predicate}:${relation.sourceIds[0]}:${relation.targetIds[0]}`;
      if (visualActionEdges.has(edge)) issues.push({ gate: "semantic", message: "That visual action is already shown." });
      visualActionEdges.add(edge);
      if (!visualPhraseGeometry(relation, projected.entities)) {
        issues.push({ gate: "layout", message: "A visual action needs clear connector space between its two concepts." });
      }
    }
    if (isEventRelation(relation)) {
      const edge = `${relation.kind}:${relation.sourceIds[0]}:${relation.targetIds[0]}`;
      if (eventEdges.has(edge)) issues.push({ gate: "semantic", message: "That event relationship is already shown." });
      eventEdges.add(edge);
      if (!eventFlowGeometry(relation, projected.entities)) {
        issues.push({ gate: "layout", message: "Event relationships need a readable left-to-right row with clear connector space." });
      }
    }
    if (relation.kind === "handover") {
      const participants = handoverParticipants(relation, projected.entities);
      const objectId = relation.objectIds?.[0];
      if (!participants || ![participants.giver, participants.recipient].every((entity) => conceptSupports(entity.kind, "human-performance"))) {
        issues.push({ gate: "semantic", message: "A handover needs two people and one existing object." });
      } else {
        const recipientOwnsObject = projected.relations?.some((candidate) => candidate.kind === "owns"
          && candidate.sourceIds[0] === participants.recipient.id && candidate.targetIds.includes(participants.object.id));
        if (!recipientOwnsObject) issues.push({ gate: "semantic", message: "The handover recipient must own the transferred object in the resulting scene." });
        if (!handoverIsVisuallySafe(participants.giver, participants.recipient, participants.object)) {
          issues.push({ gate: "layout", message: "The giver and recipient cannot both reach that object safely." });
        }
        for (const person of [participants.giver, participants.recipient]) {
          if (targeting.has(person.id)) issues.push({ gate: "semantic", message: "A person cannot have two conflicting performance targets." });
          targeting.add(person.id);
        }
      }
      if (objectId && handedOver.has(objectId)) issues.push({ gate: "semantic", message: "An object cannot be in two handovers at once." });
      if (objectId) handedOver.add(objectId);
    }
    if (relation.kind === "actsOn") {
      const actor = projected.entities.find((entity) => entity.id === relation.sourceIds[0]);
      const target = projected.entities.find((entity) => entity.id === relation.targetIds[0]);
      const action = actionRegistry.find((candidate) => candidate.predicate === relation.predicate);
      if (!actor || !conceptSupports(actor.kind, "human-performance")) issues.push({ gate: "semantic", message: "A targeted performance needs a person as its actor." });
      if (actor && target && action?.targeting?.gesture === "contact") {
        const contact = solveContactArm(actor, target, actor.performance?.bodyLean ?? 0);
        if (!contact.solution.reachable || !contactPairIsVisuallySafe(actor, target)) {
          issues.push({ gate: "layout", message: "That contact pose cannot reach the visible object safely. Add it beside the person or move one endpoint closer." });
        }
      }
      if (targeting.has(relation.sourceIds[0])) issues.push({ gate: "semantic", message: "A person cannot have two conflicting performance targets." });
      targeting.add(relation.sourceIds[0]);
    }
    if (isQueue(relation)) {
      const sources = relation.sourceIds.map((id) => projected.entities.find((entity) => entity.id === id));
      const targets = relation.targetIds.map((id) => projected.entities.find((entity) => entity.id === id));
      const validRoles = relation.sourceIds.length <= 4 && relation.targetIds.length === 1 &&
        sources.every((entity) => entity && conceptSupports(entity.kind, "queue-member")
          && targets[0] && sharedOrderedDomain(entity.kind, targets[0].kind)) &&
        Boolean(targets[0] && conceptSupports(targets[0].kind, "queue-target"));
      if (!validRoles) issues.push({ gate: "semantic", message: "An ordered queue needs one to four compatible members and one registered destination." });
      else if (!queueGeometry(relation, projected.entities)) issues.push({ gate: "layout", message: "Keep the ordered members on the same row before their destination." });
    }
    if (isMotion(relation)) {
      const actor = projected.entities.find((entity) => entity.id === relation.sourceIds[0]);
      const target = projected.entities.find((entity) => entity.id === relation.targetIds[0]);
      const requiredCapability = relationSourceCapability(relation.kind, relation.predicate);
      if (!relationPredicateIsRegistered(relation.kind, relation.predicate)) issues.push({ gate: "semantic", message: "That directional movement is not registered." });
      if (actor && requiredCapability && !conceptSupports(actor.kind, requiredCapability)) {
        issues.push({ gate: "semantic", message: `That actor cannot perform the registered ${relation.predicate} movement.` });
      }
      if (moving.has(relation.sourceIds[0])) issues.push({ gate: "semantic", message: "An actor cannot have conflicting simultaneous directions." });
      moving.add(relation.sourceIds[0]);
      if (actor && target && !motionGeometry(actor, target, relation.kind as "toward" | "away")) issues.push({ gate: "layout", message: "Place the moving object and its reference on the same row with room for an arrow." });
    }
    if (isPartWholeFlowRelation(relation) && !partWholeFlowGeometry(relation, projected.entities)) {
      issues.push({ gate: "layout", message: "A part-whole flow needs distinct, readable endpoints with room for its connector." });
    }
    if (relation.kind === "contains" && !labelledContainerGeometry(relation, projected.entities)) {
      issues.push({ gate: "layout", message: "A labelled container needs one readable content identity nested inside its container." });
    }
    if (relation.kind === "measures" && !geometricConstructionGeometry(relation, projected.entities)) {
      issues.push({ gate: "layout", message: "An angular measurement needs a valid degree value and readable construction geometry." });
    }
    if (relation.kind !== "owns") continue;
    for (const id of relation.targetIds) {
      if (owned.has(id)) issues.push({ gate: "semantic", message: "An object cannot have two personal owners. Transfer it explicitly." });
      owned.add(id);
    }
  }
  if (hasDirectedCycle(projected.relations ?? [])) {
    issues.push({ gate: "semantic", message: "A directed event graph cannot contain a temporal or causal cycle." });
  }
  if (hasDenseOverlap(projected) || projected.entities.some((entity) => !withinCanvas(entity))) {
    issues.push({
      gate: "layout",
      message: "The change would overlap or clip an object or label. Choose another position or a shorter label."
    });
  }

  if (script.confidence < minimumConfidence) {
    issues.push({
      gate: "confidence",
      message: "I am not certain enough to change the drawing."
    });
  }

  return issues.length ? { ok: false, issues } : { ok: true, script, issues: [] };
}

function hasDenseOverlap(scene: SceneState): boolean {
  const entities = scene.entities;
  for (let index = 0; index < entities.length; index += 1) {
    for (let other = index + 1; other < entities.length; other += 1) {
      const a = entities[index];
      const b = entities[other];
      if (!overlaps(a, b)) continue;
      const contact = scene.relations?.find((relation) => {
        if (relation.kind !== "actsOn") return false;
        const action = actionRegistry.find((candidate) => candidate.predicate === relation.predicate);
        return action?.targeting?.gesture === "contact"
          && relation.sourceIds[0] === a.id && relation.targetIds[0] === b.id;
      }) ?? scene.relations?.find((relation) => {
        if (relation.kind !== "actsOn") return false;
        const action = actionRegistry.find((candidate) => candidate.predicate === relation.predicate);
        return action?.targeting?.gesture === "contact"
          && relation.sourceIds[0] === b.id && relation.targetIds[0] === a.id;
      });
      if (contact) {
        const actor = entities.find((entity) => entity.id === contact.sourceIds[0])!;
        const target = entities.find((entity) => entity.id === contact.targetIds[0])!;
        if (contactPairIsVisuallySafe(actor, target)
          && solveContactArm(actor, target, actor.performance?.bodyLean ?? 0).solution.reachable) continue;
      }
      const handover = scene.relations?.find((relation) => {
        if (relation.kind !== "handover") return false;
        const trio = [relation.sourceIds[0], relation.targetIds[0], relation.objectIds?.[0]];
        return trio.includes(a.id) && trio.includes(b.id);
      });
      const participants = handover && handoverParticipants(handover, entities);
      if (participants && handoverIsVisuallySafe(participants.giver, participants.recipient, participants.object)) continue;
      return true;
    }
  }
  return false;
}
