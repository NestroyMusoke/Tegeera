import type { CharacterPerformance, DoodleCommand, DoodleScript, EntityKind, SceneEntity, SceneState, SceneContext } from "./schema";
import { applyDoodleScript } from "./scene";
import { nextPosition, nextPositionFor } from "./layout";
import { isMotion, motionGeometry } from "./motion";
import { analyzeTeacherInput } from "./semanticFrame";
import { entityKindForAlias, ordinalWords, parseCountToken, parseEntityPhrase } from "./lexicon";
import { actionRegistry } from "./actionRegistry";
import { releaseContactPair, stageContactPair, stageTargetedPair } from "./spatialStaging";
import { stageHandover } from "./handover";
import { planEventGraph } from "./eventRelations";
import { planVisualPhraseGraph } from "./visualPhrase";
import { Clarification, type ClarificationRequest } from "./clarification";
import { conceptSupports, sharedOrderedDomain } from "./conceptRegistry";
import { isQueue, planOrderedRow } from "./queue";
import { planPartWholeFlow } from "./partWholeFlow";
import { planForceDiagram } from "./forceDiagram";
import { planLabelledContainer } from "./labelledContainer";
import { planGeometricConstruction } from "./geometricConstruction";
import { planLandscapeFlow } from "./landscapeFlow";
import { planCirculationLoop } from "./circulationLoop";
import { planChangingSpeedMotion } from "./changingSpeedMotion";
import { planCallReturnFlow } from "./callReturnFlow";
import { planFractionSubtraction } from "./fractionSubtraction";
import { planWaterCycleLoop } from "./waterCycleLoop";
import { planLifecycleSequence } from "./lifecycleSequence";
import { planReflectionRay } from "./reflectionRay";
import { planConvergentPlates, planLifoStack, planOrderedRoutine, planTriangleAngleSum } from "./advancedConstructions";
import { relationForKind } from "./relationRegistry";
import { planIndexedCollection } from "./indexedCollection";
import { planLinkedChain } from "./linkedChain";
import { planConditionFlow } from "./conditionFlow";

export type Interpretation =
  | { ok: true; script: DoodleScript }
  | { ok: false; message: string; clause: string; clarification: ClarificationRequest };

function nounPhrase(phrase: string): { kind: EntityKind; count: number } {
  const parsed = parseEntityPhrase(phrase);
  if (!parsed) throw new Clarification(`I cannot yet represent “${phrase}”. Please describe its objects separately.`, "unsupported-meaning");
  if (parsed.count < 1 || parsed.count > 12) throw new Clarification("Use a count from one to twelve; I have not changed the scene.", "missing-quantity");
  if (!parsed.countToken && (parsed.noun.endsWith("s") || parsed.noun === "people")) throw new Clarification(`How many ${parsed.noun} should I draw?`, "missing-quantity");
  return { kind: parsed.kind, count: parsed.count };
}

function resolve(phrase: string, scene: SceneState): SceneEntity {
  const normalized = phrase.replace(/^the /, "");
  if (/^(she|he|her|him|they|them|it|that)$/.test(normalized)) {
    const ids = /^(it|that)$/.test(normalized)
      ? (scene.context?.objectIds.length ? scene.context.objectIds : scene.context?.subjectIds ?? [])
      : scene.context?.subjectIds ?? [];
    const candidates = scene.entities.filter((entity) => ids.includes(entity.id));
    if (candidates.length === 1 && (/^(it|that)$/.test(normalized) || conceptSupports(candidates[0].kind, "human-performance"))) return candidates[0];
  }
  const exact = scene.entities.filter((entity) => entity.label?.toLowerCase() === normalized);
  if (exact.length === 1) return exact[0];
  const tokens = normalized.split(" ");
  const ordinal = ordinalWords.indexOf(tokens[0] as typeof ordinalWords[number]);
  const kind = entityKindForAlias(tokens.at(-1) ?? "");
  const candidates = kind ? scene.entities.filter((entity) => entity.kind === kind) : [];
  if (ordinal >= 0 && tokens.length === 2 && candidates[ordinal]) return candidates[ordinal];
  if (tokens.length === 1 && candidates.length === 1) return candidates[0];
  if (/^(it|that)$/.test(normalized) && scene.entities.length === 1) return scene.entities[0];
  throw new Clarification(candidates.length > 1
    ? `Which ${kind}? Say “the first ${kind}” or “the second ${kind}”.`
    : `I cannot identify “${phrase}” in this scene. Name an existing object.`, "ambiguous-reference");
}

