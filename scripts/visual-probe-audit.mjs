/** A static render audit is evidence of placeholders, never human visual approval. */
export function auditRenderedScene(markup) {
  const objects = [...String(markup).matchAll(/class="doodle-object[^"]*"/g)].length;
  const labelledPlaceholders = [...String(markup).matchAll(/data-symbol-id="honest-sticker"/g)].length;
  const emojiPreviews = [...String(markup).matchAll(/data-symbol-id="emoji-preview"/g)].length;
  return {
    renderedObjects: objects,
    labelledPlaceholders,
    emojiPreviews,
    nonPlaceholderObjects: Math.max(0, objects - labelledPlaceholders - emojiPreviews),
    humanVisualReview: "pending"
  };
}
