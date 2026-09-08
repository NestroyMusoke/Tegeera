import { normalizeTeacherClause } from "./language";
import { parseEntityPhrase, relationLexemes } from "./lexicon";
import { actionAliases, actionForAlias, directTargetActionAliases, targetableActionAliases, targetPrepositions } from "./actionRegistry";
import { visualActionAliases, visualActionForAlias, visualActionPrepositions } from "./visualActionRegistry";

export type SemanticIntent = "unresolved" | "describe" | "add" | "remove" | "update" | "reorder" | "compare";

export interface EvidenceSpan {
  kind: "utterance";
  text: string;
  start: number;
  end: number;
}

export interface DiscourseSignals {
  negated: boolean;
  conditional: boolean;
  uncertain: boolean;
}

export interface SemanticEntityMention {
  mentionId: string;
  text: string;
  kind?: string;
}

export interface SemanticRelationMention {
  predicate: string;
  sourceMentionIds: string[];
  targetMentionIds: string[];
}

export interface SemanticActionMention {
  predicate: string;
  actorMentionIds: string[];
  targetMentionIds: string[];
  preposition?: string;
  phase: "start" | "stop";
}

export interface SemanticVisualActionMention {
  predicate: string;
  subjectMentionId: string;
  objectMentionId: string;
  preposition?: string;
}

export interface SemanticQuantity {
  mentionId: string;
  value: number;
}

export interface SemanticReference {
  mentionId: string;
  text: string;
  resolvedEntityIds: string[];
}

/**
 * The stable boundary between language input and scene interpretation.
 *
 * This first-stage frame deliberately leaves domain meaning unresolved. Future
 * extractors can populate the semantic slots without changing speech capture,
 * scene planning, validation, or rendering APIs.
 */
export interface SemanticFrame {
  frameId: string;
  sourceText: string;
  normalizedText: string;
  intent: SemanticIntent;
  entities: SemanticEntityMention[];
  relations: SemanticRelationMention[];
  actions: SemanticActionMention[];
  visualActions: SemanticVisualActionMention[];
  quantities: SemanticQuantity[];
  references: SemanticReference[];
  discourse: DiscourseSignals;
  evidence: EvidenceSpan[];
  confidence: number;
  resolutionStatus: "surface" | "resolved" | "needs-clarification";
}

export interface SemanticInput {
  sourceText: string;
  frames: SemanticFrame[];
}

const clauseSeparator = /\s*(?:[.;]|,?\s+(?:and\s+)?then\s+)\s*/g;

function discourseSignals(text: string): DiscourseSignals {
  return {
    negated: /\b(?:no|not|never|don't|doesn't|isn't|aren't|without)\b/.test(text),
    conditional: /\b(?:if|unless|provided|assuming)\b/.test(text),
    uncertain: /\b(?:maybe|perhaps|possibly|probably|might)\b/.test(text)
      || /\bcould\b(?!\s+you\b)/.test(text)
  };
}

const relationWordPattern = relationLexemes.flatMap(({ words }) => words).join("|");
const relationshipPattern = new RegExp(`^(.+?) (?:are )?(${relationWordPattern}) (.+)$`);
const referencePattern = /^(?:she|he|her|him|they|them|it|that|the .+)$/;
const actionWordPattern = actionAliases().join("|");
const actionPattern = new RegExp(`^(.+?) (?:is |are )?(${actionWordPattern})$`);
const stopActionPattern = new RegExp(`^(.+?) stops? (${actionWordPattern})$`);
const targetedActionPattern = new RegExp(`^(.+?) (?:is |are )?(${targetableActionAliases().join("|")}) (${targetPrepositions().join("|")}) (.+)$`);
const directTargetActionPattern = new RegExp(`^(.+?) (?:is |are )?(${directTargetActionAliases().join("|")}) (.+)$`);
const visualPrepositionalActionPattern = new RegExp(`^(.+?) (?:is |are )?(${visualActionAliases("prepositional").join("|")}) (${visualActionPrepositions().join("|")}) (.+)$`);
const visualDirectActionPattern = new RegExp(`^(.+?) (?:is |are )?(${visualActionAliases("direct").join("|")}) (.+)$`);

function entityMentionsAreResolved(frame: SemanticFrame): boolean {
  return frame.entities.every(({ text }) => {
    const parsed = parseEntityPhrase(text);
    return Boolean(parsed
      && parsed.count >= 1
      && parsed.count <= 12
      && (parsed.countToken || (!parsed.noun.endsWith("s") && parsed.noun !== "people")));
  });
}

