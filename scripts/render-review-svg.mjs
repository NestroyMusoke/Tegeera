import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

// This is a static SVG inspection aid, not a browser or Android screenshot.
const freeze = '.doodle-stroke,.doodle-detail,.accent-stroke,.glyph-ink-path{animation:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important}';

export function renderReviewPng(html, width = 1000) {
  if (typeof html !== 'string' || !Number.isInteger(width) || width < 320 || width > 1200) {
    throw new Error('A saved review page and bounded preview width are required.');
  }
  const svg = html.match(/<svg class="doodle-canvas"[\s\S]*?<\/svg>/)?.[0];
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  if (!svg || !css) throw new Error('The saved review page has no styled drawing canvas.');
  const styled = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" ')
    .replace(/(<svg[^>]*>)/, `$1<style>${css}${freeze}</style>`);
  return new Resvg(styled, { fitTo: { mode: 'width', value: width }, background: '#fbf7ed' }).render().asPng();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output, requestedWidth] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node scripts/render-review-svg.mjs <saved-case.html> <output.png> [width: 320..1200]');
  const png = renderReviewPng(await readFile(input, 'utf8'), requestedWidth === undefined ? 1000 : Number(requestedWidth));
  await writeFile(output, png);
  console.log(`Saved static SVG preview to ${output}`);
}
