import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  throw new Error('Usage: node scripts/render-review-svg.mjs <saved-case.html> <output.png>');
}

const html = await readFile(input, 'utf8');
const svg = html.match(/<svg class="doodle-canvas"[\s\S]*?<\/svg>/)?.[0];
const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
if (!svg || !css) throw new Error('The saved review page has no styled drawing canvas.');

// This is a static SVG inspection aid, not a browser or Android screenshot.
const freeze = '.doodle-stroke,.doodle-detail,.accent-stroke,.glyph-ink-path{animation:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important}';
const styled = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" `)
  .replace(/(<svg[^>]*>)/, `$1<style>${css}${freeze}</style>`);
const png = new Resvg(styled, { fitTo: { mode: 'width', value: 1000 }, background: '#fbf7ed' }).render().asPng();
await writeFile(output, png);
console.log(`Saved static SVG preview to ${output}`);
