#!/usr/bin/env node
// Candidate artwork is never shipped until the contact-sheet approval is imported.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { DOMParser } from '@xmldom/xmldom';
import svgpath from 'svgpath';
import { optimize } from 'svgo';

const ROOT = resolve(import.meta.dirname, '..');
const VISUAL = join(ROOT, '.visual-check');
const OUT = join(ROOT, 'public', 'glyphs');
const PALETTE = ['#2f3e46', '#52796f', '#84a98c', '#f4a261', '#e9c46a', '#cad2c5'];
const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
const has = (name) => args.includes(name);
const slug = (noun) => noun.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const saveJson = (path, data) => writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function parseNouns(text) {
  const seen = new Set();
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => {
    const [noun, ...synonyms] = line.split('|').map((s) => s.trim().toLowerCase());
    if (!/^[a-z][a-z -]{1,47}$/.test(noun)) throw new Error(`Invalid noun: ${noun}`);
    return { noun, synonyms: [...new Set(synonyms.filter(Boolean))].slice(0, 12), slug: slug(noun) };
  }).filter((entry) => { if (seen.has(entry.slug)) return false; seen.add(entry.slug); return true; });
}

const allowedTags = new Set(['svg', 'g', 'path']);
const allowedAttrs = new Set(['xmlns', 'viewBox', 'width', 'height', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'id']);

/** Rejects active content before optimizing. Nothing from source XML is injected into the app. */
export function extractSafePaths(svg) {
  svg = svg.replace(/^\s*<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?\s*\?>\s*/i, '');
  if (svg.length > 1_000_000 || /<!doctype|<!entity|<\?|xlink:|javascript:/i.test(svg)) throw new Error('Unsafe SVG declaration');
  const errors = [];
  const document = new DOMParser({ onError: (_level, message) => { errors.push(message); } }).parseFromString(svg, 'image/svg+xml');
  if (errors.length || document.documentElement.tagName !== 'svg') throw new Error('Malformed SVG');
  const paths = [];
  function visit(element) {
    if (!allowedTags.has(element.tagName)) throw new Error(`Forbidden SVG element: ${element.tagName}`);
    for (let i = 0; i < element.attributes.length; i++) {
      const name = element.attributes.item(i).name;
      if (!allowedAttrs.has(name) || /^on/i.test(name)) throw new Error(`Forbidden SVG attribute: ${name}`);
    }
    if (element.tagName === 'path') {
      const d = element.getAttribute('d');
      if (!d || d.length > 100_000) throw new Error('Invalid source path');
      paths.push({ d, fill: element.getAttribute('fill') ?? 'none', stroke: element.getAttribute('stroke') ?? 'none' });
    }
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) visit(child);
      else if (child.nodeType !== 3 || child.nodeValue.trim()) throw new Error('Non-graphic SVG content');
    }
  }
  visit(document.documentElement);
  if (!paths.length || paths.length > 12) throw new Error('Glyph needs 1–12 paths');
  return paths;
}

