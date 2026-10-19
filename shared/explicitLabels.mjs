const words = (value) => value.toLowerCase().match(/[a-z]+/g) ?? [];
const unsafe = /[?]|\b(?:not|never|no|without|maybe|perhaps|might|could|cannot|if|whether|and|or|but|with|that|which|it|they|this|those|as|while|when|where|from|to|onto|into|by|for|of)\b|n't\b/i;
const phrase = (value) => value.trim().replace(/^(?:a|an|the)\s+/i, '');

/** Recover omitted modifiers only from a complete explicit containment clause.
 * Never infer attributes, add entities, resolve pronouns or rewrite relations. */
export function completeExplicitLabels(text, candidate) {
  if (typeof text !== 'string' || text.length > 4000 || /[?]|\b(?:not|never|maybe|perhaps|might|could|cannot|if|whether)\b|n't\b/i.test(text)
    || candidate?.mode !== 'replace' || !(candidate.confidence >= .58)
    || !Array.isArray(candidate.objects) || candidate.objects.length > 24 || !Array.isArray(candidate.connections)) return candidate;
  const proposed = new Map();
  const matchObject = (label) => {
    const tokens = words(label);
    const matches = candidate.objects.filter((object) => {
      if (typeof object?.label !== 'string') return false;
      const current = words(phrase(object.label));
      if (!current.length || current.at(-1) !== tokens.at(-1)) return false;
      let next = 0;
      for (const token of tokens) if (token === current[next]) next++;
      return next === current.length;
    });
    return matches.length === 1 ? matches[0] : null;
  };
  for (const sentence of text.split(/[.!;\n]/)) {
    const match = sentence.trim().match(/^([a-z][a-z -]{0,69}?)\s+(?:contains|holds|stores)\s+([a-z][a-z -]{0,69})$/i);
    if (!match) continue;
    const labels = [phrase(match[1]), phrase(match[2])];
    // The shared provider/client blueprint contract caps labels at 32 characters.
    if (labels.some((label) => !label || label.length > 32 || unsafe.test(label))) continue;
    const [holder, content] = labels.map(matchObject);
    if (!holder || !content || holder.id === content.id) continue;
    const edges = candidate.connections.filter((edge) => edge.from === holder.id && edge.to === content.id);
    if (!edges.length || edges.some((edge) => (edge.kind && !['contains', 'relatesTo'].includes(edge.kind))
      || !/^(?:contains|holds|stores)$/i.test(edge.label?.trim() ?? ''))) continue;
    for (const [index, object] of [holder, content].entries()) {
      const values = proposed.get(object.id) ?? new Set();
      values.add(labels[index]); proposed.set(object.id, values);
    }
  }
  let changed = false;
  const objects = candidate.objects.map((object) => {
    const labels = proposed.get(object.id);
    if (labels?.size !== 1) return object;
    const label = [...labels][0];
    if (label.toLowerCase() === object.label.toLowerCase()) return object;
    changed = true;
    return { ...object, label };
  });
  return changed ? { ...candidate, objects } : candidate;
}
