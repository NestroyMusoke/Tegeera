import { test } from "node:test";
import assert from "node:assert/strict";
import { strokePrompt, validStrokes } from "./engine.mjs";
import { STROKE_DRAWING_RULES, STROKE_LANGUAGE_EXAMPLES } from "../shared/strokeDrawingRules.mjs";

const stroke = { part: "outline", color: "#2f3e46", pts: [[8,8],[42,8],[42,42],[8,42],[8,8]] };
test("all prompt demonstrations satisfy the same backend stroke boundary", () => {
  for (const { strokes } of STROKE_LANGUAGE_EXAMPLES) assert.equal(validStrokes({ strokes }), true);
});
test("stroke protocol accepts legacy, straight and curved paths", () => {
  for (const interpolation of [undefined, "linear", "smooth"]) {
    assert.equal(validStrokes({ strokes: [{ ...stroke, ...(interpolation ? { interpolation } : {}) }] }), true);
  }
});
test("stroke protocol rejects unknown interpolation and extra fields before client handoff", () => {
  for (const invalid of [
    { strokes: [{ ...stroke, interpolation: "auto" }] },
    { strokes: [{ ...stroke, onclick: "alert(1)" }] },
    { strokes: [stroke], svg: "<script/>" }
  ]) assert.equal(validStrokes(invalid), false);
});
test("drawing prompt uses the shared language and distinct geometry examples", () => {
  const prompt = strokePrompt("unfamiliar tool");
  assert.ok(prompt.includes(JSON.stringify("unfamiliar tool")));
  assert.ok(prompt.includes(STROKE_DRAWING_RULES));
  assert.ok(prompt.includes('"interpolation":"linear"'));
  assert.ok(prompt.includes('"interpolation":"smooth"'));
});