const cleanNumber = (number) => Math.max(0, Math.min(100, Math.round(number * 100) / 100));
export function normalizeSvg(svg) {
  const raw = extractSafePaths(svg);
  const parsed = raw.map(({ d }) => svgpath(d).abs().unshort().unarc().iterate((segment, _index, x, y) => {
    if (segment[0] === 'H') return [['L', segment[1], y]];
    if (segment[0] === 'V') return [['L', x, segment[1]]];
    return undefined;
  }));
  const points = [];
  for (const path of parsed) path.iterate((segment) => {
    const command = segment[0];
    if (!'MLCQHVZ'.includes(command)) throw new Error(`Unsupported path command: ${command}`);
    for (let i = 1; i < segment.length; i += 2) points.push([segment[i], segment[i + 1]]);
  });
  const xs = points.map(([x]) => x); const ys = points.map(([, y]) => y);
  if (!xs.length || [...xs, ...ys].some((n) => !Number.isFinite(n))) throw new Error('Empty/invalid geometry');
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX - minX, height = maxY - minY;
  if (width <= 0 || height <= 0) throw new Error('Degenerate geometry');
  const scale = 80 / Math.max(width, height);
  const offsetX = 50 - (minX + maxX) * scale / 2;
  const offsetY = 50 - (minY + maxY) * scale / 2;
  const parts = parsed.map((path, index) => {
    path.matrix([scale, 0, 0, scale, offsetX, offsetY]).round(2);
    const commands = [];
    path.iterate((segment) => {
      const [command, ...values] = segment;
      if (!'MLCQZ'.includes(command)) throw new Error(`Unsupported normalized command: ${command}`);
      commands.push(`${command}${values.map(cleanNumber).join(' ')}`);
    });
    const d = commands.join(' ');
    if (d.length > 800) throw new Error('Path exceeds runtime complexity limit');
    return { id: `part-${index + 1}`, d, fill: raw[index].fill === 'none' ? 'none' : PALETTE[index % PALETTE.length], stroke: PALETTE[0] };
  });
  const glyph = { schemaVersion: '1.0.0', viewBox: '0 0 100 100', parts, anchors: {
    top: [50, cleanNumber(50 - height * scale / 2)],
    ground: [50, cleanNumber(50 + height * scale / 2)],
    front: [cleanNumber(50 + width * scale / 2), 50]
  } };
  return { glyph, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${parts.map((p) => `<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>` };
}

async function runVtracer(input, output, mode) {
  const command = option('--vtracer', 'vtracer');
  const flags = [input, output, '--clustering', mode === 'binary' ? 'bw' : 'color', '--filter-speckle', '4', '--path-precision', '2'];
  await new Promise((done, fail) => {
    const child = spawn(command, flags, { stdio: 'ignore', windowsHide: true });
    child.on('error', fail); child.on('exit', (code) => code === 0 ? done() : fail(new Error(`vtracer exited ${code}`)));
  });
}

async function fetchImage(noun, model, signal) {
  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST', signal, headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: `One original, simple classroom doodle of ${noun}, isolated on plain white, clearly recognizable silhouette, no words, no labels, no shadows, flat colors.`, output_format: 'png' })
  });
  if (!response.ok) throw new Error(`Image API HTTP ${response.status}`);
  const result = await response.json();
  const base64 = result.data?.[0]?.b64_json;
  if (typeof base64 !== 'string' || base64.length > 12_000_000) throw new Error('No bounded base64 image returned');
  return Buffer.from(base64, 'base64');
}

async function withRetry(task, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await task(); } catch (error) { last = error; if (i < attempts - 1) await new Promise((done) => setTimeout(done, 700 * 2 ** i)); }
  }
  throw last;
}

function contactSheet(entries) {
  const safeData = JSON.stringify(entries).replace(/</g, '\\u003c');
  return `<!doctype html><html><meta charset="utf-8"><title>Tegeera glyph review</title><style>body{font:16px system-ui;background:#f8f5ee;color:#24332f;margin:24px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}.card{border:2px solid #ddd;background:white;border-radius:12px;padding:12px}.card img{width:100%;height:130px;object-fit:contain}.card.approve{border-color:#459771}.card.reject{opacity:.45}button{margin:3px;padding:8px}</style><h1>Tegeera glyph review</h1><p>Approve only recognizable, original, correctly anchored drawings at small size. Save approved.json, then import with a named reviewer.</p><button id="export">Download approved.json</button><div class="grid" id="grid"></div><script>const entries=${safeData};const choices={};const grid=document.getElementById('grid');for(const e of entries){const card=document.createElement('div');card.className='card';const img=document.createElement('img');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(e.svg);img.alt=e.noun;const title=document.createElement('h3');title.textContent=e.noun;card.append(img,title);for(const choice of ['approve','reject']){const button=document.createElement('button');button.textContent=choice;button.onclick=()=>{choices[e.noun]=choice;card.className='card '+choice};card.append(button)}grid.append(card)}document.getElementById('export').onclick=()=>{const blob=new Blob([JSON.stringify({formatVersion:'1.0.0',decisions:choices},null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='approved.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}</script></html>`;
}

async function importApproved(path, reviewer, rightsNote) {
  if (!reviewer?.trim()) throw new Error('Use --reviewer "Your name" when importing approvals');
  if (!rightsNote?.trim()) throw new Error('Use --rights-note to record the image model output rights you verified');
  const decisions = JSON.parse(await readFile(path, 'utf8')).decisions;
  const candidates = JSON.parse(await readFile(join(OUT, 'glyphs.json'), 'utf8')).entries;
  const entries = candidates.filter((entry) => decisions[entry.noun] === 'approve').map(({ noun, synonyms, glyph }) => ({
    noun, aliases: synonyms, glyph,
    provenance: { source: 'model-assisted', author: `AI-assisted; curated by ${reviewer.trim()}`, license: rightsNote.trim() },
    review: { reviewer: reviewer.trim(), reviewedAt: new Date().toISOString(), readableAt64px: true, subjectRecognizableWithoutLabel: true, noUnwantedMeaning: true, tegeeraStyleConsistent: true }
  }));
  await saveJson(join(ROOT, 'src', 'glyphs', 'offline-pack.json'), { formatVersion: '1.0.0', entries });
  console.log(`Imported ${entries.length} approved glyphs. Run npm test and visually verify the app.`);
}

