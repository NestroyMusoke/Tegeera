import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import gold from "../../evaluation/independent-scene-gold-v1.json";
import corpusMarkdown from "../../evaluation/independent-teacher-corpus.md?raw";
import { DoodleCanvas } from "../components/DoodleCanvas";
import { interpretTeacherText } from "../doodlescript/interpret";
import { applyDoodleScript, initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { evaluateIndependentGold, independentGoldCorpusSchema } from "./independentGold";
import { parseIndependentTeacherCorpus } from "./independentCorpus";

describe("independent semantic-scene gold annotations", () => {
  const teacherCases = parseIndependentTeacherCorpus(corpusMarkdown);
  const observeCase = (id: number) => {
    const teacherCase = teacherCases.find((item) => item.id === id)!;
    const interpreted = interpretTeacherText(teacherCase.statement, initialScene);
    if (!interpreted.ok) throw new Error(interpreted.message);
    const checked = validateDoodleScript(interpreted.script, initialScene);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    const html = renderToStaticMarkup(createElement(DoodleCanvas, { scene: applyDoodleScript(initialScene, checked.script) }));
    const visualCueIds = [...html.matchAll(/data-visual-cue="([^"]+)"/g)]
      .flatMap((match) => match[1].split(/\s+/)).filter(Boolean);
    const visualGrammarId = html.match(/data-relation-layout="([^"]+)"/)?.[1];
    return { visualCueIds, visualGrammarId };
  };

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

  it("does not pass case 1 without observed visual evidence", () => {
    const result = evaluateIndependentGold(teacherCases, gold);
    const caseOne = result.results.find(({ id }) => id === 1);
    expect(caseOne).toMatchObject({ passed: false, observedIntent: "draw", falseConfident: true });
    expect(caseOne?.failures).toEqual(expect.arrayContaining([
      "unverified visual grammar: part-whole-flow",
      "unverified visual cue: visible-roots"
    ]));
    expect(caseOne?.failures.some((failure) => failure.startsWith("missing concept:"))).toBe(false);
    expect(caseOne?.failures.some((failure) => failure.startsWith("missing relation:"))).toBe(false);
  });

  it("reports every dimension honestly without requiring the current engine to pass", () => {
    const result = evaluateIndependentGold(teacherCases, gold, { 1: observeCase(1), 11: observeCase(11) });
    expect(result.total).toBe(8);
    expect(result.results).toHaveLength(8);
    expect(result.passed).toBeLessThan(result.total);
    expect(result.results.find(({ id }) => id === 1)).toMatchObject({
      passed: false, falseConfident: false, automatedReady: true,
      failures: ["human visual review pending"]
    });
    for (const caseResult of result.results) {
      expect(caseResult.passed || caseResult.failures.length > 0).toBe(true);
    }
    console.info(`Independent gold batch: passed=${result.passed}/${result.total}, automatedReady=${result.automatedReady}, falseConfident=${result.falseConfident}.`);
  });

  it("requires explicit human approval after its real grammar and cues are observed", () => {
    const observation = observeCase(1);
    expect(new Set(observation.visualCueIds)).toEqual(new Set([
      "visible-roots", "soil-boundary", "water-entry-arrow", "sun-symbol", "leaf-targeted-ray"
    ]));
    expect(observation.visualGrammarId).toBe("part-whole-flow");
    expect(evaluateIndependentGold(teacherCases, gold, { 1: observation }).results.find(({ id }) => id === 1))
      .toMatchObject({ passed: false, falseConfident: false, automatedReady: true, failures: ["human visual review pending"] });
    expect(evaluateIndependentGold(teacherCases, gold, {
      1: { ...observation, humanVisualReview: "approved" }
    }).results.find(({ id }) => id === 1)).toMatchObject({
      passed: true, falseConfident: false, automatedReady: true, failures: []
    });
  });

  it("makes case 11 automated-ready while preserving human visual review", () => {
    const observation = observeCase(11);
    expect(new Set(observation.visualCueIds)).toEqual(new Set([
      "surface-line", "forward-force-arrow", "opposing-friction-arrow", "friction-arrow-smaller", "slowing-motion"
    ]));
    expect(observation.visualGrammarId).toBe("force-diagram");
    expect(evaluateIndependentGold(teacherCases, gold, { 11: observation }).results.find(({ id }) => id === 11))
      .toMatchObject({ passed: false, falseConfident: false, automatedReady: true, failures: ["human visual review pending"] });
  });
});
