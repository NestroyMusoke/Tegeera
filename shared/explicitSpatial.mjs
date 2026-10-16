// Bind explicit spatial clauses to uniquely named model objects. No noun list,
// pronoun resolution, inferred actors, or coordinates are used as evidence.
const tokens = (text) => [...String(text).toLowerCase().matchAll(/[a-z]+/g)];
const singular = (word) => word.endsWith('ies') ? `${word.slice(0, -3)}y`
  : word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
const canonical = (text) => {
  const phrase = String(text).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().trim()
    .replace(/^(?:is|are|sits?|stands?|rests?|lies?|hangs?|hovers?|floats?)\s+/, '')
    .replace(/\s+(?:a|an|the)$/, '').replace(/^directly\s+/, '');
  if (/^(?:above|over|on top of)$/.test(phrase)) return 'above';
  if (/^(?:below|beneath|under|underneath)$/.test(phrase)) return 'below';
  if (/^(?:beside|next to|alongside)$/.test(phrase)) return 'beside';
  if (/^(?:to the |on the )?left of$/.test(phrase)) return 'left of';
  if (/^(?:to the |on the )?right of$/.test(phrase)) return 'right of';
  return null;
};
const inverse = { above: 'below', below: 'above', beside: 'beside', 'left of': 'right of', 'right of': 'left of' };

export function explicitSpatialRelations(text, objects) {
  if (typeof text !== 'string' || text.length > 4000 || !Array.isArray(objects) || objects.length > 24
    || /[?]|\b(?:not|never|no|without|maybe|perhaps|might|could|cannot|if|whether)\b|n't\b/i.test(text.replace(/[’‘]/g, "'"))) return [];
  const source = tokens(text);
  const aliases = objects.flatMap((object) => {
    if (typeof object?.id !== 'string' || typeof object.label !== 'string') return [];
    const label = tokens(object.label).map(([word]) => word);
    if (/^(?:a|an|the)$/.test(label[0])) label.shift();
    if (!label.length || label.length > 8) return [];
    const variants = [label];
    if (typeof object.color === 'string' && /^[a-z]+$/.test(object.color)) {
      if (label[0] === object.color && label.length > 1) variants.push(label.slice(1));
      else variants.push([object.color, ...label]);
    }
    return variants.map((words) => ({ id: object.id, words }));
  });
  const mentions = [];
  for (let index = 0; index < source.length; index += 1) {
    const matches = aliases.filter(({ words }) => words.every((word, offset) =>
      source[index + offset] && singular(source[index + offset][0]) === singular(word)));
    if (!matches.length) continue;
    const length = Math.max(...matches.map(({ words }) => words.length));
    const ids = new Set(matches.filter(({ words }) => words.length === length).map(({ id }) => id));
    const last = source[index + length - 1];
    // Ambiguity remains a barrier; do not skip it and bind across the clause.
    mentions.push({ id: ids.size === 1 ? [...ids][0] : null,
      start: source[index].index, end: last.index + last[0].length });
    index += length - 1;
  }
  const relations = [];
  for (let index = 1; index < mentions.length; index += 1) {
    const from = mentions[index - 1], to = mentions[index];
    if (!from.id || !to.id || from.id === to.id) continue;
    const gap = text.slice(from.end, to.start).replace(/\s+/g, ' ').trim();
    // Bare "over" can mean traversing a surface ("pull a sled over snow"),
    // not floating above it. Require an explicit posture for that synonym.
    if (/^over(?:\s+(?:a|an|the))?$/i.test(gap)) continue;
    const label = canonical(gap);
    if (label && !relations.some((edge) => edge.from === from.id && edge.to === to.id && edge.label === label)) {
      relations.push({ from: from.id, to: to.id, label });
    }
  }
  return relations;
}

const equivalent = (expected, edge) => (!edge.kind || edge.kind === 'relatesTo') && (
  edge.from === expected.from && edge.to === expected.to && canonical(edge.label) === expected.label
  || edge.from === expected.to && edge.to === expected.from && canonical(edge.label) === inverse[expected.label]);

export function completeExplicitSpatial(text, candidate) {
  if (!candidate || candidate.mode !== 'replace' || !(candidate.confidence >= 0.58)
    || !Array.isArray(candidate.objects) || !Array.isArray(candidate.connections)
    // Containment can carry ordinary spatial context. Recover only an explicit
    // missing link between uniquely named existing roles, just as in ordinary
    // graphs; never rewrite contradictory edges or specialised mechanisms.
    || candidate.connections.some((edge) => edge.kind && !['relatesTo', 'contains'].includes(edge.kind))) return candidate;
  const connections = [...candidate.connections];
  for (const expected of explicitSpatialRelations(text, candidate.objects)) {
    if (connections.some((edge) => equivalent(expected, edge))) continue;
    // Do not overwrite a contradictory or different existing claim. Validation
    // will diagnose it for the bounded repair path instead of hiding it.
    const occupied = connections.some((edge) => edge.from === expected.from && edge.to === expected.to
      || edge.from === expected.to && edge.to === expected.from);
    if (!occupied && connections.length < 12) connections.push(expected);
  }
  return connections.length === candidate.connections.length ? candidate : { ...candidate, connections };
}

export function explicitSpatialIssue(text, candidate) {
  if (candidate?.mode !== 'replace' || !(candidate.confidence >= 0.58)
    || !Array.isArray(candidate.objects) || !Array.isArray(candidate.connections)) return null;
  for (const expected of explicitSpatialRelations(text, candidate.objects)) {
    if (!candidate.connections.some((edge) => equivalent(expected, edge))) {
      const label = (id) => candidate.objects.find((object) => object.id === id)?.label ?? id;
      return `The explicit spatial relation ${label(expected.from)} ${expected.label} ${label(expected.to)} is missing or contradictory.`;
    }
  }
  return null;
}
