import { describe, expect, it } from "vitest";
import gold from "../../evaluation/independent-scene-gold-v1.json";
import corpusMarkdown from "../../evaluation/independent-teacher-corpus.md?raw";
import { evaluateIndependentGold, independentGoldCorpusSchema } from "./independentGold";
import { parseIndependentTeacherCorpus } from "./independentCorpus";

describe("independent semantic-scene gold annotations", () => {
  const teacherCases = parseIndependentTeacherCorpus(corpusMarkdown);

  it("validates a unique, cross-domain first annotation batch", () => {
    const parsed = independentGoldCorpusSchema.parse(gold);
    expect(parsed.cases.map(({ id }) => id)).toEqual([1, 11, 21, 31, 41, 53, 56, 60]);
    expect(new Set(parsed.cases.map(({ id }) => teacherCases.find((item) => item.id === id)?.subject))).toEqual(new Set([
      "Biology", "Physics", "Computer Science", "Mathematics", "Geography",
      "Everyday / cross-cutting / deliberately ambiguous"
    ]));
  });

  it("rejects duplicate IDs and relations whose semantic endpoints are undefined", () => {
    const duplicate = structuredClone(independentGoldCorpusSchema.parse(gold));
    duplicate.cases[1].id = duplicate.cases[0].id;
    expect(() => independentGoldCorpusSchema.parse(duplicate)).toThrow(/Gold case IDs must be unique/);

    const missingEndpoint = structuredClone(independentGoldCorpusSchema.parse(gold));
    const first = missingEndpoint.cases[0];
    if (first.expected.intent !== "draw") throw new Error("Case 1 must remain a drawing expectation");
    first.expected.relations[0].target = "unregistered-concept";
    expect(() => independentGoldCorpusSchema.parse(missingEndpoint)).toThrow(/Unknown relation endpoint/);
  });

  it("marks case 1 false-confident instead of calling schema validity correctness", () => {
    const result = evaluateIndependentGold(teacherCases, gold);
    const caseOne = result.results.find(({ id }) => id === 1);
    expect(caseOne).toMatchObject({ passed: false, observedIntent: "draw", falseConfident: true });
    expect(caseOne?.failures).toEqual(expect.arrayContaining([
      "missing concept: roots",
      "missing concept: leaves",
      "missing concept: water",
      "missing concept: sunlight",
      "missing relation: water -flowsInto-> roots",
      "unverified visual cue: visible-roots"
    ]));
  });

  it("reports every dimension honestly without requiring the current engine to pass", () => {
    const result = evaluateIndependentGold(teacherCases, gold);
    expect(result.total).toBe(8);
    expect(result.results).toHaveLength(8);
    expect(result.passed).toBeLessThan(result.total);
    expect(result.falseConfident).toBeGreaterThan(0);
    for (const caseResult of result.results) {
      expect(caseResult.passed || caseResult.failures.length > 0).toBe(true);
    }
    console.info(`Independent gold batch: passed=${result.passed}/${result.total}, falseConfident=${result.falseConfident}.`);
  });

  it("cannot turn an incomplete semantic graph into a pass with visual-cue claims", () => {
    const caseOne = independentGoldCorpusSchema.parse(gold).cases[0];
    if (caseOne.expected.intent !== "draw") throw new Error("Case 1 must remain a drawing expectation");
    const observations = { 1: { visualCueIds: caseOne.expected.visualCues } };
    const result = evaluateIndependentGold(teacherCases, gold, observations).results.find(({ id }) => id === 1);
    expect(result).toMatchObject({ passed: false, falseConfident: true });
    expect(result?.failures.some((failure) => failure.startsWith("missing concept:"))).toBe(true);
    expect(result?.failures.some((failure) => failure.startsWith("unverified visual cue:"))).toBe(false);
  });
});
