import { describe, expect, it } from "vitest";
import corpusMarkdown from "../../evaluation/independent-teacher-corpus.md?raw";
import { interpretTeacherText } from "../doodlescript/interpret";
import { initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { parseIndependentTeacherCorpus } from "./independentCorpus";

describe("independent teacher corpus", () => {
  const cases = parseIndependentTeacherCorpus(corpusMarkdown);

  it("preserves all independent statements and intended visuals", () => {
    expect(cases).toHaveLength(60);
    expect(cases.map(({ id }) => id)).toEqual(Array.from({ length: 60 }, (_, index) => index + 1));
    expect(new Set(cases.map(({ statement }) => statement).map((text) => text.toLowerCase())).size).toBe(60);
    expect(cases.every(({ subject, statement, intendedVisual }) => subject && statement && intendedVisual)).toBe(true);
    expect(Object.fromEntries(["E", "M", "H"].map((difficulty) => [
      difficulty, cases.filter((item) => item.difficulty === difficulty).length
    ]))).toEqual({ E: 23, M: 23, H: 14 });
    expect(Object.fromEntries([...new Set(cases.map(({ subject }) => subject))].map((subject) => [
      subject, cases.filter((item) => item.subject === subject).length
    ]))).toEqual({
      Biology: 10,
      Physics: 10,
      "Computer Science": 10,
      Mathematics: 10,
      Geography: 10,
      "Everyday / cross-cutting / deliberately ambiguous": 10
    });
  });

  it("keeps current coverage observational and every accepted script valid", () => {
    const outcomes = cases.map((item) => ({ item, result: interpretTeacherText(item.statement, initialScene) }));
    const accepted = outcomes.filter((outcome) => outcome.result.ok);
    const held = accepted.filter((outcome) => outcome.result.ok && outcome.result.script.commands.length === 1 && outcome.result.script.commands[0].action === "hold");
    const drawn = accepted.filter((outcome) => !held.includes(outcome));
    for (const outcome of accepted) {
      if (!outcome.result.ok) continue;
      expect(validateDoodleScript(outcome.result.script, initialScene), `case ${outcome.item.id}`).toMatchObject({ ok: true });
    }
    console.info(`Independent corpus baseline: drawn=${drawn.length}/60, held=${held.length}/60, clarified=${60 - accepted.length}/60. Semantic correctness requires intended-visual review.`);
    expect(outcomes).toHaveLength(60);
  });
});
