import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { renderHostedGold, verifyReview, visualEvidence } from './render-hosted-gold.mjs';

const root = resolve(import.meta.dirname, '..');
const fullGold = JSON.parse(await readFile(join(root, 'evaluation', 'independent-scene-gold-v1.json'), 'utf8'));
const gold = { ...fullGold, cases: [fullGold.cases.find(({ id }) => id === 1)] };
const corpusMarkdown = await readFile(join(root, 'evaluation', 'independent-teacher-corpus.md'), 'utf8');
const css = await readFile(join(root, 'src', 'styles.css'), 'utf8');
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
const review = (manifest, decision = 'approved') => ({
  schemaVersion: '1.0.0', renderRevision: manifest.renderRevision, mode: manifest.mode,
  reviewedAt: new Date().toISOString(), reviewer: 'Test reviewer', device: 'Test display', viewportPx: 390,
  decisions: { 1: { decision, checks: Array(6).fill(true), note: decision === 'rejected' ? 'Visual mismatch' : '' } }
});

test('visual evidence checks concrete cues and layout rather than model claims', () => {
  const expected = gold.cases[0].expected;
  const evidence = visualEvidence('<svg data-relation-layout="part-whole-flow"><g data-visual-cue="visible-roots sun-symbol"></g></svg>', expected);
  assert.equal(evidence.grammarMatch, true);
  assert.deepEqual(evidence.missingCues, ['soil-boundary', 'water-entry-arrow', 'leaf-targeted-ray']);
});

test('real canvas render exposes the semantic/visual gap and fixtures never strictly pass', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tegeera-hosted-render-'));
  try {
    const reportPath = join(temp, 'report.json');
    const corpusHash = createHash('sha256').update(JSON.stringify(gold) + '\n' + corpusMarkdown).digest('hex');
    await writeFile(reportPath, JSON.stringify({ formatVersion: '1.0.0', corpusHash, mode: 'fixture', responses: { 1: { candidate: complete } } }));
    const manifest = await renderHostedGold({ reportPath, out: join(temp, 'review'), gold, corpusMarkdown, css });
    const item = manifest.cases[0];
    assert.equal(item.score.semanticReady, true);
    assert.equal(item.rendered, true);
    assert.equal(item.renderError, null);
    assert.equal(item.visual.grammarMatch, false);
    assert.ok(item.visual.missingCues.length > 0);
    const page = await readFile(join(temp, 'review', 'case-1.html'), 'utf8');
    assert.match(page, /<svg/);
    assert.match(page, /data-relation-layout/);
    assert.match(await readFile(join(temp, 'review', 'review.html'), 'utf8'), /SYNTHETIC FIXTURE/);
    assert.equal(verifyReview(manifest, review(manifest)).strictReady, 0);
    assert.throws(() => verifyReview(manifest, { ...review(manifest), renderRevision: 'sha256:forged' }), /does not match/);
    assert.throws(() => verifyReview(manifest, { ...review(manifest), decisions: { 1: { decision: 'approved', checks: [true] } } }), /six complete/);
    const live = { ...manifest, mode: 'live' };
    assert.equal(verifyReview(live, review(live)).strictReady, 0);
    const satisfied = structuredClone(live);
    satisfied.cases[0].visual = { grammarMatch: true, missingCues: [] };
    assert.equal(verifyReview(satisfied, review(satisfied)).strictReady, 1);
    satisfied.cases[0].rendered = false;
    assert.throws(() => verifyReview(satisfied, review(satisfied)), /valid render/);

    const typed = structuredClone(complete);
    typed.objects.find(({ id }) => id === 'plant').x = 78;
    typed.objects.find(({ id }) => id === 'roots').x = 45;
    typed.objects.find(({ id }) => id === 'leaves').x = 45;
    typed.objects.find(({ id }) => id === 'water').x = 15;
    typed.objects.find(({ id }) => id === 'sunlight').x = 15;
    typed.connections = [
      { from: 'roots', to: 'plant', label: 'part of', kind: 'partOf' },
      { from: 'leaves', to: 'plant', label: 'part of', kind: 'partOf' },
      { from: 'water', to: 'roots', label: 'flows into', kind: 'flowsInto' },
      { from: 'sunlight', to: 'leaves', label: 'illuminates', kind: 'illuminates' }
    ];
    await writeFile(reportPath, JSON.stringify({ formatVersion: '1.0.0', corpusHash, mode: 'fixture', responses: { 1: { candidate: typed } } }));
    const typedManifest = await renderHostedGold({ reportPath, out: join(temp, 'typed-review'), gold, corpusMarkdown, css });
    assert.equal(typedManifest.cases[0].score.semanticReady, true);
    assert.equal(typedManifest.cases[0].visual.grammarMatch, true);
    assert.deepEqual(typedManifest.cases[0].visual.missingCues, []);
    assert.equal(verifyReview(typedManifest, review(typedManifest)).strictReady, 0);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
