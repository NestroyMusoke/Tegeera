import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runEvaluation } from './evaluate-hosted-gold.mjs';
import { normalizeMeaning, parseTeacherStatements, scoreBlueprint, summarizeScores } from './score-blueprint-gold.mjs';

const root = resolve(import.meta.dirname, '..');
const gold = JSON.parse(await readFile(join(root, 'evaluation', 'independent-scene-gold-v1.json'), 'utf8'));
const corpusMarkdown = await readFile(join(root, 'evaluation', 'independent-teacher-corpus.md'), 'utf8');
const first = gold.cases.find(({ id }) => id === 1);
const complete = {
  blueprintVersion: '1.0', mode: 'replace', confidence: 0.91,
  objects: [
    { id: 'plant', label: 'plant', kind: 'generic', x: 50, y: 50 },
    { id: 'roots', label: 'roots', kind: 'generic', x: 50, y: 85 },
    { id: 'leaves', label: 'leaves', kind: 'generic', x: 65, y: 25 },
    { id: 'water', label: 'water', kind: 'generic', x: 20, y: 80 },
    { id: 'sunlight', label: 'sunlight', kind: 'generic', x: 80, y: 10 }
  ],
  connections: [
    { from: 'roots', to: 'plant', label: 'part of' },
    { from: 'leaves', to: 'plant', label: 'part of' },
    { from: 'water', to: 'roots', label: 'flows into' },
    { from: 'sunlight', to: 'leaves', label: 'illuminates' }
  ]
};

test('teacher parser reads statements without putting intended visuals in a model prompt', () => {
  const statements = parseTeacherStatements(corpusMarkdown);
  assert.equal(statements.size, 60);
  assert.match(statements.get(1), /water through its roots/);
  assert.ok(!statements.get(1).includes('Intended visual'));
  assert.equal(normalizeMeaning('flowsInto'), 'flows into');
});

test('case 1 rejects the original three-node false-confident scene', () => {
  const incomplete = { ...complete, objects: complete.objects.filter((object) => !['roots', 'leaves'].includes(object.id)),
    connections: [] };
  const score = scoreBlueprint(first, incomplete);
  assert.equal(score.semanticReady, false);
  assert.equal(score.falseConfident, true);
  assert.deepEqual(score.missingConcepts, ['roots', 'leaves']);
  assert.equal(score.topologyCoverage.matched, 0);
});

test('complete directed graph is only semantic-ready; it cannot pass the visual gate', () => {
  const score = scoreBlueprint(first, complete);
  assert.equal(score.semanticReady, true);
  assert.equal(score.falseConfident, false);
  assert.equal(score.visualVerified, false);
  assert.deepEqual(score.conceptCoverage, { matched: 5, required: 5 });
  assert.deepEqual(score.topologyCoverage, { matched: 4, required: 4 });
  assert.deepEqual(score.predicateCoverage, { matched: 4, required: 4 });
  assert.equal(summarizeScores([first], { 1: { candidate: complete } }).visuallyApproved, 0);
});

test('reversed links and paraphrased labels stay distinguishable', () => {
  const reversed = structuredClone(complete);
  reversed.connections[2] = { from: 'roots', to: 'water', label: 'flows into' };
  const wrong = scoreBlueprint(first, reversed);
  assert.equal(wrong.topologyCoverage.matched, 3);
  assert.match(wrong.missingEdges[0], /water -> roots/);
  const paraphrase = structuredClone(complete);
  paraphrase.connections[2].label = 'is absorbed by';
  const uncertain = scoreBlueprint(first, paraphrase);
  assert.equal(uncertain.topologyCoverage.matched, 4);
  assert.equal(uncertain.predicateCoverage.matched, 3);
  assert.equal(uncertain.semanticReady, false);
  assert.equal(uncertain.falseConfident, false);
  assert.equal(uncertain.unverifiedPredicates.length, 1);
});

