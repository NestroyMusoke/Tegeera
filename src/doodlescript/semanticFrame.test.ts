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
    expect(frame.entities.map(({ conceptId, category }) => ({ conceptId, category }))).toEqual([
      { conceptId: "student", category: "actor" },
      { conceptId: "book", category: "object" }
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

  it("extracts registered directional roles before scene interpretation", () => {
    const frame = analyzeTeacherInput("A student walks towards a school").frames[0];
    expect(frame.relations).toEqual([{
      predicate: "toward", relationPredicate: "walk", sourceCapability: "walk",
      sourceMentionIds: [frame.entities[0].mentionId],
      targetMentionIds: [frame.entities[1].mentionId]
    }]);
    expect(frame.entities.map(({ kind }) => kind)).toEqual(["student", "building"]);
    expect(frame.resolutionStatus).toBe("resolved");
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
      clause: "...",
      clarification: {
        code: "empty-input",
        question: "Explain one short scene or change, up to 500 characters.",
        alternatives: [],
        evidenceText: "..."
      }
    });
  });

  it("keeps competing parser meanings explicit instead of choosing by priority", async () => {
    const { meaningIsAmbiguous } = await import("./semanticFrame");
    expect(meaningIsAmbiguous([
      { family: "human-action", predicate: "hold" },
      { family: "visual-action", predicate: "absorb" }
    ])).toBe(true);
    expect(meaningIsAmbiguous([
      { family: "visual-action", predicate: "absorb" },
      { family: "visual-action", predicate: "absorb" }
    ])).toBe(false);
  });

  it("preserves the lowercase failed-clause contract of the legacy adapter", () => {
    const result = interpretTeacherText("A Student then A DRAGON", initialScene);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.clause).toBe("a dragon");
  });

  it("keeps registered visual actions separate from human performances", () => {
    const frame = analyzeTeacherInput("Water evaporates into a cloud").frames[0];
    expect(frame.actions).toEqual([]);
    expect(frame.visualActions).toHaveLength(1);
    expect(frame.visualActions[0].predicate).toBe("evaporate");
    expect(frame.visualActions[0].preposition).toBe("into");
  });

  it("extracts reusable part-whole-flow roles before generic direct intake", () => {
    const frame = analyzeTeacherInput("A machine takes in fuel through its inlet and air through its vent").frames[0];
    expect(frame.visualActions).toEqual([]);
    expect(frame.compositions).toEqual([{
      construction: "part-whole-flow",
      wholeMentionId: frame.entities[0].mentionId,
      channels: [
        { inputMentionId: frame.entities[1].mentionId, partMentionId: frame.entities[2].mentionId, flowPredicate: "flowsInto" },
        { inputMentionId: frame.entities[3].mentionId, partMentionId: frame.entities[4].mentionId, flowPredicate: "flowsInto" }
      ]
    }]);
    expect(frame.meaningCandidates).toEqual([{ family: "composition", predicate: "part-whole-flow" }]);
  });

  it("extracts labelled containment roles before generic description", () => {
    const frame = analyzeTeacherInput("A specimen jar is a labelled container that contains a sample").frames[0];
    expect(frame.containments).toEqual([{
      construction: "labelled-container",
      containerMentionId: frame.entities[0].mentionId,
      contentMentionId: frame.entities[1].mentionId,
      shape: "container"
    }]);
    expect(frame.meaningCandidates).toEqual([{ family: "containment", predicate: "labelled-container" }]);
    expect(frame.resolutionStatus).toBe("resolved");
  });

  it("extracts numeric angular construction roles without turning the analogy into an entity", () => {
    const frame = analyzeTeacherInput("A right angle is exactly ninety degrees, like the corner of a square").frames[0];
    expect(frame.geometricConstructions).toEqual([{
      construction: "geometric-construction",
      subjectMentionId: frame.entities[0].mentionId,
      measurementMentionId: frame.entities[1].mentionId,
      degrees: 90
    }]);
    expect(frame.entities.map(({ text }) => text)).toEqual(["right angle", "ninety degrees"]);
    expect(frame.meaningCandidates).toEqual([{ family: "geometry", predicate: "geometric-construction" }]);
  });

  it("extracts landscape roles before generic flow language", () => {
    const frame = analyzeTeacherInput("A stream runs downhill from a mountain into a lake").frames[0];
    expect(frame.landscapeFlows).toEqual([{
      construction: "landscape-flow",
      watercourseMentionId: frame.entities[0].mentionId,
      sourceMentionId: frame.entities[1].mentionId,
      destinationMentionId: frame.entities[2].mentionId
    }]);
    expect(frame.entities.map(({ text }) => text)).toEqual(["stream", "mountain", "lake"]);
    expect(frame.meaningCandidates).toEqual([{ family: "landscape", predicate: "landscape-flow" }]);
  });

  it("expands coordinated objects and explicitly inherits one unambiguous subject", () => {
    const result = analyzeTeacherInput("A plant absorbs sunlight and water, then produces oxygen");
    expect(result.frames).toHaveLength(2);
    expect(result.frames[0].visualActions.map((action) => action.predicate)).toEqual(["absorb", "absorb"]);
    expect(result.frames[0].visualActions.map((action) => action.objectMentionId)).toEqual([
      result.frames[0].entities[1].mentionId,
      result.frames[0].entities[2].mentionId
    ]);
    expect(result.frames[1].visualActions).toEqual([expect.objectContaining({
      predicate: "produce",
      subjectMentionId: result.frames[0].entities[0].mentionId,
      inheritedSubjectFromFrameId: result.frames[0].frameId
    })]);
    expect(result.frames[1].evidence[0].text).toBe("produces oxygen");
  });

  it("does not invent a subject for an isolated or unsafe elided action", () => {
    expect(analyzeTeacherInput("Produces oxygen").frames[0].visualActions).toEqual([]);
    const uncertain = analyzeTeacherInput("A plant absorbs sunlight, then maybe produces oxygen");
    expect(uncertain.frames[1].visualActions).toEqual([]);
    expect(uncertain.frames[1].discourse.uncertain).toBe(true);
  });

  it("exposes safety intents before attempting drawable semantic resolution", () => {
    const comparison = analyzeTeacherInput("Imagine two things happening at once, but one is faster").frames[0];
    const prior = analyzeTeacherInput("It is the opposite of what we did yesterday").frames[0];
    const hold = analyzeTeacherInput("Let us take a break before we continue").frames[0];
    expect(comparison).toMatchObject({ intent: "unresolved", safetyIntent: { kind: "ambiguous-comparison" }, resolutionStatus: "needs-clarification" });
    expect(prior).toMatchObject({ intent: "unresolved", safetyIntent: { kind: "unresolved-prior-context" }, resolutionStatus: "needs-clarification" });
    expect(hold).toMatchObject({ intent: "hold", safetyIntent: { kind: "non-visual-hold" }, resolutionStatus: "resolved" });
    expect(hold.entities).toEqual([]);
  });

  it("extracts closed transport roles before generic action parsing", () => {
    const frame = analyzeTeacherInput("A pump sends water to a filter, and the filter returns it back with minerals").frames[0];
    expect(frame.circulationLoops).toEqual([{
      construction: "circulation-loop",
      sourceMentionId: frame.entities[0].mentionId,
      destinationMentionId: frame.entities[1].mentionId,
      payloadMentionId: frame.entities[2].mentionId,
      enrichmentMentionId: frame.entities[3].mentionId
    }]);
    expect(frame.entities.map(({ text }) => text)).toEqual(["pump", "filter", "water", "minerals"]);
    expect(frame.meaningCandidates).toEqual([{ family: "circulation", predicate: "circulation-loop" }]);
  });

  it("keeps a changing-speed trajectory atomic across its then boundary", () => {
    const result = analyzeTeacherInput("A stone tossed straight up decelerates, pauses briefly, then drops back increasingly fast");
    expect(result.frames).toHaveLength(1);
    const frame = result.frames[0];
    expect(frame.changingSpeedMotions).toEqual([{
      construction: "changing-speed-motion",
      objectMentionId: frame.entities[0].mentionId,
      apexMentionId: frame.entities[1].mentionId,
      forceMentionId: frame.entities[2].mentionId
    }]);
    expect(frame.entities.map(({ text }) => text)).toEqual(["stone", "highest point", "gravity"]);
    expect(frame.meaningCandidates).toEqual([{ family: "kinematics", predicate: "changing-speed-motion" }]);
  });

  it("keeps a function call and return atomic across its then boundary", () => {
    const result = analyzeTeacherInput("When you call a function, the program jumps to that function, runs it, then comes back to where it left off");
    expect(result.frames).toHaveLength(1);
    const frame = result.frames[0];
    expect(frame.callReturnFlows).toEqual([{
      construction: "call-return-flow",
      callerMentionId: frame.entities[0].mentionId,
      functionMentionId: frame.entities[1].mentionId,
      callSiteMentionId: frame.entities[2].mentionId
    }]);
    expect(frame.entities.map(({ text }) => text)).toEqual(["program", "function", "call site"]);
    expect(frame.meaningCandidates).toEqual([{ family: "control-flow", predicate: "call-return-flow" }]);
  });
});
