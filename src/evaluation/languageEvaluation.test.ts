import { describe, expect, it } from "vitest";
import corpus from "../../evaluation/synthetic-language-holdout.json";
import { evaluateLanguageCases, type LanguageEvaluationCase } from "./languageEvaluation";

describe("synthetic teacher-language conformance corpus", () => {
  it("meets every declared semantic and safety expectation", () => {
    const result = evaluateLanguageCases(corpus.cases as LanguageEvaluationCase[]);
    expect(result.failures).toEqual([]);
    expect(result.falseConfident).toBe(0);
    expect(result.passed).toBe(result.total);
    expect(result.accepted).toBeGreaterThan(0);
    expect(result.safeClarifications).toBeGreaterThan(0);
  });
});
