import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { critiqueImage, extractSafePaths, fetchImage, normalizeSvg, parseNouns, traceRaster } from './build-glyph-pack.mjs';
import { Resvg } from '@resvg/resvg-js';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('noun list is data, deduplicated by safe slug', () => {
  assert.deepEqual(parseNouns('# comment\nDragon | wyrm\ndragon | fire drake\nplant | seedling'), [
    { noun: 'dragon', synonyms: ['wyrm'], slug: 'dragon' },
    { noun: 'plant', synonyms: ['seedling'], slug: 'plant' }
  ]);
});

test('normalizes a simple traced path to 100 square and 80% fill', () => {
  const { glyph, svg } = normalizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 H100 V100 Z" fill="black"/></svg>');
  assert.equal(glyph.parts.length, 1);
  assert.match(glyph.parts[0].d, /M10 10 L90 10 L90 90 Z/);
  assert.deepEqual(glyph.anchors.top, [50, 10]);
  assert.match(svg, /viewBox="0 0 100 100"/);
  const preview = new Resvg(svg, { fitTo: { mode: 'width', value: 64 }, background: '#ffffff' }).render().asPng();
  assert.equal(Buffer.from(preview).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
});

test('rejects active SVG content and external references', () => {
  for (const extra of ['<script>alert(1)</script>', '<image href="https://evil.test/a"/>', '<foreignObject/>', '<path d="M0 0 L1 1" onload="evil()"/>']) {
    assert.throws(() => extractSafePaths(`<svg xmlns="http://www.w3.org/2000/svg">${extra}</svg>`));
  }
});

test('traces a local raster through real VTracer without an external CLI', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="white"/><path d="M20 105 L20 52 L64 20 L108 52 L108 105 Z" fill="black"/></svg>';
  const raster = new Resvg(source).render().asPng();
  const traced = traceRaster(Buffer.from(raster), 'binary');
  assert.ok(extractSafePaths(traced).length > 0);
  assert.ok(normalizeSvg(traced).glyph.parts.length > 0);
});

test('builds a resumable candidate pack and contact sheet from a local PNG with no API key', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'tegeera-glyph-test-'));
  try {
    const images = join(temp, 'images'), output = join(temp, 'glyphs'), visual = join(temp, 'review');
    await mkdir(images);
    const raster = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="white"/><path d="M20 105 L20 52 L64 20 L108 52 L108 105 Z" fill="black"/></svg>').render().asPng();
    await writeFile(join(images, 'house.png'), Buffer.from(raster));
    const nouns = join(temp, 'nouns.txt');
    await writeFile(nouns, 'house | home\n');
    const result = spawnSync(process.execPath, [join(import.meta.dirname, 'build-glyph-pack.mjs'), '--local-images', images,
      '--nouns', nouns, '--out-dir', output, '--visual-dir', visual], { encoding: 'utf8', timeout: 30_000, env: { ...process.env, OPENROUTER_API_KEY: '' } });
    assert.equal(result.status, 0, result.stderr);
    const pack = JSON.parse(await readFile(join(output, 'glyphs.json'), 'utf8'));
    assert.equal(pack.entries[0].noun, 'house');
    assert.deepEqual(pack.entries[0].synonyms, ['home']);
    assert.match(await readFile(join(output, 'house.svg'), 'utf8'), /viewBox="0 0 100 100"/);
    assert.match(await readFile(join(visual, 'glyph-contact-sheet.html'), 'utf8'), /Download approved.json/);
    const manifest = JSON.parse(await readFile(join(visual, 'manifest.json'), 'utf8'));
    assert.equal(manifest.items.house.status, 'ready');
    const approved = join(temp, 'approved.json'), packOutput = join(temp, 'offline-pack.json');
    await writeFile(approved, JSON.stringify({ formatVersion: '1.0.0', decisions: { house: 'approve' } }));
    const imported = spawnSync(process.execPath, [join(import.meta.dirname, 'build-glyph-pack.mjs'),
      '--import-approved', approved, '--reviewer', 'Test Reviewer', '--rights-note', 'Test fixture only',
      '--out-dir', output, '--visual-dir', visual, '--pack-output', packOutput], { encoding: 'utf8', timeout: 30_000 });
    assert.equal(imported.status, 0, imported.stderr);
    const checked = JSON.parse(await readFile(packOutput, 'utf8'));
    assert.equal(checked.entries[0].noun, 'house');
    assert.equal(checked.entries[0].review.reviewer, 'Test Reviewer');
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('image API adapter sends a bounded PNG request and rejects vector output', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  const png = Buffer.from(new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="black"/></svg>').render().asPng());
  try {
    process.env.OPENROUTER_API_KEY = 'unit-test-key';
    let request;
    globalThis.fetch = async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), { status: 200 });
    };
    assert.deepEqual(await fetchImage('house', 'test/image', new AbortController().signal), png);
    assert.equal(request.url, 'https://openrouter.ai/api/v1/images');
    assert.equal(JSON.parse(request.init.body).output_format, 'png');
    globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64'), media_type: 'image/svg+xml' }] }), { status: 200 });
    await assert.rejects(() => fetchImage('house', 'test/image', new AbortController().signal), /PNG-capable/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  }
});

test('vision API adapter sends actual PNG pixels and validates its review JSON', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  try {
    process.env.OPENROUTER_API_KEY = 'unit-test-key';
    let request;
    globalThis.fetch = async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ pass: true, issue: '', revisionPrompt: '' }) } }] }), { status: 200 });
    };
    const png = Buffer.from(new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="black"/></svg>').render().asPng());
    assert.equal((await critiqueImage('house', png, 'test/vision')).pass, true);
    assert.equal(request.url, 'https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse(request.init.body);
    assert.match(body.messages[0].content[1].image_url.url, /^data:image\/png;base64,/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  }
});
