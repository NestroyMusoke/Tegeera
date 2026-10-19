import { test } from "node:test";
import assert from "node:assert/strict";
import { auditRenderedScene } from "./visual-probe-audit.mjs";

test("a complete graph does not conceal labelled placeholders or emoji previews", () => {
  const markup = `<g class="doodle-object " data-entity-id="one"><g data-symbol-id="honest-sticker"></g></g>
    <g class="doodle-object " data-entity-id="two"><g data-symbol-id="emoji-preview"></g></g>
    <g class="doodle-object " data-entity-id="three"><g data-symbol-id="tree"></g></g>`;
  assert.deepEqual(auditRenderedScene(markup), {
    renderedObjects: 3, labelledPlaceholders: 1, emojiPreviews: 1,
    nonPlaceholderObjects: 1, humanVisualReview: "pending"
  });
});

test("schematic roles are counted separately from object artwork", () => {
  const markup = ["source", "medium", "payload", "destination"].map((role) => `<g data-propagation-role="${role}"></g>`).join("");
  const result = auditRenderedScene(markup);
  assert.equal(result.schematicRoles, 4);
  assert.equal(result.renderedObjects, 0);
  assert.equal(result.nonPlaceholderObjects, 0);
  assert.equal(result.humanVisualReview, "pending");
});

test("text-only contained values are placeholders, not missing objects or approved artwork", () => {
  const markup = '<g class="labelled-container-annotation"><g data-visual-cue="value-inside-container"><text>unfamiliar content</text></g></g>';
  const result = auditRenderedScene(markup);
  assert.equal(result.renderedObjects, 2);
  assert.equal(result.labelledPlaceholders, 1);
  assert.equal(result.schematicEnclosures, 1);
  assert.equal(result.schematicValues, 1);
  assert.equal(result.nonPlaceholderObjects, 0);
});

test("nested emoji art and its enclosure are counted once and remain provisional", () => {
  const result = auditRenderedScene('<g class="labelled-container-annotation"><g data-visual-cue="value-inside-container"><g data-visual-cue="contained-artwork"><g data-symbol-id="emoji-preview"></g></g></g></g>');
  assert.equal(result.renderedObjects, 2);
  assert.equal(result.labelledPlaceholders, 0);
  assert.equal(result.emojiPreviews, 1);
  assert.equal(result.nonPlaceholderObjects, 0);
  assert.equal(result.schematicValues, 0);
  assert.equal(result.humanVisualReview, "pending");
});
