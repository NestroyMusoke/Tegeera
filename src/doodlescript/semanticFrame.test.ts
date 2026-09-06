import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { analyzeTeacherInput } from "./semanticFrame";
import type { SceneState } from "./schema";

const initialScene: SceneState = { sceneId: "welcome", revision: 0, entities: [], relations: [] };

describe("semantic input frames", () => {
  it("preserves evidence spans while normalizing each clause", () => {
    const source = "  Imagine a Student; please draw a BOOK.  ";
    const result = analyzeTeacherInput(source);

    expect(result.frames.map((frame) => frame.sourceText)).toEqual([
      "Imagine a Student",
      "please draw a BOOK"
    ]);
    expect(result.frames.map((frame) => frame.normalizedText)).toEqual([
      "a student",
      "a book"
    ]);
    for (const frame of result.frames) {
      const evidence = frame.evidence[0];
      expect(source.slice(evidence.start, evidence.end)).toBe(evidence.text);
    }
  });

  it("records unsafe discourse without pretending to resolve its meaning", () => {
    const [negated, conditional, uncertain] = [
      analyzeTeacherInput("Do not draw a car").frames[0],
      analyzeTeacherInput("If there is a teacher, add a book").frames[0],
      analyzeTeacherInput("Maybe draw a tree").frames[0]
    ];

    expect(negated.discourse.negated).toBe(true);
    expect(conditional.discourse.conditional).toBe(true);
    expect(uncertain.discourse.uncertain).toBe(true);
    expect(negated.resolutionStatus).toBe("surface");
    expect(negated.entities).toEqual([]);
  });

  it("distinguishes a polite request from an uncertain claim", () => {
    const polite = analyzeTeacherInput("Could you please show me two students sharing a book?").frames[0];
    const uncertain = analyzeTeacherInput("A car could approach a person").frames[0];

    expect(polite.discourse.uncertain).toBe(false);
    expect(polite.resolutionStatus).toBe("resolved");
    expect(uncertain.discourse.uncertain).toBe(true);
    expect(uncertain.resolutionStatus).toBe("surface");
  });

  it("extracts reusable entity, quantity and relation meaning", () => {
    const frame = analyzeTeacherInput("Two learners share three books").frames[0];

    expect(frame.intent).toBe("describe");
    expect(frame.resolutionStatus).toBe("resolved");
    expect(frame.entities.map(({ text, kind }) => ({ text, kind }))).toEqual([
      { text: "two learners", kind: "student" },
      { text: "three books", kind: "book" }
    ]);
    expect(frame.quantities.map(({ value }) => value)).toEqual([2, 3]);
    expect(frame.relations).toEqual([{
      predicate: "shares",
      sourceMentionIds: [frame.entities[0].mentionId],
      targetMentionIds: [frame.entities[1].mentionId]
    }]);
  });

  it("keeps references explicit for the scene resolver", () => {
    const frame = analyzeTeacherInput("They have a book").frames[0];

    expect(frame.references).toEqual([{
      mentionId: "frame-1-mention-1",
      text: "they",
      resolvedEntityIds: []
    }]);
    expect(frame.relations[0].sourceMentionIds).toEqual([frame.references[0].mentionId]);
  });

  it("gives equivalent relationship paraphrases equal semantic content", () => {
    const project = (text: string) => {
      const frame = analyzeTeacherInput(text).frames[0];
      return {
        intent: frame.intent,
        entities: frame.entities.map(({ mentionId, kind }) => ({ mentionId: mentionId.replace(/^frame-\d+/, "frame"), kind })),
        quantities: frame.quantities.map(({ mentionId, value }) => ({ mentionId: mentionId.replace(/^frame-\d+/, "frame"), value })),
        relations: frame.relations.map((relation) => ({
          ...relation,
          sourceMentionIds: relation.sourceMentionIds.map((id) => id.replace(/^frame-\d+/, "frame")),
          targetMentionIds: relation.targetMentionIds.map((id) => id.replace(/^frame-\d+/, "frame"))
        }))
      };
    };

    expect(project("Two students share three books")).toEqual(project("There are two learners sharing three books"));
  });

  it("recognizes a plural concept without inventing its missing quantity", () => {
    const frame = analyzeTeacherInput("Students share books").frames[0];

    expect(frame.entities.map(({ kind }) => kind)).toEqual(["student", "book"]);
    expect(frame.resolutionStatus).toBe("needs-clarification");
    expect(interpretTeacherText("Students share books", initialScene).ok).toBe(false);
  });

  it("keeps established multi-clause interpretation output stable", () => {
    const source = "A student then a book.";
    const result = interpretTeacherText(source, initialScene);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script.sourceText).toBe(source);
    expect(result.script.commands.map((command) => command.action)).toEqual(["create", "create"]);
    expect(result.script.commands.map((command) => command.action === "create" && command.entity.kind)).toEqual([
      "student",
      "book"
    ]);
  });

  it("does not turn punctuation-only input into an empty successful scene", () => {
    const result = interpretTeacherText("...", initialScene);

    expect(result).toEqual({
      ok: false,
      message: "Explain one short scene or change, up to 500 characters.",
      clause: "..."
    });
  });

  it("preserves the lowercase failed-clause contract of the legacy adapter", () => {
    const result = interpretTeacherText("A Student then A DRAGON", initialScene);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.clause).toBe("a dragon");
  });
});
