import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  attributionMarkdown, fetchSample, importApproved, makeCandidate, overviewSvg,
  parseCandidates, reviewHtml, selectCandidates, validateNoun
} from './quickdraw-candidates.mjs';

const sample = { word: 'house', key_id: '12345', recognized: true,
  drawing: [
    [[20, 20, 180, 180, 20], [40, 180, 180, 40, 40]],
    [[10, 100, 190], [40, 0, 40]],
    [[80, 80, 120, 120], [180, 110, 110, 180]]
  ] };
const ndjson = (entries) => `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`;

test('bounded parser accepts recognized complete samples and rejects unsafe geometry', () => {
  assert.equal(validateNoun('house'), 'house');
  assert.throws(() => validateNoun('../house'), /category/);
  const input = ndjson([sample, { ...sample, key_id: '2', recognized: false },
    { ...sample, key_id: '3', drawing: [[[999, 2], [4, 5]]] }]) + '{"incomplete"';
  const parsed = parseCandidates(input, 'house');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].keyId, '12345');
  assert.equal(parseCandidates(ndjson([sample]), 'tree').length, 0);
});

test('normalizes vectors without SVG executable content and ranks deterministically', () => {
  const parsed = parseCandidates(ndjson([sample, sample]), 'house');
  const chosen = selectCandidates(parsed, 'house');
  assert.equal(chosen.length, 1);
  const candidate = makeCandidate('house', parsed[0]);
  assert.equal(candidate.glyph.viewBox, '0 0 100 100');
  assert.equal(candidate.glyph.parts.length, 3);
  assert.match(candidate.svg, /stroke-width="3"/);
  assert.ok(!candidate.svg.includes('<script'));
  assert.ok(candidate.glyph.parts.every((part) => part.d.length <= 800));
  assert.match(reviewHtml(chosen), /Recognizable without label/);
  assert.match(overviewSvg(chosen), /12345/);
});

test('sample fetch uses a byte range and refuses a full-file download', async () => {
  const calls = [];
  const fetchImpl = async (url, request) => {
    calls.push({ url, request });
    return new Response(ndjson([sample]), { status: 206 });
  };
  assert.match(await fetchSample('house', 10_000, fetchImpl), /12345/);
  assert.equal(calls[0].request.headers.Range, 'bytes=0-9999');
  assert.match(calls[0].url, /house\.ndjson$/);
  await assert.rejects(fetchSample('house', 10_000, async () => new Response('full file', { status: 200 })), /range request failed/);
});

test('import requires four human checks, one noun, valid provenance and a safe reparsed SVG', () => {
  const candidate = makeCandidate('house', parseCandidates(ndjson([sample]), 'house')[0]);
  const manifest = { formatVersion: '1.0.0', entries: [candidate] };
  const empty = { formatVersion: '1.0.0', entries: [] };
  const decision = { formatVersion: '1.0.0', decisions: { [candidate.id]: { decision: 'approve', checks: [true, true, true, true] } } };
  assert.throws(() => importApproved(manifest, decision, empty, ''), /reviewer/);
  assert.throws(() => importApproved(manifest, { ...decision, decisions: { [candidate.id]: { decision: 'approve' } } }, empty, 'Nestroy Musoke'), /Incomplete visual review/);
  const pack = importApproved(manifest, decision, empty, 'Nestroy Musoke');
  assert.equal(pack.entries.length, 1);
  assert.equal(pack.entries[0].provenance.license, 'CC BY 4.0');
  assert.equal(pack.entries[0].review.reviewer, 'Nestroy Musoke');
  assert.match(attributionMarkdown(pack), /12345/);
  assert.throws(() => importApproved(manifest, decision, pack, 'Nestroy Musoke'), /Only one approved glyph/);
  const unsafe = structuredClone(manifest);
  unsafe.entries[0].svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  assert.throws(() => importApproved(unsafe, decision, empty, 'Nestroy Musoke'), /Forbidden SVG/);
  const falseSource = structuredClone(manifest);
  falseSource.entries[0].sourceUrl = 'https://other.example/house.svg';
  assert.throws(() => importApproved(falseSource, decision, empty, 'Nestroy Musoke'), /Invalid source identity/);
});

test('local NDJSON CLI generates review files but does not ship any art before import', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tegeera-quickdraw-test-'));
  try {
    const source = join(temp, 'house.ndjson'), out = join(temp, 'review');
    await writeFile(source, ndjson([sample]));
    const processResult = spawnSync(process.execPath, [join(import.meta.dirname, 'quickdraw-candidates.mjs'),
      '--noun', 'house', '--source-file', source, '--out-dir', out], { encoding: 'utf8', timeout: 30_000 });
    assert.equal(processResult.status, 0, processResult.stderr);
    assert.match(await readFile(join(out, 'contact-sheet.html'), 'utf8'), /Download decisions.json/);
    const png = await readFile(join(out, 'contact-sheet.png'));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(JSON.parse(await readFile(join(out, 'candidates.json'), 'utf8')).entries.length, 1);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
