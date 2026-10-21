/** A source map, not an inferred argument or a fact-check. Never rewrites prose. */
export type ArgumentRole = "definition" | "statement" | "comparison" | "question" | "condition";
export interface ArgumentPanel {
  id: string;
  start: number;
  end: number;
  text: string;
  roles: ArgumentRole[];
}
export interface ArgumentMap {
  version: "1.0";
  source: string;
  panels: ArgumentPanel[];
  links: Array<{ from: string; to: string; kind: "reading-order" }>;
}

const negative = /\b(?:no|not|none|never|neither|without|lack|lacks|cannot|can't|isn't|doesn't|aren't)\b/i;
const definition = /\b(?:refers? to|defined as|definition of|means that)\b/i;
const comparison = /\b(?:unlike|whereas|compared (?:to|with)|different|differs|however|but|in contrast)\b/i;
const conditional = /\b(?:if|unless|provided that|only when)\b/i;
const questionOpening = /^\s*["“']?(?:(?:is|are)\s+(?:there|the|this|that|it|he|she|they|we)\b|(?:why|how|what|when|where|who|whose|which)\b)/i;

function sentences(text: string): Array<{ start: number; end: number }> {
  // Modern browsers use their sentence boundary implementation. The fallback
  // only divides at punctuation + whitespace; both paths preserve every byte.
  if (typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)]
      .map(({ index, segment }) => ({ start: index, end: index + segment.length }));
  }
  const cuts = [0, ...[...text.matchAll(/[.!?]+\s+/g)].map(match => match.index! + match[0].length), text.length];
  return cuts.slice(0, -1).map((start, index) => ({ start, end: cuts[index + 1] })).filter(span => span.end > span.start);
}

export function shouldUseArgumentMap(text: string): boolean {
  if (!text.trim() || text.length > 500) return false;
  // Conservative automatic routing. A single drawing instruction, including
  // "do not clear", must not be mistaken for a replacement argument map.
  return sentences(text).filter(span => text.slice(span.start, span.end).trim()).length >= 2
    && (definition.test(text) || comparison.test(text) || conditional.test(text) || negative.test(text) || text.includes("?")
      || sentences(text).some(span => questionOpening.test(text.slice(span.start, span.end))));
}

export function buildArgumentMap(source: string): ArgumentMap {
  if (!source.trim() || source.length > 500) throw new Error("Enter an explanation between 1 and 500 characters.");
  const spans = sentences(source);
  // Bound layout complexity without silently dropping the remainder.
  const bounded = spans.length > 8 ? [...spans.slice(0, 7), { start: spans[7].start, end: source.length }] : spans;
  const panels = bounded.map(({ start, end }, index): ArgumentPanel => {
    const text = source.slice(start, end);
    const roles: ArgumentRole[] = [];
    if (text.includes("?") || questionOpening.test(text)) roles.push("question");
    if (definition.test(text)) roles.push("definition");
    if (comparison.test(text)) roles.push("comparison");
    if (conditional.test(text)) roles.push("condition");
    return { id: `part-${index + 1}`, start, end, text, roles: roles.length ? roles : ["statement"] };
  });
  return { version: "1.0", source, panels, links: panels.slice(1).map((panel, index) => ({
    from: panels[index].id, to: panel.id, kind: "reading-order"
  })) };
}

/** Mark negation as wording, never as an inferred claim about an entity. */
export function wordingSegments(text: string): Array<{ text: string; negative: boolean }> {
  return text.split(/(\b(?:no|not|none|never|neither|without|lack|lacks|cannot|can't|isn't|doesn't|aren't)\b)/gi)
    .filter(Boolean).map(part => ({ text: part, negative: negative.test(part) }));
}
