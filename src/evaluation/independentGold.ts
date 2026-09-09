import { z } from "zod";
import type { ClarificationCode } from "../doodlescript/clarification";
import { interpretTeacherText } from "../doodlescript/interpret";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import type { SceneRelation, SceneState } from "../doodlescript/schema";
import { validateDoodleScript } from "../doodlescript/validator";
import type { IndependentTeacherCase } from "./independentCorpus";

export const INDEPENDENT_GOLD_SCHEMA_VERSION = "1.0.0";

const conceptSchema = z.object({
  key: z.string().min(1),
  labels: z.array(z.string().min(1)).min(1)
}).strict();

const requiredRelationSchema = z.object({
  predicate: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1)
}).strict();

const drawExpectationSchema = z.object({
  intent: z.literal("draw"),
  requiresHumanVisualReview: z.literal(true),
  visualGrammar: z.string().min(1),
  concepts: z.array(conceptSchema).min(1),
  relations: z.array(requiredRelationSchema),
  visualCues: z.array(z.string().min(1)).min(1)
}).strict().superRefine((expected, context) => {
  const keys = expected.concepts.map(({ key }) => key);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", message: "Concept keys must be unique." });
  for (const relation of expected.relations) {
    if (!keys.includes(relation.source) || !keys.includes(relation.target)) {
      context.addIssue({ code: "custom", message: `Unknown relation endpoint in ${relation.source} -> ${relation.target}.` });
    }
  }
});

const clarifyExpectationSchema = z.object({
  intent: z.literal("clarify"),
  clarificationCodes: z.array(z.enum([
    "empty-input", "negated-claim", "conditional-claim", "uncertain-claim",
    "ambiguous-meaning", "ambiguous-reference", "missing-quantity", "layout-limit",
    "conflicting-scene", "unsupported-meaning"
  ])).min(1)
}).strict();

const holdExpectationSchema = z.object({ intent: z.literal("hold") }).strict();

const goldCaseSchema = z.object({
  id: z.number().int().min(1).max(60),
  expected: z.discriminatedUnion("intent", [drawExpectationSchema, clarifyExpectationSchema, holdExpectationSchema])
}).strict();

export const independentGoldCorpusSchema = z.object({
  schemaVersion: z.literal(INDEPENDENT_GOLD_SCHEMA_VERSION),
  annotationStatus: z.literal("development-conformance"),
  cases: z.array(goldCaseSchema).min(1)
}).strict().superRefine((corpus, context) => {
  const ids = corpus.cases.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "Gold case IDs must be unique." });
});

export type IndependentGoldCorpus = z.infer<typeof independentGoldCorpusSchema>;
export type IndependentGoldCase = IndependentGoldCorpus["cases"][number];
export type IndependentExpectedIntent = IndependentGoldCase["expected"]["intent"];
type DrawExpectation = z.infer<typeof drawExpectationSchema>;
type DrawGoldCase = { id: number; expected: DrawExpectation };

export interface IndependentGoldObservation {
  visualCueIds?: readonly string[];
  visualGrammarId?: string;
  humanVisualReview?: "approved" | "rejected";
}

export interface IndependentGoldCaseResult {
  id: number;
  passed: boolean;
  expectedIntent: IndependentExpectedIntent;
  observedIntent: "draw" | "clarify";
  falseConfident: boolean;
  automatedReady: boolean;
  failures: string[];
}

