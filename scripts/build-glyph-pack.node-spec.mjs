import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractSafePaths, normalizeSvg, parseNouns } from './build-glyph-pack.mjs';
import { Resvg } from '@resvg/resvg-js';

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