test('ambiguous and hold cases are not inflated into drawing passes', () => {
  const clarify = gold.cases.find(({ id }) => id === 53);
  assert.equal(scoreBlueprint(clarify, complete).falseConfident, true);
  assert.equal(scoreBlueprint(clarify, { ...complete, confidence: 0.3 }).semanticReady, true);
  const hold = gold.cases.find(({ id }) => id === 60);
  assert.equal(scoreBlueprint(hold, { ...complete, confidence: 0.3 }).semanticReady, false);
});

test('offline fixture mode never calls a provider and reports the annotated denominator', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tegeera-hosted-gold-'));
  try {
    const outputPath = join(temp, 'report.json');
    const result = await runEvaluation({ gold, corpusMarkdown, outputPath, fixtures: { 1: { candidate: complete } },
      maxCases: 3, fetchImpl: async () => { throw new Error('Network must not be called'); } });
    assert.equal(result.summary.annotatedTotal, 29);
    assert.equal(result.summary.evaluated, 1);
    assert.equal(result.summary.semanticReady, 1);
    assert.equal(result.summary.visuallyApproved, 0);
    const report = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(report.responses[1].candidate.objects.length, 5);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('live client sends only teacher text and an empty scene, and resumes without replaying calls', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tegeera-hosted-live-test-'));
  try {
    const outputPath = join(temp, 'report.json');
    let posts = 0;
    const fetchImpl = async (url, init) => {
      if (url.endsWith('/health')) return new Response(JSON.stringify({ configured: true, provider: 'nvidia', model: 'test-model' }), { status: 200 });
      posts += 1;
      const body = JSON.parse(init.body);
      assert.equal(body.text, parseTeacherStatements(corpusMarkdown).get(1));
      assert.ok(!init.body.includes('visualCues'));
      assert.deepEqual(body.scene.entities, []);
      return new Response(JSON.stringify({ candidate: complete, provider: 'nvidia', model: 'test-model' }), { status: 200 });
    };
    const config = { gold, corpusMarkdown, outputPath, endpoint: 'https://tegeera.example', maxCases: 1, fetchImpl };
    const firstRun = await runEvaluation(config);
    const resumed = await runEvaluation(config);
    assert.equal(posts, 1);
    assert.equal(firstRun.summary.semanticReady, 1);
    assert.equal(resumed.resumed, 1);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('hackathon evaluation refuses a non-Nebius health provider before spending credits', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tegeera-nebius-gate-'));
  try {
    let posts = 0;
    await assert.rejects(runEvaluation({ gold, corpusMarkdown, outputPath: join(temp, 'report.json'),
      endpoint: 'http://127.0.0.1:8080', maxCases: 1, requireNebiusNemotron: true,
      fetchImpl: async (url) => {
        if (url.endsWith('/health')) return new Response(JSON.stringify({ configured: true, provider: 'nvidia', model: 'nvidia/nemotron-3-super-120b-a12b' }), { status: 200 });
        posts += 1;
        return new Response('{}', { status: 200 });
      } }), /requires Nebius Token Factory/);
    assert.equal(posts, 0);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('rate limits stop the run without caching a failed case, so it can resume later', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tegeera-hosted-rate-test-'));
  try {
    let attempts = 0;
    const config = { gold, corpusMarkdown, outputPath: join(temp, 'report.json'),
      endpoint: 'https://tegeera.example', maxCases: 1,
      fetchImpl: async (url) => {
        if (url.endsWith('/health')) return new Response(JSON.stringify({ configured: true, provider: 'nvidia' }), { status: 200 });
        attempts += 1;
        return attempts === 1 ? new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 })
          : new Response(JSON.stringify({ candidate: complete }), { status: 200 });
      } };
    assert.equal((await runEvaluation(config)).summary.evaluated, 0);
    assert.equal((await runEvaluation(config)).summary.evaluated, 1);
    assert.equal(attempts, 2);
    await assert.rejects(runEvaluation({ ...config, fixtures: { 1: { candidate: complete } } }), /different evaluation mode/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