export function interpretTeacherText(input: string, scene: SceneState): Interpretation {
  const commands: DoodleCommand[] = [];
  let working = scene;
  let currentClause = input;
  let currentEvidence = input;
  let context: SceneContext | undefined = scene.context;
  let schemaVersion: DoodleScript["schemaVersion"] = "1.4.0";
  const versionOrder: DoodleScript["schemaVersion"][] = ["1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0", "1.7.0", "1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0", "2.7.0", "2.8.0", "2.9.0", "2.10.0", "2.11.0", "2.12.0", "2.13.0", "2.14.0", "2.15.0", "2.16.0", "2.17.0", "2.18.0", "2.19.0"];
  const upgradeVersion = (minimum: DoodleScript["schemaVersion"]) => {
    if (versionOrder.indexOf(schemaVersion) < versionOrder.indexOf(minimum)) schemaVersion = minimum;
  };
  const makeScript = (): DoodleScript => ({
    schemaVersion, sceneId: scene.sceneId, revision: scene.revision + 1, context,
    confidence: 1, sourceText: input, commands
  });
  const append = (command: DoodleCommand) => {
    if (command.action === "hold") upgradeVersion("2.5.0");
    if ((command.action === "create" && command.entity.performance)
      || (command.action === "update" && command.performance !== undefined)) upgradeVersion("1.5.0");
    if (command.action === "unrelate") {
      const removedKind = working.relations?.find((relation) => relation.id === command.relationId)?.kind;
      if (removedKind) upgradeVersion(relationForKind(removedKind).minimumVersion);
      if (removedKind === "actsOn") upgradeVersion("1.6.0");
      if (removedKind === "handover") upgradeVersion("1.7.0");
      if (removedKind === "visualAction") upgradeVersion("1.9.0");
    }
    if (command.action === "relate") upgradeVersion(relationForKind(command.relation.kind).minimumVersion);
    if (command.action === "relate" && command.relation.kind === "actsOn") upgradeVersion("1.6.0");
    if (command.action === "relate" && command.relation.kind === "handover") upgradeVersion("1.7.0");
    if (command.action === "relate" && ["before", "causes"].includes(command.relation.kind)) upgradeVersion("1.8.0");
    if (command.action === "relate" && command.relation.kind === "visualAction") upgradeVersion("1.9.0");
    if (command.action === "relate" && ["partOf", "flowsInto", "illuminates"].includes(command.relation.kind)) upgradeVersion("2.0.0");
    if (command.action === "relate" && ["appliedTo", "opposes", "contacts"].includes(command.relation.kind)) upgradeVersion("2.1.0");
    if (command.action === "relate" && command.relation.kind === "contains") upgradeVersion("2.2.0");
    if (command.action === "relate" && command.relation.kind === "measures") upgradeVersion("2.3.0");
    if (command.action === "relate" && ["flowsFrom", "flowsTo"].includes(command.relation.kind)) upgradeVersion("2.4.0");
    if (command.action === "relate" && ["pumpsTo", "returnsTo", "carries"].includes(command.relation.kind)) upgradeVersion("2.6.0");
    if (command.action === "relate" && ["risesTo", "fallsFrom", "accelerates"].includes(command.relation.kind)) upgradeVersion("2.7.0");
    if (command.action === "relate" && ["calls", "returnsControlTo"].includes(command.relation.kind)) upgradeVersion("2.8.0");
    if (command.action === "relate" && ["subtracts", "resultsIn"].includes(command.relation.kind)) upgradeVersion("2.9.0");
    if (command.action === "relate" && ["fallsTo", "infiltrates", "evaporatesTo"].includes(command.relation.kind)) upgradeVersion("2.10.0");
    if (command.action === "relate" && command.relation.kind === "transformsTo") upgradeVersion("2.11.0");
    if (command.action === "relate" && ["travelsTo", "reflectsFrom"].includes(command.relation.kind)) upgradeVersion("2.12.0");
    if (command.action === "relate" && command.relation.kind === "accessedAt") upgradeVersion("2.13.0");
    if (command.action === "relate" && ["trianglePartOf", "sumsTo"].includes(command.relation.kind)) upgradeVersion("2.14.0");
    if (command.action === "relate" && command.relation.kind === "pushesToward") upgradeVersion("2.15.0");
    if (command.action === "relate" && command.relation.kind === "routineBefore") upgradeVersion("2.16.0");
    commands.push(command);
    working = applyDoodleScript(scene, makeScript());
  };
  const create = (phrase: string, performance?: CharacterPerformance): string[] => {
    const spec = nounPhrase(phrase);
    if (performance && !conceptSupports(spec.kind, "human-performance")) {
      throw new Clarification(`A ${spec.kind} cannot perform that human action. Name a person instead.`);
    }
    const ids: string[] = [];
    for (let i = 0; i < spec.count; i++) {
      const position = nextPosition(working.entities);
      if (!position) throw new Clarification("There is no readable space left. Remove an object or start a new scene.", "layout-limit");
      let number = 1;
      while (working.entities.some((entity) => entity.id === `${spec.kind}-${number}`)) number++;
      const id = `${spec.kind}-${number}`;
      append({ action: "create", entity: {
        id, kind: spec.kind, label: `${spec.kind} ${number}`, ...position,
        scale: 1, direction: "right", highlighted: false, performance
      } });
      ids.push(id);
    }
    return ids;
  };
  const focus = (subjectIds: string[], objectIds: string[] = []) => {
    context = { subjectIds, objectIds };
    working = applyDoodleScript(scene, makeScript());
  };
  const relate = (kind: "shares" | "owns" | "toward" | "away" | "queuedFor" | "before" | "causes", sourceIds: string[], targetIds: string[]) => {
    append({ action: "relate", relation: {
      id: `relation-${scene.revision + 1}-${commands.length}`, kind, sourceIds, targetIds
    } });
  };
  const stopMotion = (actorId: string) => {
    for (const relation of (working.relations ?? []).filter((item) => isMotion(item) && item.sourceIds.includes(actorId))) {
      append({ action: "unrelate", relationId: relation.id });
    }
  };
  const eventNode = (phrase: string, visualRole?: SceneEntity["visualRole"], forceNew = false): string => {
    const normalized = phrase.trim().replace(/^(?:a|an|the) /, "");
    if (!normalized || normalized.length > 40 || normalized.split(/\s+/).length > 7
      || !/^[a-z0-9][a-z0-9 '-]*$/.test(normalized)) {
      throw new Clarification("Keep each event or concept to seven words so its timeline label stays readable.", "layout-limit");
    }
    const exact = working.entities.filter((entity) => entity.label?.toLowerCase() === normalized);
    if (!forceNew && exact.length === 1) return exact[0].id;
    if (/^(?:it|that)$/.test(phrase)) return resolve(phrase, working).id;
    const parsed = parseEntityPhrase(normalized);
    if (parsed) {
      if (parsed.count !== 1) throw new Clarification("Use one event or concept at each end of a timeline relationship.");
      const existingKind = working.entities.filter((entity) => entity.kind === parsed.kind);
      if (phrase.startsWith("the ") && existingKind.length) return resolve(phrase, working).id;
      const id = create(normalized)[0];
      if (visualRole) {
        const created = commands.find((command) => command.action === "create" && command.entity.id === id);
        if (created?.action === "create") created.entity.visualRole = visualRole;
        working = applyDoodleScript(scene, makeScript());
      }
      return id;
    }
    const position = nextPositionFor(working.entities, "generic", normalized);
    if (!position) throw new Clarification("There is no readable space left for that event. Remove an object or start a new scene.", "layout-limit");
    let number = 1;
    while (working.entities.some((entity) => entity.id === `concept-${number}`)) number++;
    const id = `concept-${number}`;
    append({ action: "create", entity: {
      id, kind: "generic", label: normalized, ...position,
      scale: 1, direction: "right", highlighted: false, ...(visualRole ? { visualRole } : {})
    } });
    return id;
  };
  try {
    if (!input.trim() || input.length > 500) throw new Clarification("Explain one short scene or change, up to 500 characters.", "empty-input");
    const semanticInput = analyzeTeacherInput(input);
    if (!semanticInput.frames.length) throw new Clarification("Explain one short scene or change, up to 500 characters.", "empty-input");
    for (let frameIndex = 0; frameIndex < semanticInput.frames.length; frameIndex += 1) {
      const frame = semanticInput.frames[frameIndex];
      currentClause = frame.sourceText.toLowerCase();
      currentEvidence = frame.sourceText;
      const text = frame.normalizedText;
      if (frame.safetyIntent?.kind === "ambiguous-comparison") throw new Clarification(
        "Name the two things and what 'faster' represents before I compare them.",
        "ambiguous-meaning", ["Name both things", "Explain what their speeds mean"]
      );
      if (frame.safetyIntent?.kind === "unresolved-prior-context") throw new Clarification(
        "I do not have yesterday's lesson in this scene. Name the earlier idea or reopen that lesson.",
        "ambiguous-reference", ["Name the earlier idea", "Open the previous lesson"]
      );
      if (frame.safetyIntent?.kind === "non-visual-hold") {
        if (semanticInput.frames.length === 1) {
          context = undefined;
          append({ action: "hold", reason: "non-visual-speech" });
        }
        continue;
      }
      if (frame.discourse.negated) throw new Clarification(
        "I heard a negation, so I left the drawing unchanged. Say the positive scene you want shown.",
        "negated-claim", ["Describe the scene positively", "Leave the scene unchanged"]
      );
      if (frame.discourse.conditional && !frame.forceDiagrams.length && !frame.callReturnFlows.length && !frame.fractionSubtractions.length && !frame.lifecycleSequences.length && !frame.conditionFlows.length) throw new Clarification(
        "I heard a condition. Tell me whether to draw the condition or its result.",
        "conditional-claim", ["Draw the condition", "Draw the result"]
      );
      if (frame.discourse.uncertain) throw new Clarification(
        "I heard uncertainty. Tell me the definite scene you want shown.",
        "uncertain-claim", ["Draw the possible scene", "Leave the scene unchanged"]
      );
      if (frame.meaningCandidates.length > 1) throw new Clarification(
        "That phrase has more than one drawable meaning. Rephrase it with one clear action or relationship.",
        "ambiguous-meaning",
        frame.meaningCandidates.map(({ family, predicate }) => `${family}: ${predicate}`)
      );
      if (/^(?:clear(?: everything| the scene)?|erase everything|start over)$/.test(text)) {
        append({ action: "clear" }); focus([]); continue;
      }
      const circulation = frame.circulationLoops[0];
      if (circulation?.construction === "circulation-loop") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const sourceId = eventNode(mentionText(circulation.sourceMentionId), "circulation-source");
        const destinationId = eventNode(mentionText(circulation.destinationMentionId), "circulation-destination");
        const payloadId = eventNode(mentionText(circulation.payloadMentionId), "circulation-payload");
        const enrichmentId = eventNode(mentionText(circulation.enrichmentMentionId), "circulation-enrichment");
        const ids = { sourceId, destinationId, payloadId, enrichmentId };
        if (new Set(Object.values(ids)).size !== 4) throw new Clarification("A circulation loop needs distinct source, destination, payload, and enrichment identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planCirculationLoop(working, ids, movableIds);
        if (!moves) throw new Clarification("That circulation loop cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "pumpsTo", sourceIds: [sourceId], targetIds: [destinationId], objectIds: [payloadId], predicate: "pumpsTo" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "returnsTo", sourceIds: [destinationId], targetIds: [sourceId], objectIds: [payloadId], predicate: "returnsTo" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "carries", sourceIds: [payloadId], targetIds: [enrichmentId], predicate: "carries" } });
        focus([sourceId, destinationId], [payloadId, enrichmentId]);
        continue;
      }
      const changingMotion = frame.changingSpeedMotions[0];
      if (changingMotion?.construction === "changing-speed-motion") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const objectId = eventNode(mentionText(changingMotion.objectMentionId), "trajectory-object");
        const apexId = eventNode(mentionText(changingMotion.apexMentionId), "trajectory-apex");
        const forceId = eventNode(mentionText(changingMotion.forceMentionId), "trajectory-force");
        const ids = { objectId, apexId, forceId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("A changing-speed trajectory needs distinct object, apex, and force identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planChangingSpeedMotion(working, ids, movableIds);
        if (!moves) throw new Clarification("That changing-speed trajectory cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "risesTo", sourceIds: [objectId], targetIds: [apexId], predicate: "risesTo" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "fallsFrom", sourceIds: [objectId], targetIds: [apexId], predicate: "fallsFrom" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "accelerates", sourceIds: [forceId], targetIds: [objectId], predicate: "accelerates" } });
        focus([objectId], [apexId, forceId]);
        continue;
      }
      const callReturn = frame.callReturnFlows[0];
      if (callReturn?.construction === "call-return-flow") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const callerId = eventNode(mentionText(callReturn.callerMentionId), "control-caller");
        const functionId = eventNode(mentionText(callReturn.functionMentionId), "control-function");
        const callSiteId = eventNode(mentionText(callReturn.callSiteMentionId), "control-call-site");
        const ids = { callerId, functionId, callSiteId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("A call and return needs distinct caller, function, and return-point identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planCallReturnFlow(working, ids, movableIds);
        if (!moves) throw new Clarification("That call-and-return flow cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "calls", sourceIds: [callerId], targetIds: [functionId], predicate: "calls" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "returnsControlTo", sourceIds: [functionId], targetIds: [callSiteId], predicate: "returnsTo" } });
        focus([callerId], [functionId, callSiteId]);
        continue;
      }
      const fraction = frame.fractionSubtractions[0];
      if (fraction?.construction === "fraction-subtraction") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const fractionNode = (mentionId: string, visualRole: SceneEntity["visualRole"], value?: { numerator: number; denominator: number }) => {
          const id = eventNode(mentionText(mentionId), visualRole, visualRole !== "fraction-whole");
          const created = [...commands].reverse().find((command) => command.action === "create" && command.entity.id === id);
          if (created?.action === "create" && value) created.entity.fraction = value;
          return id;
        };
        const wholeId = fractionNode(fraction.wholeMentionId, "fraction-whole");
        const initialId = fractionNode(fraction.initialMentionId, "fraction-initial", fraction.initial);
        const removedId = fractionNode(fraction.removedMentionId, "fraction-removed", fraction.removed);
        const remainderId = fractionNode(fraction.remainderMentionId, "fraction-remainder", fraction.remainder);
        const ids = { wholeId, initialId, removedId, remainderId };
        if (new Set(Object.values(ids)).size !== 4) throw new Clarification("Fraction subtraction needs distinct whole, starting amount, removed amount, and remainder identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planFractionSubtraction(working, ids, movableIds);
        if (!moves) throw new Clarification("That fraction subtraction cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "subtracts", sourceIds: [removedId], targetIds: [initialId], predicate: "subtracts" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "partOf", sourceIds: [initialId], targetIds: [wholeId], predicate: "partOf" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "resultsIn", sourceIds: [initialId], targetIds: [remainderId], predicate: "resultsIn" } });
        focus([wholeId, initialId], [removedId, remainderId]);
        continue;
      }
      const waterCycle = frame.waterCycleLoops[0];
      if (waterCycle?.construction === "water-cycle-loop") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const cloudId = eventNode(mentionText(waterCycle.cloudMentionId), "cycle-cloud");
        const rainId = eventNode(mentionText(waterCycle.rainMentionId), "cycle-rain");
        const soilId = eventNode(mentionText(waterCycle.soilMentionId), "cycle-soil");
        const waterId = eventNode(mentionText(waterCycle.waterMentionId), "cycle-water");
        const evaporationId = eventNode(mentionText(waterCycle.evaporationMentionId), "cycle-evaporation");
        const ids = { cloudId, rainId, soilId, waterId, evaporationId };
        if (new Set(Object.values(ids)).size !== 5) throw new Clarification("A water cycle needs distinct cloud, rain, soil, water, and evaporation identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planWaterCycleLoop(working, ids, movableIds);
        if (!moves) throw new Clarification("That water cycle cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "fallsTo", sourceIds: [rainId], targetIds: [soilId], predicate: "fallsTo" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "infiltrates", sourceIds: [waterId], targetIds: [soilId], predicate: "infiltrates" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "evaporatesTo", sourceIds: [evaporationId], targetIds: [cloudId], predicate: "evaporatesTo" } });
        focus([cloudId, rainId], [soilId, waterId, evaporationId]);
        continue;
      }
      const lifecycle = frame.lifecycleSequences[0];
      if (lifecycle?.construction === "lifecycle-sequence") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const startId = eventNode(mentionText(lifecycle.startMentionId), "lifecycle-start");
        const intermediateId = eventNode(mentionText(lifecycle.intermediateMentionId), "lifecycle-intermediate");
        const finalId = eventNode(mentionText(lifecycle.finalMentionId), "lifecycle-final");
        const ids = { startId, intermediateId, finalId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("A lifecycle needs three distinct ordered stages.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planLifecycleSequence(working, ids, movableIds);
        if (!moves) throw new Clarification("That lifecycle sequence cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "transformsTo", sourceIds: [startId], targetIds: [intermediateId], predicate: "transformsTo" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "transformsTo", sourceIds: [intermediateId], targetIds: [finalId], predicate: "transformsTo" } });
        focus([startId], [intermediateId, finalId]);
        continue;
      }
      const reflection = frame.reflectionRays[0];
      if (reflection?.construction === "reflection-ray") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const incidentId = eventNode(mentionText(reflection.incidentMentionId), "optics-incident");
        const surfaceId = eventNode(mentionText(reflection.surfaceMentionId), "optics-surface");
        const reflectedId = eventNode(mentionText(reflection.reflectedMentionId), "optics-reflected");
        const ids = { incidentId, surfaceId, reflectedId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("Reflection needs distinct incident light, surface, and reflected light identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planReflectionRay(working, ids, movableIds);
        if (!moves) throw new Clarification("That reflection construction cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "travelsTo", sourceIds: [incidentId], targetIds: [surfaceId], predicate: "travelsTo" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "reflectsFrom", sourceIds: [reflectedId], targetIds: [surfaceId], predicate: "reflectsFrom" } });
        focus([incidentId], [surfaceId, reflectedId]);
        continue;
      }
      const lifo = frame.lifoStacks[0];
      if (lifo?.construction === "lifo-stack") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references].find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const stackId = eventNode(mentionText(lifo.stackMentionId), "stack-container");
        const itemsId = eventNode(mentionText(lifo.itemsMentionId), "stack-items");
        const topId = eventNode(mentionText(lifo.topMentionId), "stack-top");
        const ids = { stackId, itemsId, topId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("A stack needs distinct container, items, and top identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planLifoStack(working, ids, movableIds);
        if (!moves) throw new Clarification("That stack cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "accessedAt", sourceIds: [itemsId], targetIds: [topId], predicate: "accessedAt" } });
        focus([stackId, itemsId], [topId]); continue;
      }
      const triangleSum = frame.triangleAngleSums[0];
      if (triangleSum?.construction === "triangle-angle-sum") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references].find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const triangleId = eventNode(mentionText(triangleSum.triangleMentionId), "triangle-shape");
        const anglesId = eventNode(mentionText(triangleSum.anglesMentionId), "triangle-angles");
        const sumId = eventNode(mentionText(triangleSum.sumMentionId), "triangle-sum");
        const ids = { triangleId, anglesId, sumId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("An angle-sum diagram needs distinct triangle, angles, and total identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planTriangleAngleSum(working, ids, movableIds);
        if (!moves) throw new Clarification("That angle-sum construction cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "trianglePartOf", sourceIds: [anglesId], targetIds: [triangleId], predicate: "partOf" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "sumsTo", sourceIds: [anglesId], targetIds: [sumId], predicate: "sumsTo" } });
        focus([triangleId, anglesId], [sumId]); continue;
      }
      const plates = frame.convergentPlates[0];
      if (plates?.construction === "convergent-plates") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references].find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const leftId = eventNode(mentionText(plates.leftMentionId), "plate-left");
        const rightId = eventNode(mentionText(plates.rightMentionId), "plate-right");
        const mountainId = eventNode(mentionText(plates.mountainMentionId), "plate-mountain");
        const ids = { leftId, rightId, mountainId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("Convergence needs distinct left plate, right plate, and mountain identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planConvergentPlates(working, ids, movableIds);
        if (!moves) throw new Clarification("That convergent boundary cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "pushesToward", sourceIds: [leftId], targetIds: [mountainId], predicate: "pushesToward" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "pushesToward", sourceIds: [rightId], targetIds: [mountainId], predicate: "pushesToward" } });
        focus([leftId, rightId], [mountainId]); continue;
      }
      const routine = frame.orderedRoutines[0];
      if (routine?.construction === "ordered-routine") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references].find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const firstId = eventNode(mentionText(routine.firstMentionId), "routine-first");
        const middleId = eventNode(mentionText(routine.middleMentionId), "routine-middle");
        const finalId = eventNode(mentionText(routine.finalMentionId), "routine-final");
        const ids = { firstId, middleId, finalId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("A routine needs three distinct ordered steps.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planOrderedRoutine(working, ids, movableIds);
        if (!moves) throw new Clarification("That routine cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "routineBefore", sourceIds: [firstId], targetIds: [middleId], predicate: "before" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "routineBefore", sourceIds: [middleId], targetIds: [finalId], predicate: "before" } });
        focus([firstId], [middleId, finalId]); continue;
      }
      const indexed = frame.indexedCollections[0];
      if (indexed?.construction === "indexed-collection") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references].find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const collectionId = eventNode(mentionText(indexed.collectionMentionId), "indexed-collection");
        const cellsId = eventNode(mentionText(indexed.cellsMentionId), "indexed-cells");
        const valuesId = eventNode(mentionText(indexed.valuesMentionId), "indexed-values");
        const indexId = eventNode(mentionText(indexed.indexMentionId), "indexed-start");
        const ids = { collectionId, cellsId, valuesId, indexId };
        if (new Set(Object.values(ids)).size !== 4) throw new Clarification("An indexed collection needs distinct collection, cells, values, and starting-index identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planIndexedCollection(working, ids, movableIds);
        if (!moves) throw new Clarification("That indexed collection cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "containsCells", sourceIds: [collectionId], targetIds: [cellsId], predicate: "containsCells" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "storesValues", sourceIds: [cellsId], targetIds: [valuesId], predicate: "storesValues" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "startsIndexAt", sourceIds: [cellsId], targetIds: [indexId], predicate: "startsIndexAt" } });
        focus([collectionId, cellsId], [valuesId, indexId]); continue;
      }
      const linked = frame.linkedChains[0];
      if (linked?.construction === "linked-chain") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references].find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const collectionId = eventNode(mentionText(linked.collectionMentionId), "linked-collection");
        const firstId = eventNode(mentionText(linked.firstMentionId), "linked-first");
        const middleId = eventNode(mentionText(linked.middleMentionId), "linked-middle");
        const finalId = eventNode(mentionText(linked.finalMentionId), "linked-final");
        const ids = { collectionId, firstId, middleId, finalId };
        if (new Set(Object.values(ids)).size !== 4) throw new Clarification("A linked chain needs one collection and three distinct ordered node identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planLinkedChain(working, ids, movableIds);
        if (!moves) throw new Clarification("That linked chain cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "hasFirstNode", sourceIds: [collectionId], targetIds: [firstId], predicate: "hasFirstNode" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "pointsNext", sourceIds: [firstId], targetIds: [middleId], predicate: "pointsNext" } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "pointsNext", sourceIds: [middleId], targetIds: [finalId], predicate: "pointsNext" } });
        focus([collectionId, firstId], [middleId, finalId]); continue;
      }
      const conditionFlow = frame.conditionFlows[0];
      if (conditionFlow?.construction === "condition-flow") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references].find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const entryRole = conditionFlow.mode === "loop" ? "control-step" : "control-entry";
        const entryId = eventNode(mentionText(conditionFlow.entryMentionId), entryRole);
        const conditionId = eventNode(mentionText(conditionFlow.conditionMentionId), "control-condition");
        const trueId = conditionFlow.mode === "loop" ? entryId : eventNode(mentionText(conditionFlow.trueMentionId), "control-true");
        const falseId = eventNode(mentionText(conditionFlow.falseMentionId), conditionFlow.mode === "loop" ? "control-exit" : "control-false");
        const ids = { entryId, conditionId, trueId, falseId };
        const expected = conditionFlow.mode === "loop" ? 3 : 4;
        if (new Set(Object.values(ids)).size !== expected) throw new Clarification("A condition flow needs distinct decision and outcome identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planConditionFlow(working, ids, movableIds, conditionFlow.mode);
        if (!moves) throw new Clarification("That condition flow cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "checksCondition", sourceIds: [entryId], targetIds: [conditionId] } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "takesTruePath", sourceIds: [conditionId], targetIds: [trueId] } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "takesFalsePath", sourceIds: [conditionId], targetIds: [falseId] } });
        focus([entryId, conditionId], [trueId, falseId]); continue;
      }
      const forceDiagram = frame.forceDiagrams[0];
      if (forceDiagram?.construction === "force-diagram") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const bodyId = eventNode(mentionText(forceDiagram.bodyMentionId), "object");
        const surfaceId = eventNode(mentionText(forceDiagram.surfaceMentionId), "surface");
        const appliedForceId = eventNode(mentionText(forceDiagram.appliedForceMentionId), "force");
        const opposingForceId = eventNode(mentionText(forceDiagram.opposingForceMentionId), "force");
        const ids = { bodyId, surfaceId, appliedForceId, opposingForceId };
        if (new Set(Object.values(ids)).size !== 4) throw new Clarification("A force diagram needs a distinct body, surface, applied force, and opposing force.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planForceDiagram(working, ids, movableIds, forceDiagram.appliedDirection);
        if (!moves) throw new Clarification("That force diagram cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "appliedTo", sourceIds: [appliedForceId], targetIds: [bodyId] } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "opposes", sourceIds: [opposingForceId], targetIds: [appliedForceId] } });
        append({ action: "relate", relation: { id: `relation-${scene.revision + 1}-${commands.length}`, kind: "contacts", sourceIds: [bodyId], targetIds: [surfaceId] } });
        focus([bodyId], [surfaceId, appliedForceId, opposingForceId]);
        continue;
      }
      const containment = frame.containments[0];
      if (containment?.construction === "labelled-container") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const containerId = eventNode(mentionText(containment.containerMentionId), "container");
        const contentId = eventNode(mentionText(containment.contentMentionId), "contained");
        if (containerId === contentId) throw new Clarification("A container and its content need distinct identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planLabelledContainer(working, containerId, contentId, movableIds);
        if (!moves) throw new Clarification("That labelled container cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: {
          id: `relation-${scene.revision + 1}-${commands.length}`,
          kind: "contains", sourceIds: [containerId], targetIds: [contentId], predicate: "contains"
        } });
        focus([containerId], [contentId]);
        continue;
      }
      const geometry = frame.geometricConstructions[0];
      if (geometry?.construction === "geometric-construction") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const subjectId = eventNode(mentionText(geometry.subjectMentionId), "geometry");
        const measurementId = eventNode(mentionText(geometry.measurementMentionId), "measurement");
        if (subjectId === measurementId) throw new Clarification("An angle and its measurement need distinct identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planGeometricConstruction(working, subjectId, measurementId, movableIds);
        if (!moves) throw new Clarification("That angle construction cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: {
          id: `relation-${scene.revision + 1}-${commands.length}`,
          kind: "measures", sourceIds: [subjectId], targetIds: [measurementId], predicate: "measures"
        } });
        focus([subjectId], [measurementId]);
        continue;
      }
      const landscape = frame.landscapeFlows[0];
      if (landscape?.construction === "landscape-flow") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const watercourseId = eventNode(mentionText(landscape.watercourseMentionId), "watercourse");
        const sourceId = eventNode(mentionText(landscape.sourceMentionId), "elevated-source");
        const destinationId = eventNode(mentionText(landscape.destinationMentionId), "water-destination");
        const ids = { watercourseId, sourceId, destinationId };
        if (new Set(Object.values(ids)).size !== 3) throw new Clarification("A landscape flow needs distinct watercourse, source, and destination identities.", "conflicting-scene");
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planLandscapeFlow(working, ids, movableIds);
        if (!moves) throw new Clarification("That landscape flow cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation: {
          id: `relation-${scene.revision + 1}-${commands.length}`,
          kind: "flowsFrom", sourceIds: [watercourseId], targetIds: [sourceId], predicate: "flowsFrom"
        } });
        append({ action: "relate", relation: {
          id: `relation-${scene.revision + 1}-${commands.length}`,
          kind: "flowsTo", sourceIds: [watercourseId], targetIds: [destinationId], predicate: "flowsTo"
        } });
        focus([watercourseId], [sourceId, destinationId]);
        continue;
      }
      const orderedRelation = frame.relations.find((relation) => relation.predicate === "queuedFor");
      if (orderedRelation) {
        const mentionText = (mentionId: string) => frame.entities.find((mention) => mention.mentionId === mentionId)?.text
          ?? frame.references.find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const sourcePhrase = mentionText(orderedRelation.sourceMentionIds[0]);
        const targetPhrase = mentionText(orderedRelation.targetMentionIds[0]);
        const sourceSpec = nounPhrase(sourcePhrase);
        const targetSpec = nounPhrase(targetPhrase);
        if (!conceptSupports(sourceSpec.kind, "queue-member")) throw new Clarification("That ordered queue needs registered queue members.");
        if (!conceptSupports(targetSpec.kind, "queue-target") || targetSpec.count !== 1) throw new Clarification("Name one registered system for that ordered queue.");
        if (!sharedOrderedDomain(sourceSpec.kind, targetSpec.kind)) throw new Clarification("Those members and that destination do not share a registered queue domain.", "unsupported-meaning");
        if (sourceSpec.count > 4) throw new Clarification("Show one to four queue members so the ordered row stays readable.", "layout-limit");
        const sources = create(sourcePhrase);
        const targets = create(targetPhrase);
        relate("queuedFor", sources, targets);
        const ordered = working.relations?.find((relation) => relation.kind === "queuedFor"
          && relation.sourceIds.every((id) => sources.includes(id)) && relation.targetIds[0] === targets[0]);
        const moves = ordered ? planOrderedRow(working, ordered) : null;
        if (!moves) throw new Clarification("That ordered queue cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        focus(sources, targets);
        continue;
      }
      const eventRelation = frame.relations.find((relation) => ["before", "after", "causes"].includes(relation.predicate));
      if (eventRelation) {
        const mentionText = (mentionId: string) => frame.entities.find((mention) => mention.mentionId === mentionId)?.text
          ?? frame.references.find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const leftPhrase = mentionText(eventRelation.sourceMentionIds[0]);
        const rightPhrase = mentionText(eventRelation.targetMentionIds[0]);
        const reverse = eventRelation.predicate === "after";
        const sourceId = eventNode(reverse ? rightPhrase : leftPhrase);
        const targetId = eventNode(reverse ? leftPhrase : rightPhrase);
        if (sourceId === targetId) throw new Clarification("An event cannot be ordered before or caused by itself.", "conflicting-scene");
        const relation = {
          id: `relation-${scene.revision + 1}-${commands.length}`,
          kind: eventRelation.predicate === "causes" ? "causes" as const : "before" as const,
          sourceIds: [sourceId], targetIds: [targetId]
        };
        const moves = planEventGraph(working, relation);
        if (!moves) throw new Clarification("That event graph cannot fit readably yet. Shorten a label or remove an unrelated object.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        append({ action: "relate", relation });
        focus([sourceId], [targetId]);
        continue;
      }
      const composition = frame.compositions[0];
      if (composition?.construction === "part-whole-flow") {
        const mentionText = (mentionId: string) => [...frame.entities, ...frame.references]
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map(({ id }) => id));
        const wholeId = eventNode(mentionText(composition.wholeMentionId));
        const channels = composition.channels.map((channel) => ({
          inputId: eventNode(mentionText(channel.inputMentionId)),
          partId: eventNode(mentionText(channel.partMentionId)),
          flowPredicate: channel.flowPredicate
        }));
        const identities = [wholeId, ...channels.flatMap(({ inputId, partId }) => [inputId, partId])];
        if (new Set(identities).size !== identities.length) {
          throw new Clarification("A part-whole explanation needs distinct inputs, parts, and a whole.", "conflicting-scene");
        }
        const movableIds = new Set(working.entities.filter(({ id }) => !idsBefore.has(id)).map(({ id }) => id));
        const moves = planPartWholeFlow(working, wholeId, channels, movableIds);
        if (!moves) throw new Clarification("That part-whole flow cannot fit readably yet.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        channels.forEach((channel) => {
          append({ action: "relate", relation: {
            id: `relation-${scene.revision + 1}-${commands.length}`,
            kind: "partOf", sourceIds: [channel.partId], targetIds: [wholeId]
          } });
          append({ action: "relate", relation: {
            id: `relation-${scene.revision + 1}-${commands.length}`,
            kind: channel.flowPredicate, sourceIds: [channel.inputId], targetIds: [channel.partId]
          } });
        });
        focus([wholeId], channels.flatMap(({ inputId, partId }) => [inputId, partId]));
        continue;
      }
      const visualAction = frame.visualActions[0];
      if (visualAction) {
        let phraseEnd = frameIndex;
        while (phraseEnd + 1 < semanticInput.frames.length && semanticInput.frames[phraseEnd + 1].visualActions.length) phraseEnd += 1;
        const phraseFrames = semanticInput.frames.slice(frameIndex, phraseEnd + 1);
        const mentionText = (mentionId: string) => semanticInput.frames.flatMap((candidate) => [...candidate.entities, ...candidate.references])
          .find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const idsBefore = new Set(working.entities.map((entity) => entity.id));
        const resolved = phraseFrames.flatMap((candidate) => candidate.visualActions).map((action) => ({
          action,
          subjectId: eventNode(mentionText(action.subjectMentionId)),
          objectId: eventNode(mentionText(action.objectMentionId))
        }));
        if (resolved.some(({ subjectId, objectId }) => subjectId === objectId)) {
          throw new Clarification("A visual action needs two distinct concepts or objects.", "conflicting-scene");
        }
        const uniqueEdges = new Set(resolved.map(({ action, subjectId, objectId }) => `${action.predicate}:${subjectId}:${objectId}`));
        if (uniqueEdges.size !== resolved.length) throw new Clarification("That visual action is repeated in the same explanation.", "conflicting-scene");
        const relationNumber = commands.length;
        const relations = resolved.map(({ action, subjectId, objectId }, index) => ({
          id: `relation-${scene.revision + 1}-${relationNumber + index}`,
          kind: "visualAction" as const,
          predicate: action.predicate,
          preposition: action.preposition,
          sourceIds: [subjectId], targetIds: [objectId]
        }));
        const movableIds = new Set(working.entities.filter((entity) => !idsBefore.has(entity.id)).map((entity) => entity.id));
        const moves = planVisualPhraseGraph(working, relations, movableIds);
        if (!moves) throw new Clarification("That explanation graph cannot fit readably yet. Shorten a label or use fewer simultaneous ideas.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        relations.forEach((relation) => append({ action: "relate", relation }));
        focus([...new Set(resolved.map(({ subjectId }) => subjectId))], [...new Set(resolved.map(({ objectId }) => objectId))]);
        currentClause = phraseFrames.at(-1)?.sourceText.toLowerCase() ?? currentClause;
        frameIndex = phraseEnd;
        continue;
      }
      const directional = frame.relations.find((relation) => relation.predicate === "toward" || relation.predicate === "away");
      if (directional) {
        const mentionText = (mentionId: string) => frame.entities.find((mention) => mention.mentionId === mentionId)?.text
          ?? frame.references.find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const participant = (phrase: string, actor: boolean) => {
          if (/^(a|an|one) /.test(phrase)) {
            if (nounPhrase(phrase).count !== 1) throw new Clarification("Directional movement needs one moving object and one reference object.");
            return create(phrase)[0];
          }
          if (actor && phrase === "it" && context?.subjectIds.length === 1) return context.subjectIds[0];
          return resolve(phrase, working).id;
        };
        const actorId = participant(mentionText(directional.sourceMentionIds[0]), true);
        const targetId = participant(mentionText(directional.targetMentionIds[0]), false);
        if (actorId === targetId) throw new Clarification("An object cannot approach itself. Name the other object.", "conflicting-scene");
        const actor = working.entities.find((entity) => entity.id === actorId)!;
        if (directional.sourceCapability && !conceptSupports(actor.kind, directional.sourceCapability)) {
          throw new Clarification(`That concept cannot perform the registered ${directional.relationPredicate} movement.`);
        }
        stopMotion(actorId);
        append({ action: "relate", relation: {
          id: `relation-${scene.revision + 1}-${commands.length}`,
          kind: directional.predicate as "toward" | "away", predicate: directional.relationPredicate,
          sourceIds: [actorId], targetIds: [targetId]
        } });
        focus([actorId], [targetId]);
        continue;
      }
      const reverse = text.match(/^(?:make )?(.+?) (?:go|goes|move|moves) (?:the )?other way$/);
      if (reverse) {
        const actorId = reverse[1] === "it" && context?.subjectIds.length === 1 ? context.subjectIds[0] : resolve(reverse[1], working).id;
        const previous = (working.relations ?? []).filter((relation) => isMotion(relation) && relation.sourceIds[0] === actorId);
        if (previous.length !== 1) throw new Clarification("Which direction is being reversed? First describe what it is moving toward or away from.");
        stopMotion(actorId);
        relate(previous[0].kind === "toward" ? "away" : "toward", [actorId], previous[0].targetIds);
        focus([actorId], previous[0].targetIds);
        continue;
      }
      const first = text.match(/^(?:what if )?(.+?) (?:goes|went) first$/)
        ?? text.match(/^move (.+?) to (?:the )?(?:front|first position)$/);
      if (first) {
        const member = resolve(first[1], working);
        const queues = (working.relations ?? []).filter((relation) => isQueue(relation) && relation.sourceIds.includes(member.id));
        if (!conceptSupports(member.kind, "queue-member") || queues.length !== 1) throw new Clarification("Which queued member should go first? Name its position in the ordered queue.");
        const previous = queues[0];
        const ordered = [member.id, ...previous.sourceIds.filter((id) => id !== member.id)];
        append({ action: "unrelate", relationId: previous.id });
        const updated = { ...previous, sourceIds: ordered };
        append({ action: "relate", relation: updated });
        const moves = planOrderedRow(working, updated);
        if (!moves) throw new Clarification("That reordered queue cannot fit readably in the current scene.", "layout-limit");
        moves.forEach((move) => append({ action: "move", ...move }));
        focus(ordered, previous.targetIds);
        continue;
      }
      const stop = text.match(/^stop (.+)$/);
      if (stop) {
        const actorId = stop[1] === "it" && context?.subjectIds.length === 1 ? context.subjectIds[0] : resolve(stop[1], working).id;
        const previous = (working.relations ?? []).find((relation) => isMotion(relation) && relation.sourceIds[0] === actorId);
        if (!previous) throw new Clarification("That object has no current motion to stop.");
        const actor = working.entities.find((entity) => entity.id === actorId)!;
        const target = working.entities.find((entity) => entity.id === previous.targetIds[0]);
        const geometry = target ? motionGeometry(actor, target, previous.kind as "toward" | "away") : null;
        if (geometry) append({ action: "update", targetId: actorId, direction: geometry.direction });
        stopMotion(actorId); focus([actorId]); continue;
      }
      const correction = text.match(/^(?:make that|make it|change (?:that|it) to) (\w+)(?: (\w+))?$/);
      if (correction) {
        const amount = parseCountToken(correction[1]);
        if (amount < 1 || amount > 10) throw new Clarification("Choose a count from one to ten for this scene.", "missing-quantity");
        const explicitKind = correction[2] ? entityKindForAlias(correction[2]) : undefined;
        if (correction[2] && !explicitKind) throw new Clarification("Which existing type of object should change?");
        const subjects = working.entities.filter((entity) => context?.subjectIds.includes(entity.id));
        const objects = working.entities.filter((entity) => context?.objectIds.includes(entity.id));
        const members = explicitKind
          ? subjects.some((entity) => entity.kind === explicitKind)
            ? subjects.filter((entity) => entity.kind === explicitKind)
            : objects.filter((entity) => entity.kind === explicitKind)
          : subjects;
        if (!members.length || new Set(members.map((entity) => entity.kind)).size !== 1) throw new Clarification("Which group should change? Name the objects in the last explanation.");
        if (amount === members.length) throw new Clarification(`That group already has ${amount} objects.`, "conflicting-scene");
        const ids = members.map((entity) => entity.id);
        const affected = (working.relations ?? []).filter((relation) => [...relation.sourceIds, ...relation.targetIds].some((id) => ids.includes(id)));
        if (affected.some(isQueue) && amount > 4) throw new Clarification("Show one to four members so the ordered queue stays readable.", "layout-limit");
        if (affected.length > 1 || affected.some((relation) => {
          const side = relation.sourceIds.some((id) => ids.includes(id)) ? relation.sourceIds : relation.targetIds;
          return side.length !== ids.length || side.some((id) => !ids.includes(id)) || (relation.kind === "owns" && side === relation.sourceIds);
        })) throw new Clarification("Those objects have different roles or owners. Change one explicitly instead.");
        const retained = ids.slice(0, amount);
        if (amount > ids.length) retained.push(...create(`${amount - ids.length} ${members[0].kind}`));
        for (const id of ids.slice(amount)) append({ action: "remove", targetId: id });
        for (const relation of affected) {
          append({ action: "unrelate", relationId: relation.id });
          const sourceChanged = relation.sourceIds.some((id) => ids.includes(id));
          const updated = { ...relation,
            sourceIds: sourceChanged ? retained : relation.sourceIds,
            targetIds: relation.targetIds.some((id) => ids.includes(id)) ? retained : relation.targetIds
          };
          append({ action: "relate", relation: updated });
          if (updated.kind === "queuedFor" && sourceChanged) {
            const moves = planOrderedRow(working, updated);
            if (!moves) throw new Clarification("That resized queue cannot fit readably in the current scene.", "layout-limit");
            moves.forEach((move) => append({ action: "move", ...move }));
          }
        }
        focus(context?.subjectIds.some((id) => ids.includes(id)) ? retained : context?.subjectIds ?? [],
          context?.objectIds.some((id) => ids.includes(id)) ? retained : context?.objectIds ?? []);
        continue;
      }
      const transfer = text.match(/^(.+?) gives (.+?) to (.+)$/);
      if (transfer) {
        const giver = resolve(transfer[1], working);
        const recipient = resolve(transfer[3], working);
        if (giver.id === recipient.id) throw new Clarification("The giver and recipient are the same person.", "conflicting-scene");
        if (![giver, recipient].every((entity) => conceptSupports(entity.kind, "human-performance"))) {
          throw new Clarification("A handover needs a person giving to another person.");
        }
        const possession = transfer[2].match(/^(her|his|their) (\w+)$/);
        let object: SceneEntity;
        if (possession) {
          if (resolve(possession[1] === "their" ? "they" : possession[1], working).id !== giver.id) throw new Clarification("Whose object is being given?");
          const ownedIds = (working.relations ?? []).filter((relation) => relation.kind === "owns" && relation.sourceIds[0] === giver.id).flatMap((relation) => relation.targetIds);
          const matches = working.entities.filter((entity) => entity.kind === entityKindForAlias(possession[2]) && ownedIds.includes(entity.id));
          if (matches.length !== 1) throw new Clarification("Which owned object should be given? Name it explicitly.");
          object = matches[0];
        } else object = resolve(transfer[2], working);
        const links = (working.relations ?? []).filter((relation) => ["owns", "shares"].includes(relation.kind) && relation.targetIds.includes(object.id));
        if (links.length !== 1 || links[0].kind !== "owns" || links[0].sourceIds[0] !== giver.id) throw new Clarification("That object is not solely owned by the giver. Clarify its ownership first.");
        for (const relation of (working.relations ?? []).filter((relation) =>
          (relation.kind === "handover" && relation.objectIds?.includes(object.id))
          || (relation.kind === "actsOn" && [...relation.sourceIds, ...relation.targetIds].some((id) => [giver.id, recipient.id, object.id].includes(id))))) {
          append({ action: "unrelate", relationId: relation.id });
        }
        const old = links[0];
        append({ action: "unrelate", relationId: old.id });
        const remaining = old.targetIds.filter((id) => id !== object.id);
        if (remaining.length) append({ action: "relate", relation: { ...old, targetIds: remaining } });
        relate("owns", [recipient.id], [object.id]);
        for (const move of stageHandover(working, giver.id, object.id, recipient.id)) append({ action: "move", ...move });
        append({ action: "relate", relation: {
          id: `relation-${scene.revision + 1}-${commands.length}`,
          kind: "handover", predicate: "give",
          sourceIds: [giver.id], targetIds: [recipient.id], objectIds: [object.id]
        } });
        focus([giver.id, recipient.id], [object.id]);
        continue;
      }
      const move = text.match(/^(move|turn|face) (.+?) (?:to the )?(left|right|up|down)$/);
      if (move) {
        const target = resolve(move[2], working);
        stopMotion(target.id);
        const direction = move[3] as "left" | "right" | "up" | "down";
        if (move[1] !== "move") append({ action: "update", targetId: target.id, direction });
        else {
          const orderedTarget = (working.relations ?? []).some((relation) => isQueue(relation) && relation.targetIds.includes(target.id));
          const nextX = orderedTarget && direction === "right" ? Math.min(92, target.x + 18)
            : target.x + (direction === "left" ? -18 : direction === "right" ? 18 : 0);
          const nextY = target.y + (direction === "up" ? -32 : direction === "down" ? 32 : 0);
          const delta = { x: nextX - target.x, y: nextY - target.y };
          const attachments = (working.relations ?? []).filter((relation) => relation.kind === "actsOn"
            && relation.sourceIds[0] === target.id
            && actionRegistry.find((action) => action.predicate === relation.predicate)?.targeting?.attachment);
          append({ action: "move", targetId: target.id, direction, x: nextX, y: nextY });
          attachments.forEach((relation) => {
            const attached = working.entities.find((entity) => entity.id === relation.targetIds[0]);
            if (attached) append({ action: "move", targetId: attached.id, x: attached.x + delta.x, y: attached.y + delta.y });
          });
        }
        focus([target.id]);
        continue;
      }
      const remove = text.match(/^(?:remove|delete|erase) (.+)$/);
      if (remove) {
        append({ action: "remove", targetId: resolve(remove[1], working).id });
        focus(working.context?.subjectIds ?? [], working.context?.objectIds ?? []); continue;
      }
      const highlight = text.match(/^highlight (.+)$/);
      if (highlight) {
        const targets = /^(they|them)$/.test(highlight[1]) ? context?.subjectIds ?? [] : [resolve(highlight[1], working).id];
        if (!targets.length) throw new Clarification("Which group should I highlight?");
        for (const targetId of targets) append({ action: "update", targetId, highlighted: true });
        focus(targets);
        continue;
      }
      const rename = text.match(/^rename (.+?) to (.{1,60})$/);
      if (rename) {
        const targetId = resolve(rename[1], working).id;
        append({ action: "update", targetId, label: rename[2] }); focus([targetId]); continue;
      }
      const arrival = text.match(/^another (\w+) (?:arrives|joins)(?:,? but (?:she|he|they) already (?:has|have) (?:her|his|their) own (\w+)| with (?:her|his|their|an?) (?:own )?(\w+))?$/);
      if (arrival) {
        const owners = create(`one ${arrival[1]}`);
        const object = arrival[2] ?? arrival[3];
        if (object) relate("owns", owners, create(`one ${object}`));
        focus(owners, object ? working.relations?.at(-1)?.targetIds ?? [] : []);
        continue;
      }
      const distributed = text.match(/^(.+?) each (?:has|have|owns|own|having|with) (.+)$/)
        ?? text.match(/^(.+?) (?:has|have|owns|own) (.+?) each$/);
      if (distributed) {
        const phrase = distributed[1];
        let owners: string[];
        if (phrase === "they") owners = context?.subjectIds ?? [];
        else if (phrase.startsWith("the ")) {
          const noun = phrase.slice(4);
          const kind = entityKindForAlias(noun);
          if (!kind || !(noun.endsWith("s") || noun === "people")) throw new Clarification("Name the group, for example ‘the students each have a book’.");
          owners = working.entities.filter((entity) => entity.kind === kind).map((entity) => entity.id);
        } else owners = create(phrase);
        const members = working.entities.filter((entity) => owners.includes(entity.id));
        if (!members.length || new Set(members.map((entity) => entity.kind)).size !== 1) throw new Clarification("Which group has an item each? Name one type of object.");
        const spec = nounPhrase(distributed[2]);
        if (working.entities.length + owners.length * spec.count > 10) throw new Clarification("Those individual items would exceed the ten-object scene limit. Use a smaller group or fewer items each.", "layout-limit");
        const objects: string[] = [];
        for (const owner of owners) {
          const owned = create(distributed[2]);
          relate("owns", [owner], owned);
          objects.push(...owned);
        }
        focus(owners, objects);
        continue;
      }
      const semanticAction = frame.actions[0];
      if (semanticAction) {
        const definition = actionRegistry.find((action) => action.predicate === semanticAction.predicate);
        if (!definition) throw new Clarification("I recognized an action but cannot yet perform it safely.");
        const actorMentionId = semanticAction.actorMentionIds[0];
        const mentionText = (mentionId: string) => frame.entities.find((mention) => mention.mentionId === mentionId)?.text
          ?? frame.references.find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const actorPhrase = mentionText(actorMentionId);
        let actorIds: string[];
        let created = false;
        let createdActorIds: string[] = [];
        if (/^(they|them)$/.test(actorPhrase)) actorIds = context?.subjectIds ?? [];
        else if (/^(she|he)$/.test(actorPhrase)) actorIds = [resolve(actorPhrase, working).id];
        else if (actorPhrase.startsWith("the ")) {
          const noun = actorPhrase.slice(4);
          const kind = entityKindForAlias(noun);
          actorIds = kind && (noun.endsWith("s") || noun === "people")
            ? working.entities.filter((entity) => entity.kind === kind).map((entity) => entity.id)
            : [resolve(actorPhrase, working).id];
        } else {
          const spec = parseEntityPhrase(actorPhrase);
          const existing = spec ? working.entities.filter((entity) => entity.kind === spec.kind) : [];
          if (spec && !spec.countToken && existing.length === 1) actorIds = [existing[0].id];
          else if (spec && semanticAction.phase === "start") {
            actorIds = create(actorPhrase, definition.performance);
            created = true;
            createdActorIds = actorIds;
          } else if (semanticAction.phase === "stop") {
            throw new Clarification("Which existing person should stop that action?");
          } else actorIds = [resolve(actorPhrase, working).id];
        }
        const actors = working.entities.filter((entity) => actorIds.includes(entity.id));
        if (!actors.length) throw new Clarification("Which person performs that action?");
        if (actors.some((entity) => !conceptSupports(entity.kind, "human-performance"))) {
          throw new Clarification("That performance needs a person, student or teacher.");
        }
        const targetMentionId = semanticAction.targetMentionIds[0];
        let targetId: string | undefined;
        let targetCreated = false;
        if (targetMentionId) {
          const targetPhrase = mentionText(targetMentionId);
          const spec = parseEntityPhrase(targetPhrase);
          if (/^(?:it|that|the .+)$/.test(targetPhrase)) targetId = resolve(targetPhrase, working).id;
          else if (spec && spec.count !== 1) throw new Clarification("Name one target for that action.");
          else if (spec?.countToken) { targetId = create(targetPhrase)[0]; targetCreated = true; }
          else if (spec) {
            const existing = working.entities.filter((entity) => entity.kind === spec.kind);
            if (existing.length === 1) targetId = existing[0].id;
            else if (existing.length) targetId = resolve(targetPhrase, working).id;
            else { targetId = create(targetPhrase)[0]; targetCreated = true; }
          } else targetId = resolve(targetPhrase, working).id;
          if (actorIds.includes(targetId)) throw new Clarification("A person cannot target the same character with their own gesture.");
        } else if (definition.targeting?.requirement === "required" && semanticAction.phase === "start") {
          throw new Clarification(`What should the person ${semanticAction.predicate} at?`);
        }
        const currentTargets = (working.relations ?? []).filter((relation) => relation.kind === "actsOn" && actorIds.includes(relation.sourceIds[0]));
        if (semanticAction.phase === "stop") {
          const matchingTargets = currentTargets.filter((relation) => relation.predicate === semanticAction.predicate);
          const hasMatchingLoop = definition.performance.loop !== "none"
            && actors.every((entity) => entity.performance?.loop === definition.performance.loop);
          if (!matchingTargets.length && !hasMatchingLoop) {
            throw new Clarification(`That person is not currently ${semanticAction.predicate}ing.`);
          }
          matchingTargets.forEach((relation) => {
            const release = definition.targeting?.gesture === "contact"
              ? releaseContactPair(working, relation.sourceIds[0], relation.targetIds[0]) : [];
            append({ action: "unrelate", relationId: relation.id });
            release.forEach((move) => append({ action: "move", ...move }));
          });
          actorIds.forEach((targetId) => append({ action: "update", targetId, performance: null }));
        } else {
          currentTargets.forEach((relation) => {
            const previous = actionRegistry.find((action) => action.predicate === relation.predicate);
            const keepsContact = previous?.targeting?.gesture === "contact"
              && definition.targeting?.gesture === "contact" && relation.targetIds[0] === targetId;
            const release = previous?.targeting?.gesture === "contact" && !keepsContact
              ? releaseContactPair(working, relation.sourceIds[0], relation.targetIds[0]) : [];
            append({ action: "unrelate", relationId: relation.id });
            release.forEach((move) => append({ action: "move", ...move }));
          });
          if (!created) actorIds.forEach((targetId) => append({ action: "update", targetId, performance: definition.performance }));
          if (targetId) {
            if (actorIds.length === 1) {
              const movableIds = new Set([...createdActorIds, ...(targetCreated ? [targetId] : [])]);
              const staging = definition.targeting?.gesture === "contact" ? stageContactPair : stageTargetedPair;
              staging(working, actorIds[0], targetId, movableIds).forEach((move) => append({ action: "move", ...move }));
            }
            actorIds.forEach((sourceId) => append({ action: "relate", relation: {
              id: `relation-${scene.revision + 1}-${commands.length}`,
              kind: "actsOn", predicate: definition.predicate, preposition: semanticAction.preposition,
              sourceIds: [sourceId], targetIds: [targetId]
            } }));
          }
        }
        focus(actorIds, targetId ? [targetId] : []);
        continue;
      }
      const semanticRelation = frame.relations[0];
      if (semanticRelation && (semanticRelation.predicate === "shares" || semanticRelation.predicate === "owns")) {
        const sourceMentionId = semanticRelation.sourceMentionIds[0];
        const targetMentionId = semanticRelation.targetMentionIds[0];
        const mentionText = (mentionId: string) => frame.entities.find((mention) => mention.mentionId === mentionId)?.text
          ?? frame.references.find((mention) => mention.mentionId === mentionId)?.text ?? "";
        const sourcePhrase = mentionText(sourceMentionId);
        const targetPhrase = mentionText(targetMentionId);
        const source = /^(they|them)$/.test(sourcePhrase) ? context?.subjectIds ?? []
          : /^(she|he)$/.test(sourcePhrase) ? [resolve(sourcePhrase, working).id]
          : sourcePhrase.startsWith("the ")
          ? [resolve(sourcePhrase, working).id] : create(sourcePhrase);
        const kind = semanticRelation.predicate;
        if (!source.length || (/^(they|them)$/.test(sourcePhrase) && new Set(working.entities.filter((entity) => source.includes(entity.id)).map((entity) => entity.kind)).size !== 1)) throw new Clarification("Which group does that refer to?");
        if (kind === "owns" && source.length !== 1) throw new Clarification("Does each person own an item, or do they share the items?");
        const targets = create(targetPhrase);
        relate(kind, source, targets); focus(source, targets); continue;
      }
      const descriptionPhrases = frame.intent === "describe" && !frame.relations.length
        ? frame.entities.map((mention) => mention.text)
        : text.replace(/ (?:waiting )?in a (?:queue|line)$/, "").split(/\s+and\s+/);
      const created = descriptionPhrases.flatMap((phrase) => create(phrase));
      focus(created);
    }
    return { ok: true, script: makeScript() };
  } catch (error) {
    if (!(error instanceof Clarification)) throw error;
    return {
      ok: false,
      message: error.message,
      clause: currentClause,
      clarification: {
        code: error.code,
        question: error.message,
        alternatives: error.alternatives,
        evidenceText: currentEvidence
      }
    };
  }
}
