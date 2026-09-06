import { describe, expect, it } from "vitest";
import { interpretTeacherText } from "./interpret";
import { applyDoodleScript, initialScene } from "./scene";
import { validateDoodleScript } from "./validator";
import type { SceneState } from "./schema";

function run(text: string, scene = initialScene): SceneState {
  const result = interpretTeacherText(text, scene);
  if (!result.ok) throw new Error(result.message);
  const checked = validateDoodleScript(result.script, scene);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return applyDoodleScript(scene, checked.script);
}

function sameMeaning(canonical: string, variants: string[], scene = initialScene) {
  const expected = run(canonical, scene);
  for (const variant of variants) expect(run(variant, scene), variant).toEqual(expected);
}

describe("bounded classroom-language normalization", () => {
  it("maps common sharing introductions to the same scene", () => {
    sameMeaning("Three students share two books", [
      "Please draw three students sharing two books",
      "Could you please show me three students sharing two books?",
      "There are three students sharing two books.",
      "We have three students sharing two books",
      "I want to show three students sharing two books",
      "Let's have three students sharing two books",
      "Actually, three students are sharing two books"
    ]);
  });
  it("maps continuous and requested motion without changing its meaning", () => {
    sameMeaning("A car moves toward a person", [
      "A car is moving toward a person",
      "There is a car moving towards a person",
      "Can you make a car move toward a person?",
      "Please show me a car approaching a person"
    ]);
  });
  it("accepts conversational corrections and direct commands", () => {
    const students = run("Three students");
    sameMeaning("Make that four students", ["Actually, make that four students", "No, make that four students", "Could you please change it to four students?"], students);
    const car = run("A car");
    sameMeaning("Move the car right", ["Please move the car to the right", "Could you move the car right?"], car);
  });
  it("supports and-then as an explicit command boundary", () => {
    expect(run("Draw a car and then turn the car left")).toEqual(run("Draw a car. Turn the car left"));
  });
  it("does not remove meaning-bearing safety words or accept trailing actions", () => {
    for (const text of [
      "Could you not draw three students",
      "There might be three students",
      "I do not want three students",
      "Unless there are three students",
      "Maybe a car is moving toward a person",
      "A car is moving toward a person and crashes",
      "Please draw three students sharing two books if they agree"
    ]) expect(interpretTeacherText(text, initialScene).ok, text).toBe(false);
  });
});