export interface IndependentGoldResult {
  total: number;
  passed: number;
  falseConfident: number;
  automatedReady: number;
  results: IndependentGoldCaseResult[];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function entityLabel(scene: SceneState, entityId: string): string {
  const entity = scene.entities.find(({ id }) => id === entityId);
  return normalize(entity?.label ?? entity?.kind ?? "").replace(/ \d+$/, "");
}

function relationPredicate(relation: SceneRelation): string {
  return relation.predicate ?? relation.kind;
}

function scoreDraw(
  goldCase: DrawGoldCase,
  statement: string,
  observation: IndependentGoldObservation
): IndependentGoldCaseResult {
  const interpretation = interpretTeacherText(statement, initialScene);
  if (!interpretation.ok) {
    return {
      id: goldCase.id, passed: false, expectedIntent: "draw", observedIntent: "clarify",
      falseConfident: false, automatedReady: false, failures: [`unexpected clarification: ${interpretation.clarification.code}`]
    };
  }
  const validation = validateDoodleScript(interpretation.script, initialScene);
  if (!validation.ok) {
    return {
      id: goldCase.id, passed: false, expectedIntent: "draw", observedIntent: "draw",
      falseConfident: true, automatedReady: false, failures: [`invalid DoodleScript: ${validation.issues[0]?.message ?? "unknown issue"}`]
    };
  }
  const scene = applyDoodleScript(initialScene, validation.script);
  const failures: string[] = [];
  const matchedIds = new Map<string, string>();
  const claimedIds = new Set<string>();
  for (const concept of goldCase.expected.concepts) {
    const aliases = concept.labels.map(normalize);
    const entity = scene.entities.find((candidate) => !claimedIds.has(candidate.id) && aliases.includes(entityLabel(scene, candidate.id)));
    if (!entity) failures.push(`missing concept: ${concept.key}`);
    else { matchedIds.set(concept.key, entity.id); claimedIds.add(entity.id); }
  }
  for (const required of goldCase.expected.relations) {
    const sourceId = matchedIds.get(required.source);
    const targetId = matchedIds.get(required.target);
    const found = sourceId && targetId && (scene.relations ?? []).some((relation) =>
      relationPredicate(relation) === required.predicate
      && relation.sourceIds.includes(sourceId)
      && relation.targetIds.includes(targetId));
    if (!found) failures.push(`missing relation: ${required.source} -${required.predicate}-> ${required.target}`);
  }
  const observedCues = new Set(observation.visualCueIds ?? []);
  if (observation.visualGrammarId !== goldCase.expected.visualGrammar) {
    failures.push(`unverified visual grammar: ${goldCase.expected.visualGrammar}`);
  }
  for (const cue of goldCase.expected.visualCues) if (!observedCues.has(cue)) failures.push(`unverified visual cue: ${cue}`);
  const automatedReady = failures.length === 0;
  if (goldCase.expected.requiresHumanVisualReview && observation.humanVisualReview !== "approved") {
    failures.push(observation.humanVisualReview === "rejected" ? "human visual review rejected" : "human visual review pending");
  }
  return {
    id: goldCase.id, passed: failures.length === 0, expectedIntent: "draw", observedIntent: "draw",
    falseConfident: !automatedReady, automatedReady, failures
  };
}

export function evaluateIndependentGold(
  teacherCases: readonly IndependentTeacherCase[],
  input: unknown,
  observations: Readonly<Record<number, IndependentGoldObservation>> = {}
): IndependentGoldResult {
  const corpus = independentGoldCorpusSchema.parse(input);
  const teacherById = new Map(teacherCases.map((item) => [item.id, item] as const));
  const results: IndependentGoldCaseResult[] = corpus.cases.map((goldCase) => {
    const teacherCase = teacherById.get(goldCase.id);
    if (!teacherCase) return {
      id: goldCase.id, passed: false, expectedIntent: goldCase.expected.intent,
      observedIntent: "clarify", falseConfident: false, automatedReady: false, failures: ["teacher statement is missing"]
    };
    if (goldCase.expected.intent === "draw") return scoreDraw(
      { id: goldCase.id, expected: goldCase.expected },
      teacherCase.statement,
      observations[goldCase.id] ?? {}
    );
    const interpretation = interpretTeacherText(teacherCase.statement, initialScene);
    if (goldCase.expected.intent === "hold") return {
      id: goldCase.id, passed: false, expectedIntent: "hold",
      observedIntent: interpretation.ok ? "draw" : "clarify",
      falseConfident: interpretation.ok, automatedReady: false, failures: [interpretation.ok
        ? "changed the scene when the utterance should be non-visual"
        : `clarified instead of preserving the scene: ${interpretation.clarification.code}`]
    };
    if (interpretation.ok) return {
      id: goldCase.id, passed: false, expectedIntent: "clarify", observedIntent: "draw",
      falseConfident: true, automatedReady: false, failures: ["accepted an utterance that requires clarification"]
    };
    const received = interpretation.clarification.code as ClarificationCode;
    const passed = goldCase.expected.clarificationCodes.includes(received);
    return {
      id: goldCase.id, passed, expectedIntent: "clarify", observedIntent: "clarify",
      falseConfident: false, automatedReady: passed, failures: passed ? [] : [`expected ${goldCase.expected.clarificationCodes.join(" or ")}; received ${received}`]
    };
  });
  return {
    total: results.length,
    passed: results.filter(({ passed }) => passed).length,
    falseConfident: results.filter(({ falseConfident }) => falseConfident).length,
    automatedReady: results.filter(({ automatedReady }) => automatedReady).length,
    results
  };
}
