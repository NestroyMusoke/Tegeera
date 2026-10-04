import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { blindGuessMatches, blindVisionGuess, candidateFingerprint, prioritizedReview, roundRobinCandidates, runVisionTriage, visionReportHtml } from './quickdraw-vision-triage.mjs';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 L90 10 L90 90 L10 90 Z" fill="none" stroke="#2f3e46"/></svg>';
const entries = [
  { id: 'dragon-1', noun: 'dragon', svg }, { id: 'dragon-2', noun: 'dragon', svg },
  { id: 'sun-1', noun: 'sun', svg }
];

test('blind vision request uses 64px pixels without leaking the target noun', async () => {
  let requested;
  const guess = await blindVisionGuess(entries[0], { key: 'test-private-key', fetchImpl: async (_url, init) => {
    requested = init;
    return new Response(JSON.stringify({ choices: [{ message: { content: 'a bending bird' } }], usage: { total_tokens: 116 } }), { status: 200 });
  } });
  const body = JSON.parse(requested.body);
  assert.equal(requested.headers.authorization, 'Bearer test-private-key');
  assert.doesNotMatch(body.messages[0].content[0].text, /dragon/i);
  assert.match(body.messages[0].content[1].image_url.url, /^data:image\/png;base64,/);
  assert.equal(guess.blindGuess, 'a bending bird');
  assert.deepEqual(guess.usage, { totalTokens: 116 });
  await assert.rejects(blindVisionGuess({ ...entries[0], svg: '<svg><script/></svg>' },
    { key: 'test-private-key', fetchImpl: async () => { throw new Error('should not fetch'); } }), /Forbidden SVG element|Malformed SVG/);
});

test('triage is dry-run by default, balanced across nouns and resumable', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tegeera-vision-triage-'));
  let calls = 0;
  try {
    await writeFile(join(dir, 'candidates.json'), JSON.stringify({ formatVersion: '1.0.0', entries }));
    assert.deepEqual(roundRobinCandidates(entries).map((entry) => entry.id), ['dragon-1', 'sun-1', 'dragon-2']);
    assert.equal(candidateFingerprint(entries[0]).length, 20);
    const fetchImpl = async () => { calls += 1; return new Response(JSON.stringify({ choices: [{ message: { content: 'a bird' } }] }), { status: 200 }); };
    const dry = await runVisionTriage({ outDir: dir, maxCandidates: 2, fetchImpl });
    assert.equal(dry.attempted, 0);
    assert.equal(calls, 0);
    const first = await runVisionTriage({ outDir: dir, maxCandidates: 2, execute: true, key: 'test-private-key', fetchImpl });
    assert.equal(first.attempted, 2);
    assert.equal(calls, 2);
    const report = await readFile(join(dir, 'vision-triage.json'), 'utf8');
    assert.doesNotMatch(report, /test-private-key/);
    assert.equal(JSON.parse(report).items['sun-1'].status, 'guessed');
    assert.match(await readFile(join(dir, 'vision-report.html'), 'utf8'), /Blind model guesses — not approvals/);
    assert.doesNotMatch(await readFile(join(dir, 'vision-report.html'), 'utf8'), /test-private-key/);
    assert.match(await readFile(join(dir, 'vision-prioritized-review.html'), 'utf8'), /Download decisions.json/);
    assert.match(await readFile(join(dir, 'vision-shortlist-review.html'), 'utf8'), /Download decisions.json/);
    const dryWithResults = await runVisionTriage({ outDir: dir, maxCandidates: 2, fetchImpl });
    assert.equal(dryWithResults.attempted, 0);
    assert.equal(calls, 2);
    const second = await runVisionTriage({ outDir: dir, maxCandidates: 2, execute: true, key: 'test-private-key', fetchImpl });
    assert.equal(second.attempted, 1);
    assert.equal(calls, 3);
    const third = await runVisionTriage({ outDir: dir, maxCandidates: 2, execute: true, key: 'test-private-key', fetchImpl });
    assert.equal(third.attempted, 0);
    assert.equal((await runVisionTriage({ outDir: dir, maxCandidates: 2, onlyNouns: ['sun'], fetchImpl })).pending, 0);
    await assert.rejects(runVisionTriage({ outDir: dir, onlyNouns: ['SUN'] }), /lowercase category names/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('ranking is a conservative review hint, not an approval decision', () => {
  assert.equal(blindGuessMatches('mountain', 'mountains'), true);
  assert.equal(blindGuessMatches('dragon', 'bending bird'), false);
  assert.equal(blindGuessMatches('sun', 'not a sun'), false);
  assert.equal(blindGuessMatches('leaf', 'unclear leaf-like line'), false);
  const report = { items: {
    'dragon-1': { status: 'guessed', fingerprint: candidateFingerprint(entries[0]), blindGuess: 'bird' },
    'dragon-2': { status: 'guessed', fingerprint: candidateFingerprint(entries[1]), blindGuess: 'dragon' },
    'sun-1': { status: 'guessed', fingerprint: 'stale', blindGuess: 'sun' }
  } };
  const ordered = prioritizedReview(entries, report);
  assert.deepEqual(ordered.entries.map((entry) => entry.id), ['dragon-2', 'dragon-1', 'sun-1']);
  assert.equal(ordered.hints['sun-1'], undefined);
  assert.equal(ordered.hints['dragon-1'], 'bird');
});

test('report escapes untrusted model guesses and candidate names', () => {
  const entry = { ...entries[0], noun: '<img onerror=alert(1)>' };
  const html = visionReportHtml([entry], { items: { [entry.id]: {
    fingerprint: candidateFingerprint(entry), status: 'guessed', blindGuess: '<script>alert(1)</script>'
  } } });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img onerror/);
});

test('account-wide rate limiting stops the batch after recording the failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tegeera-vision-limit-'));
  let calls = 0;
  try {
    await writeFile(join(dir, 'candidates.json'), JSON.stringify({ formatVersion: '1.0.0', entries }));
    await assert.rejects(runVisionTriage({ outDir: dir, maxCandidates: 3, execute: true, key: 'test-private-key',
      fetchImpl: async () => { calls += 1; return new Response('{}', { status: 429 }); } }), /stopped further triage/);
    assert.equal(calls, 1);
    assert.equal(JSON.parse(await readFile(join(dir, 'vision-triage.json'), 'utf8')).items['dragon-1'].status, 'failed');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
