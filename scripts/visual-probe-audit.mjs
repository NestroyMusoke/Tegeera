/** A static render audit is evidence of placeholders, never human visual approval. */
export function auditRenderedScene(markup) {
  const ordinaryObjects = [...String(markup).matchAll(/class="doodle-object[^"]*"/g)].length;
  const schematicEnclosures = [...String(markup).matchAll(/class="labelled-container-annotation"/g)].length;
  const contained = [...String(markup).matchAll(/data-visual-cue="value-inside-container"/g)].length;
  const containedArtwork = [...String(markup).matchAll(/data-visual-cue="contained-artwork"/g)].length;
  const schematicValues = Math.max(0, contained - containedArtwork);
  const objects = ordinaryObjects + schematicEnclosures + contained;
  const labelledPlaceholders = [...String(markup).matchAll(/data-symbol-id="honest-sticker"/g)].length + schematicValues;
  const emojiPreviews = [...String(markup).matchAll(/data-symbol-id="emoji-preview"/g)].length;
  const propagationRoles = [...String(markup).matchAll(/data-propagation-role="(?:source|medium|payload|destination)"/g)].length;
  return {
    renderedObjects: objects,
    labelledPlaceholders,
    emojiPreviews,
    nonPlaceholderObjects: Math.max(0, objects - labelledPlaceholders - emojiPreviews - schematicEnclosures),
    humanVisualReview: "pending",
    ...(propagationRoles ? { schematicRoles: propagationRoles } : {}),
    ...(schematicEnclosures ? { schematicEnclosures, schematicValues } : {})
  };
}
