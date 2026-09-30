import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// This is a static SVG inspection aid, not a browser or Android screenshot.
const freeze = '.doodle-stroke,.doodle-detail,.accent-stroke,.glyph-ink-path{animation:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important}';

// Matches the browser camera's conservative bounds policy for static review only.
export function estimateArtworkFrame(svg, css) {
  if (!svg.includes('data-auto-measure="true"')) return null;
  try {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const art = [...document.getElementsByTagName('g')].find((element) => element.getAttribute('data-scene-art') === 'true');
    if (!art) return null;
    const isolated = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620"><style>${css}${freeze}</style>${new XMLSerializer().serializeToString(art)}</svg>`;
    const box = new Resvg(isolated).getBBox();
    if (!box) return null;
    const { x, y, width, height } = box;
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0
      || x < 0 || y < 0 || x + width > 1000 || y + height > 620) return null;
    const minX = x - 48, maxX = x + width + 48, minY = y - 48, maxY = y + height + 48;
    const frameWidth = Math.max(620, maxX - minX, (maxY - minY) * 1000 / 620);
    if (frameWidth >= 1000) return null;
    const frameHeight = frameWidth * 620 / 1000;
    const frameX = Math.max(0, Math.min(1000 - frameWidth, (minX + maxX - frameWidth) / 2));
    const frameY = Math.max(0, Math.min(620 - frameHeight, (minY + maxY - frameHeight) / 2));
    const tidy = (value) => Number(value.toFixed(1));
    return `${tidy(frameX)} ${tidy(frameY)} ${tidy(frameWidth)} ${tidy(frameHeight)}`;
  } catch {
    return null;
  }
}

export function renderReviewPng(html, width = 1000) {
  if (typeof html !== 'string' || !Number.isInteger(width) || width < 320 || width > 1200) {
    throw new Error('A saved review page and bounded preview width are required.');
  }
  const svg = html.match(/<svg class="doodle-canvas"[\s\S]*?<\/svg>/)?.[0];
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  if (!svg || !css) throw new Error('The saved review page has no styled drawing canvas.');
  const frame = estimateArtworkFrame(svg, css);
  const fitted = frame ? svg.replace(/viewBox="[^"]*"/, `viewBox="${frame}"`) : svg;
  const styled = fitted.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" ')
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
