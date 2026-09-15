import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "../doodlescript/interpret";
import { initialScene } from "../doodlescript/scene";
import { validateDoodleScript } from "../doodlescript/validator";
import { allTestedPhrases, showcaseExamples } from "./showcaseExamples";

describe("public demonstrated examples", () => {
  it("keeps every published example locally accepted and validator-safe", () => {
    for (const text of showcaseExamples) {
      const interpretation = interpretTeacherText(text, initialScene);
      expect(interpretation.ok, text).toBe(true);
      if (interpretation.ok) expect(validateDoodleScript(interpretation.script, initialScene).ok, text).toBe(true);
    }
  });

  it("publishes the complete accepted generalization library", () => {
    expect(allTestedPhrases).toHaveLength(278);
    expect(new Set(allTestedPhrases.map(({ id }) => id)).size).toBe(278);
  });
});
