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
