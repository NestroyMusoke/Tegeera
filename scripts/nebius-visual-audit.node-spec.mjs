import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderReviewPng } from './render-review-svg.mjs';
import { auditScenePng, parseVisualVerdict, runAuditCli } from './nebius-visual-audit.mjs';

const html = '<style>.doodle-canvas{background:#fff}.doodle-stroke{stroke:#123}</style><svg class="doodle-canvas" viewBox="0 0 1000 620"><circle cx="200" cy="200" r="80"/></svg>';
const png = renderReviewPng(html, 400);

test('static review render produces PNG and rejects missing canvas', () => {
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.throws(() => renderReviewPng('<svg></svg>'), /styled drawing canvas/);
});

test('vision request sends image and bounded statement without exposing key in result', async () => {
  let called = 0;
  const fetchImpl = async (url, options) => {
    called++;
    assert.match(url, /nebius\.com\/v1\/chat\/completions$/);
    assert.equal(options.headers.Authorization, 'Bearer local-test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'vision/model');
    assert.match(body.messages[0].content[0].text, /A tree grows/);
    assert.match(body.messages[0].content[1].image_url.url, /^data:image\/png;base64,/);
    return { ok: true, json: async () => ({ choices: [{ message: { content:
      '{"clear":false,"uncertain":false,"issues":[{"type":"missing","detail":"No visible roots under the tree."}]}' } }] }) };
  };
  const result = await auditScenePng({ png, statement: 'A tree grows.', model: 'vision/model', key: 'local-test-key', fetchImpl });
  assert.equal(called, 1);
  assert.equal(result.issues[0].type, 'missing');
  assert.equal(result.humanVisualReview, 'pending');
  assert.doesNotMatch(JSON.stringify(result), /local-test-key/);
});

test('invalid inputs never make a paid request', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; };
  await assert.rejects(auditScenePng({ png: Buffer.from('bad'), statement: 'x', model: 'vision/model', key: 'x', fetchImpl }), /PNG/);
  await assert.rejects(auditScenePng({ png, statement: 'x', model: '', key: 'x', fetchImpl }), /bounded statement/);
  assert.equal(called, false);
});

test('malformed, contradictory, or unbounded verdicts are rejected', () => {
  assert.throws(() => parseVisualVerdict('{'), SyntaxError);
  assert.throws(() => parseVisualVerdict({ clear: true, uncertain: false, issues: [{ type: 'other', detail: 'This is not clear.' }] }), /clear verdict/);
  assert.throws(() => parseVisualVerdict({ clear: false, uncertain: false, issues: [{ type: 'script', detail: 'Dangerous output.' }] }), /invalid issue/);
  assert.throws(() => parseVisualVerdict({ clear: false, uncertain: false, issues: Array(5).fill({ type: 'other', detail: 'Five issues given.' }) }), /invalid verdict/);
});

test('provider errors are terse and do not echo remote content', async () => {
  await assert.rejects(auditScenePng({ png, statement: 'A tree.', model: 'vision/model', key: 'secret',
    fetchImpl: async () => ({ ok: false, status: 429, text: async () => 'remote sensitive body' }) }), /HTTP 429/);
});

test('CLI dry run writes a real preview and never calls the provider', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tegeera-visual-audit-'));
  try {
    const review = join(temp, 'review'), out = join(temp, 'out');
    await mkdir(review);
    await writeFile(join(review, 'case-1.html'), html);
    const result = await runAuditCli(['--review-dir', review, '--ids', '1', '--out', out], {
      fetchImpl: async () => { throw new Error('Provider must not be called in a dry run.'); }
    });
    assert.equal(result.report.mode, 'dry-run');
    assert.equal(result.report.cases[0].humanVisualReview, 'pending');
    assert.equal((await readFile(join(out, 'case-1.png'))).subarray(1, 4).toString(), 'PNG');
    assert.equal(JSON.parse(await readFile(join(out, 'report.json'), 'utf8')).cases.length, 1);
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), 'tegeera-visual-audit-')));
    await rm(temp, { recursive: true, force: true });
  }
});
