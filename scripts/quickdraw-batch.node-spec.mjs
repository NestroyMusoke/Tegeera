import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyFetchError, queueNouns, runBatch } from './quickdraw-batch.mjs';

const sample = (noun, id) => `${JSON.stringify({ word: noun, recognized: true, key_id: id,
  drawing: [[[10, 80, 80, 10, 10], [10, 10, 80, 80, 10]], [[20, 70], [45, 45]]] })}\n`;

test('batch noun queue deduplicates and marks unsupported names safely', () => {
  assert.deepEqual(queueNouns('dragon | wyrm\nsun\ndragon\niron-nail\n', 4), [
    { noun: 'dragon', valid: true }, { noun: 'sun', valid: true }, { noun: 'iron-nail', valid: false }
  ]);
  assert.throws(() => queueNouns('sun', 101), /1–100/);
  assert.equal(classifyFetchError(new Error('Dataset range request failed for soil (HTTP 404).')), 'unsupported');
  assert.equal(classifyFetchError(new Error('Dataset range request failed for soil (HTTP 503).')), 'failed');
});

test('batch saves ready, unsupported and failed states; resumes without refetching successes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tegeera-quickdraw-batch-'));
  const calls = [];
  const fetchText = async (noun) => {
    calls.push(noun);
    if (noun === 'soil') throw new Error('Dataset range request failed for soil (HTTP 404).');
    if (noun === 'sun' && calls.filter((item) => item === 'sun').length === 1) throw new Error('HTTP 503');
    return sample(noun, noun === 'dragon' ? '123' : '456');
  };
  try {
    const options = { nounsText: 'dragon\nsoil\nsun\n', outDir: dir, fetchText, concurrency: 2, rangeBytes: 10_000 };
    const first = await runBatch(options);
    assert.deepEqual([first.ready, first.unsupported, first.failed, first.requested], [1, 1, 1, 3]);
    const second = await runBatch(options);
    assert.deepEqual([second.ready, second.unsupported, second.failed, second.requested], [2, 1, 0, 1]);
    assert.deepEqual(calls.sort(), ['dragon', 'soil', 'sun', 'sun'].sort());
    const manifest = JSON.parse(await readFile(join(dir, 'candidates.json'), 'utf8'));
    assert.equal(manifest.entries.length, 2);
    assert.match(await readFile(join(dir, 'contact-sheet.html'), 'utf8'), /Candidate doodles — not shipped/);
    const png = await readFile(join(dir, 'contact-sheet.png'));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    await runBatch({ ...options, refresh: true });
    assert.equal(calls.length, 7);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('empty bounded sample stays unapproved and produces a reviewable report', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tegeera-quickdraw-empty-'));
  try {
    const result = await runBatch({ nounsText: 'river\n', outDir: dir, rangeBytes: 10_000, fetchText: async () => '' });
    assert.deepEqual([result.ready, result.failed, result.candidates], [0, 1, 0]);
    assert.deepEqual(JSON.parse(await readFile(join(dir, 'candidates.json'), 'utf8')).entries, []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
