// Source-grounding checks shared by the hosted service and the browser compiler.
// These are deliberately narrow: only explicit, high-signal relationship language
// is enforced. Unknown prose is left to the planner, not guessed into a diagram.
const words = (value) => String(value).toLowerCase().match(/[a-z]+/g) ?? [];
const forms = (word) => {
  const value = word.toLowerCase();
  return new Set([value, value.replace(/s$/, ""), value.replace(/ies$/, "y")]);
};
const same = (a, b) => [...forms(a)].some((form) => forms(b).has(form));

function matchingObject(noun, objects) {
  const matches = objects.filter((object) => words(object.label).some((part) => same(part, noun)));
  return matches.length === 1 ? matches[0] : null;
}

function priorMention(prefix, objects, excludedIds) {
  let best = null;
  for (const object of objects) {
    if (excludedIds.has(object.id)) continue;
    for (const part of words(object.label)) {
      const matches = [...prefix.matchAll(/[a-z]+/g)].filter((match) => same(match[0], part));
      const last = matches.at(-1);
      if (last && (!best || last.index > best.index)) best = { object, index: last.index };
    }
  }
  return best?.object ?? null;
}

/** @returns {string | null} A repairable general constraint, or no proven omission. */
export function sourceConstraintIssue(text, candidate) {
  if (!candidate || !Array.isArray(candidate.objects) || !Array.isArray(candidate.connections)) return null;
  const objects = candidate.objects;
  const edges = candidate.connections;
  const utterance = String(text).toLowerCase().replace(/[’‘]/g, "'");
  // A named passage is not equivalent to a direct source-to-whole arrow.
  // Resolve the nearest *named* source in the same clause; if either role is
  // uncertain, avoid imposing a relation that the teacher may not have meant.
  for (const match of utterance.matchAll(/\bthrough\s+(?:(?:its|their|the|a|an|his|her)\s+)?([a-z][a-z-]*)\b/g)) {
    const passage = matchingObject(match[1], objects);
    const prefix = utterance.slice(Math.max(0, match.index - 75), match.index).split(/[,.!?;]/).at(-1) ?? "";
    const excluded = new Set(passage ? [passage.id] : []);
    if (passage) for (const edge of edges) {
      if (edge.from === passage.id && (edge.kind === "partOf" || edge.label?.toLowerCase() === "part of")) excluded.add(edge.to);
    }
    const source = priorMention(prefix, objects, excluded);
    if (!source) continue;
    if (!passage) return `The explanation names a passage through ${match[1]}, but that visible part is missing.`;
    if (!edges.some((edge) => (edge.from === source.id && edge.to === passage.id)
      || (edge.to === passage.id && edge.via === source.id && edge.kind === "pumpsTo"))) {
      return `The explanation sends ${source.id} through ${passage.id}; draw a directed link to the passage, not only to the whole.`;
    }
  }
  // An applied action plus an explicitly opposing physical effect needs two
  // distinguishable force arrows, not just a generic actor-to-object caption.
  // This recognizes the diagram *relationship family*, never particular actors.
  const applied = /\b(?:push(?:es|ed|ing)?|pull(?:s|ed|ing)?)\b/.test(utterance);
  const opposition = /\b(?:friction|drag|resistance|oppos(?:e|es|ed|ing)|push(?:es|ed|ing)?\s+back|pull(?:s|ed|ing)?\s+back)\b/.test(utterance);
  if (applied && opposition && candidate.mode === "replace") {
    const required = ["appliedTo", "opposes", "contacts"];
    if (required.some((kind) => !edges.some((edge) => edge.kind === kind))) {
      return "The explanation has an applied action and an opposing effect; use a complete appliedTo/opposes/contacts force diagram with distinct force arrows and a contacted surface.";
    }
  }
  return null;
}
