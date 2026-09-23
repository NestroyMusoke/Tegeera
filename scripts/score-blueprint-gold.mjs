import { validScene } from '../server/engine.mjs';

export const CONFIDENCE_FLOOR = 0.58;

export function normalizeMeaning(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function parseTeacherStatements(markdown) {
  const statements = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^(\d+)\. \*\*\[[EMH]\]\*\* "(.+)"$/);
    if (match) statements.set(Number(match[1]), match[2]);
  }
  return statements;
}

/** Scores semantic evidence only. SVG cues and human recognition are not inferable from a blueprint. */
export function scoreBlueprint(goldCase, candidate) {
  const expected = goldCase.expected;
  const base = {
    id: goldCase.id, expectedIntent: expected.intent,
    observedIntent: 'invalid', confidence: null,
    validStructure: false, semanticReady: false, visualVerified: false,
    falseConfident: false, conceptCoverage: null, topologyCoverage: null,
    predicateCoverage: null, missingConcepts: [], missingEdges: [],
    unverifiedPredicates: [], notes: []
  };
  if (!validScene(candidate, { entities: [] })) {
    return { ...base, notes: ['Missing or structurally invalid visual blueprint.'] };
  }
  const confidence = candidate.confidence;
  const observedIntent = confidence < CONFIDENCE_FLOOR ? 'clarify' : 'draw';
  if (expected.intent !== 'draw') {
    const matchesIntent = expected.intent === 'clarify' && observedIntent === 'clarify';
    return { ...base, confidence, observedIntent, validStructure: true, semanticReady: matchesIntent,
      falseConfident: observedIntent === 'draw',
      notes: expected.intent === 'hold' ? ['The blueprint protocol cannot express a hold; this case needs an app-level check.']
        : matchesIntent ? ['Abstained from an ambiguous drawing.'] : ['Confident drawing where clarification was expected.'] };
  }
  if (observedIntent === 'clarify') {
    return { ...base, confidence, observedIntent, validStructure: true,
      notes: ['Low-confidence clarification for a case that needs a drawing.'] };
  }

  const usedIds = new Set();
  const matched = new Map();
  const missingConcepts = [];
  for (const concept of expected.concepts) {
    const labels = new Set(concept.labels.map(normalizeMeaning));
    const object = candidate.objects.find((item) => !usedIds.has(item.id) && labels.has(normalizeMeaning(item.label)));
    if (!object) missingConcepts.push(concept.key);
    else { matched.set(concept.key, object.id); usedIds.add(object.id); }
  }
  const missingEdges = [], unverifiedPredicates = [];
  let topologyFound = 0, predicatesFound = 0;
  for (const relation of expected.relations) {
    const source = matched.get(relation.source), target = matched.get(relation.target);
    const edges = source && target ? candidate.connections.filter((edge) => edge.from === source && edge.to === target) : [];
    const description = `${relation.source} -> ${relation.target} (${relation.predicate})`;
    if (!edges.length) missingEdges.push(description);
    else {
      topologyFound += 1;
      const expectedLabel = normalizeMeaning(relation.predicate);
      if (edges.some((edge) => normalizeMeaning(edge.label) === expectedLabel)) predicatesFound += 1;
      else unverifiedPredicates.push(description);
    }
  }
  const conceptCoverage = { matched: matched.size, required: expected.concepts.length };
  const topologyCoverage = { matched: topologyFound, required: expected.relations.length };
  const predicateCoverage = { matched: predicatesFound, required: expected.relations.length };
  const semanticReady = missingConcepts.length === 0 && missingEdges.length === 0 && unverifiedPredicates.length === 0;
  return { ...base, confidence, observedIntent, validStructure: true, semanticReady,
    falseConfident: missingConcepts.length > 0 || missingEdges.length > 0,
    conceptCoverage, topologyCoverage, predicateCoverage,
    missingConcepts, missingEdges, unverifiedPredicates,
    notes: [semanticReady ? 'Blueprint matches annotated labels and directed lexical relations; actual drawing remains unverified.'
      : 'Incomplete or lexically unverified meaning. Synonymous relation wording needs human review, not an automatic pass.'] };
}

export function summarizeScores(goldCases, responses) {
  const scores = goldCases.filter(({ id }) => Object.hasOwn(responses, id)).map((goldCase) => {
    const response = responses[goldCase.id];
    return { ...scoreBlueprint(goldCase, response?.candidate),
      provider: response?.provider ?? null, model: response?.model ?? null,
      latencyMs: Number.isFinite(response?.latencyMs) ? response.latencyMs : null,
      error: response?.error ?? null };
  });
  const sumCoverage = (name) => ({ matched: scores.reduce((sum, score) => sum + (score[name]?.matched ?? 0), 0),
    required: scores.reduce((sum, score) => sum + (score[name]?.required ?? 0), 0) });
  return { annotatedTotal: goldCases.length, evaluated: scores.length,
    semanticReady: scores.filter((score) => score.semanticReady).length,
    falseConfident: scores.filter((score) => score.falseConfident).length,
    errors: scores.filter((score) => score.error).length,
    conceptCoverage: sumCoverage('conceptCoverage'), topologyCoverage: sumCoverage('topologyCoverage'),
    predicateCoverage: sumCoverage('predicateCoverage'),
    visuallyApproved: 0, visuallyApprovedReason: 'No SVG, phone screenshot, or human visual decision is scored by this harness.',
    scores };
}
