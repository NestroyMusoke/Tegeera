import type { ClarificationCode } from "../doodlescript/clarification";
import { interpretTeacherText } from "../doodlescript/interpret";
import { initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";

export interface LanguageEvaluationCase {
  id: string;
  category: string;
  text: string;
  expected: {
    outcome: "accepted" | "clarified";
    relationPredicates?: string[];
    clarificationCode?: ClarificationCode;
  };
}

export interface LanguageEvaluationResult {
  total: number;
  passed: number;
  accepted: number;
  safeClarifications: number;
  falseConfident: number;
  failures: { id: string; reason: string }[];
}

export function evaluateLanguageCases(cases: readonly LanguageEvaluationCase[]): LanguageEvaluationResult {
  const result: LanguageEvaluationResult = {
    total: cases.length,
    passed: 0,
    accepted: 0,
    safeClarifications: 0,
    falseConfident: 0,
    failures: []
  };
  for (const testCase of cases) {
    const interpretation = interpretTeacherText(testCase.text, initialScene);
    if (interpretation.ok) {
      result.accepted += 1;
      if (testCase.expected.outcome === "clarified") {
        result.falseConfident += 1;
        result.failures.push({ id: testCase.id, reason: "accepted an utterance that should have been clarified" });
        continue;
      }
      const validation = validateDoodleScript(interpretation.script, initialScene);
      if (!validation.ok) {
        result.failures.push({ id: testCase.id, reason: `generated an invalid script: ${validation.issues[0]?.message ?? "unknown issue"}` });
        continue;
      }
      const predicates = interpretation.script.commands.flatMap((command) => {
        if (command.action !== "relate") return [];
        if (command.relation.predicate) return [command.relation.predicate];
        return ["before", "causes"].includes(command.relation.kind) ? [command.relation.kind] : [];
      });
      const expected = testCase.expected.relationPredicates ?? [];
      if (JSON.stringify(predicates) !== JSON.stringify(expected)) {
        result.failures.push({ id: testCase.id, reason: `expected predicates ${expected.join(", ") || "none"}; received ${predicates.join(", ") || "none"}` });
        continue;
      }
      result.passed += 1;
      continue;
    }
    if (testCase.expected.outcome === "accepted") {
      result.failures.push({ id: testCase.id, reason: `unexpected clarification: ${interpretation.clarification.code}` });
      continue;
    }
    if (interpretation.clarification.code !== testCase.expected.clarificationCode) {
      result.failures.push({ id: testCase.id, reason: `expected ${testCase.expected.clarificationCode}; received ${interpretation.clarification.code}` });
      continue;
    }
    result.safeClarifications += 1;
    result.passed += 1;
  }
  return result;
}