async function main() {
  if (has('--help')) { console.log('Usage: node scripts/build-glyph-pack.mjs [--nouns nouns.txt] [--execute --model MODEL --max-images N] [--mode binary|color] | --import-approved approved.json --reviewer NAME --rights-note VERIFIED_TERMS'); return; }
  await mkdir(VISUAL, { recursive: true }); await mkdir(OUT, { recursive: true });
  if (has('--import-approved')) return importApproved(resolve(option('--import-approved')), option('--reviewer'), option('--rights-note'));
  const nouns = parseNouns(await readFile(resolve(option('--nouns', join(ROOT, 'nouns.txt'))), 'utf8'));
  const manifestPath = join(VISUAL, 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : { formatVersion: '1.0.0', items: {} };
  let manifestWrite = Promise.resolve();
  const persistManifest = () => { manifestWrite = manifestWrite.then(() => saveJson(manifestPath, manifest)); return manifestWrite; };
  const mode = option('--mode', 'binary');
  if (!['binary', 'color'].includes(mode)) throw new Error('Mode must be binary or color');
  if (!has('--execute')) { console.log(`Dry run: ${nouns.length} nouns, ${nouns.filter((n) => manifest.items[n.slug]?.status !== 'ready').length} not ready. No API calls. Use --execute --model MODEL --max-images N to spend credits.`); return; }
  const model = option('--model'); const max = Number(option('--max-images', '0'));
  if (!model || !Number.isInteger(max) || max < 1) throw new Error('Explicit --model and positive --max-images are required');
  if (!process.env.OPENROUTER_API_KEY) throw new Error('Set OPENROUTER_API_KEY in your shell; never put it in the repo');
  const pending = nouns.filter((n) => manifest.items[n.slug]?.status !== 'ready').slice(0, max);
  let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const item = pending[cursor++];
      const png = join(VISUAL, `${item.slug}.png`), traced = join(VISUAL, `${item.slug}.traced.svg`);
      try {
        const image = await withRetry(() => fetchImage(item.noun, model, AbortSignal.timeout(45_000)));
        await writeFile(png, image);
        await runVtracer(png, traced, mode);
        const source = await readFile(traced, 'utf8');
        extractSafePaths(source); // fail closed before optimizer touches untrusted XML
        const optimized = optimize(source, { multipass: true }).data;
        const normalized = normalizeSvg(optimized);
        await writeFile(join(OUT, `${item.slug}.svg`), normalized.svg);
        manifest.items[item.slug] = { status: 'ready', noun: item.noun, synonyms: item.synonyms, glyph: normalized.glyph, model, mode };
        console.log(`Candidate ready: ${item.noun}`);
      } catch (error) {
        manifest.items[item.slug] = { status: 'failed', noun: item.noun, error: error instanceof Error ? error.message : 'Unknown error' };
        console.error(`Candidate failed: ${item.noun}: ${manifest.items[item.slug].error}`);
      }
      await persistManifest();
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
  const entries = nouns.filter((n) => manifest.items[n.slug]?.status === 'ready').map((n) => ({ noun: n.noun, synonyms: n.synonyms, anchors: manifest.items[n.slug].glyph.anchors, glyph: manifest.items[n.slug].glyph, svg: manifest.items[n.slug].glyph.parts.length ? undefined : '' }));
  for (const entry of entries) entry.svg = await readFile(join(OUT, `${slug(entry.noun)}.svg`), 'utf8');
  await saveJson(join(OUT, 'glyphs.json'), { formatVersion: '1.0.0', entries: entries.map(({ svg: _svg, ...entry }) => entry) });
  await writeFile(join(VISUAL, 'glyph-contact-sheet.html'), contactSheet(entries));
  console.log(`${entries.length} candidates. Open .visual-check/glyph-contact-sheet.html, inspect and export approved.json.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