function populateMeaning(frame: SemanticFrame): void {
  if (frame.discourse.negated || frame.discourse.conditional || frame.discourse.uncertain) return;

  const addParticipant = (text: string): string => {
    const mentionId = `${frame.frameId}-mention-${frame.entities.length + frame.references.length + 1}`;
    if (referencePattern.test(text)) {
      frame.references.push({ mentionId, text, resolvedEntityIds: [] });
      return mentionId;
    }
    const parsed = parseEntityPhrase(text);
    frame.entities.push({ mentionId, text, kind: parsed?.kind });
    if (parsed && parsed.count >= 0) frame.quantities.push({ mentionId, value: parsed.count });
    return mentionId;
  };

  const stoppedAction = frame.normalizedText.match(stopActionPattern);
  const targetedAction = frame.normalizedText.match(targetedActionPattern);
  const directTargetAction = frame.normalizedText.match(directTargetActionPattern);
  const startedAction = frame.normalizedText.match(actionPattern);
  const action = stoppedAction ?? targetedAction ?? directTargetAction ?? startedAction;
  if (action) {
    const definition = actionForAlias(action[2]);
    if (!definition) return;
    const actorMentionId = addParticipant(action[1]);
    const targetMentionId = targetedAction ? addParticipant(targetedAction[4])
      : directTargetAction ? addParticipant(directTargetAction[3]) : undefined;
    frame.intent = stoppedAction ? "update" : "describe";
    frame.actions.push({
      predicate: definition.predicate,
      actorMentionIds: [actorMentionId],
      targetMentionIds: targetMentionId ? [targetMentionId] : [],
      preposition: targetedAction?.[3],
      phase: stoppedAction ? "stop" : "start"
    });
    frame.resolutionStatus = entityMentionsAreResolved(frame) ? "resolved" : frame.references.length ? "surface" : "needs-clarification";
    return;
  }

  const relationship = frame.normalizedText.match(relationshipPattern);
  if (relationship) {
    const sourceMentionId = addParticipant(relationship[1]);
    const targetMentionId = addParticipant(relationship[3]);
    const predicate = relationLexemes.find(({ words }) => (words as readonly string[]).includes(relationship[2]))?.predicate;
    if (!predicate) return;
    frame.intent = "describe";
    frame.relations.push({ predicate, sourceMentionIds: [sourceMentionId], targetMentionIds: [targetMentionId] });
    const openConceptRelation = ["before", "after", "causes"].includes(predicate);
    const conceptSlotsAreReadable = [...frame.entities, ...frame.references]
      .every(({ text }) => text.length <= 40 && text.split(/\s+/).length <= 7 && /^[a-z0-9][a-z0-9 '-]*$/.test(text));
    frame.resolutionStatus = entityMentionsAreResolved(frame) || (openConceptRelation && conceptSlotsAreReadable)
      ? "resolved" : "needs-clarification";
    return;
  }

  const visualPrepositionalAction = frame.normalizedText.match(visualPrepositionalActionPattern);
  const visualDirectAction = frame.normalizedText.match(visualDirectActionPattern);
  const visualAction = visualPrepositionalAction ?? visualDirectAction;
  if (visualAction) {
    const definition = visualActionForAlias(visualAction[2]);
    if (!definition) return;
    const subjectMentionId = addParticipant(visualAction[1]);
    const objectMentionId = addParticipant(visualPrepositionalAction ? visualAction[4] : visualAction[3]);
    const mentions = [...frame.entities, ...frame.references];
    const readable = mentions.every(({ text }) => text.length <= 40 && text.split(/\s+/).length <= 7
      && /^[a-z0-9][a-z0-9 '-]*$/.test(text));
    frame.intent = "describe";
    frame.visualActions.push({
      predicate: definition.predicate,
      subjectMentionId,
      objectMentionId,
      preposition: visualPrepositionalAction?.[3]
    });
    frame.resolutionStatus = readable ? "resolved" : "needs-clarification";
    return;
  }

  const description = frame.normalizedText.replace(/ (?:waiting )?in a (?:queue|line)$/, "");
  const phrases = description.split(/\s+and\s+/);
  const parsed = phrases.map((phrase) => parseEntityPhrase(phrase));
  if (!parsed.every(Boolean)) return;
  phrases.forEach(addParticipant);
  frame.intent = "describe";
  frame.resolutionStatus = entityMentionsAreResolved(frame) ? "resolved" : "needs-clarification";
}

export function analyzeTeacherInput(input: string): SemanticInput {
  const leadingWhitespace = input.length - input.trimStart().length;
  const trimmed = input.trim();
  const terminalPunctuation = trimmed.match(/[.!?]+$/)?.[0].length ?? 0;
  const body = terminalPunctuation ? trimmed.slice(0, -terminalPunctuation) : trimmed;
  const frames: SemanticFrame[] = [];
  let cursor = 0;

  const addFrame = (rawStart: number, rawEnd: number) => {
    const raw = body.slice(rawStart, rawEnd);
    const leftPadding = raw.length - raw.trimStart().length;
    const sourceText = raw.trim();
    if (!sourceText) return;
    const start = leadingWhitespace + rawStart + leftPadding;
    const normalizedSource = sourceText.toLowerCase().replace(/^imagine\s+/, "");
    const frame: SemanticFrame = {
      frameId: `frame-${frames.length + 1}`,
      sourceText,
      normalizedText: normalizeTeacherClause(normalizedSource),
      intent: "unresolved",
      entities: [],
      relations: [],
      actions: [],
      visualActions: [],
      quantities: [],
      references: [],
      discourse: discourseSignals(normalizedSource),
      evidence: [{ kind: "utterance", text: sourceText, start, end: start + sourceText.length }],
      confidence: 1,
      resolutionStatus: "surface"
    };
    populateMeaning(frame);
    frames.push(frame);
  };

  for (const separator of body.matchAll(clauseSeparator)) {
    const separatorStart = separator.index ?? cursor;
    addFrame(cursor, separatorStart);
    cursor = separatorStart + separator[0].length;
  }
  addFrame(cursor, body.length);

  return { sourceText: input, frames };
}
