import { normalizeTeacherClause } from "./language";
import { parseEntityPhrase, relationLexemes } from "./lexicon";

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

  const relationship = frame.normalizedText.match(relationshipPattern);
  if (relationship) {
    const sourceMentionId = addParticipant(relationship[1]);
    const targetMentionId = addParticipant(relationship[3]);
    const predicate = relationLexemes.find(({ words }) => (words as readonly string[]).includes(relationship[2]))?.predicate;
    if (!predicate) return;
    frame.intent = "describe";
    frame.relations.push({ predicate, sourceMentionIds: [sourceMentionId], targetMentionIds: [targetMentionId] });
    frame.resolutionStatus = entityMentionsAreResolved(frame) ? "resolved" : "needs-clarification";
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
