#!/usr/bin/env node
// Intake only. No third-party drawing enters the shipped pack without review.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { normalizeSvg } from './build-glyph-pack.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const DATASET = 'https://storage.googleapis.com/quickdraw_dataset/full/simplified';
const SOURCE = 'https://github.com/googlecreativelab/quickdraw-dataset';
const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
const has = (name) => args.includes(name);
const fail = (message) => { throw new Error(message); };
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const saveJson = (path, data) => writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
const datasetUrl = (noun) => `${DATASET}/${encodeURIComponent(noun)}.ndjson`;

export function validateNoun(noun) {
  if (typeof noun !== 'string' || !/^[a-z][a-z ]{1,46}[a-z]$/.test(noun) || noun.includes('  ')) {
    throw new Error('Use one Quick Draw category name: 3-48 lowercase letters and spaces.');
  }
  return noun;
}

export function parseCandidates(text, noun) {
  validateNoun(noun);
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('Sample exceeds the 2 MB cap.');
  const complete = text.endsWith('\n') ? text : text.slice(0, text.lastIndexOf('\n') + 1);
  const candidates = [];
  for (const line of complete.split('\n')) {
    if (!line || line.length > 10_000) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.word?.toLowerCase() !== noun || entry.recognized !== true
      || !/^\d{1,20}$/.test(String(entry.key_id)) || !Array.isArray(entry.drawing)
      || entry.drawing.length < 2 || entry.drawing.length > 12) continue;
    const valid = entry.drawing.every((stroke) => Array.isArray(stroke) && stroke.length === 2
      && Array.isArray(stroke[0]) && Array.isArray(stroke[1])
      && stroke[0].length === stroke[1].length && stroke[0].length >= 2 && stroke[0].length <= 200
      && stroke.every((axis) => axis.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)));
    if (valid) candidates.push({ keyId: String(entry.key_id), drawing: entry.drawing });
  }
  return candidates;
}

function reduceStroke(stroke) {
  const count = stroke[0].length;
  const step = Math.max(1, Math.ceil(count / 28));
  const points = [];
  for (let index = 0; index < count; index += step) points.push([stroke[0][index], stroke[1][index]]);
  if ((count - 1) % step) points.push([stroke[0][count - 1], stroke[1][count - 1]]);
  return points;
}

export function makeCandidate(noun, sample) {
  validateNoun(noun);
  const rawPaths = sample.drawing.map((stroke) => {
    const points = reduceStroke(stroke);
    return `<path d="${points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')}" fill="none" stroke="#2f3e46"/>`;
  }).join('');
  const { glyph, svg } = normalizeSvg(`<svg xmlns="http://www.w3.org/2000/svg">${rawPaths}</svg>`);
  const allPoints = sample.drawing.flatMap((stroke) => stroke[0].map((x, i) => [x, stroke[1][i]]));
  const xs = allPoints.map((point) => point[0]), ys = allPoints.map((point) => point[1]);
  const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
  const pointCount = allPoints.length;
  // Mechanical ranking only; recognition, content and Tegeera style remain human judgments.
  const score = -Math.abs(sample.drawing.length - 6) * 3 - Math.abs(pointCount - 55) / 12
    - Math.abs(width - height) / 35 + Math.min(width, height) / 80;
  return { id: `${slug(noun)}-${sample.keyId}`, noun, keyId: sample.keyId, glyph, svg, score,
    sourceUrl: `${datasetUrl(noun)}#key_id=${sample.keyId}` };
}

export function selectCandidates(samples, noun, limit = 16) {
  const seen = new Set();
  return samples.flatMap((sample) => {
    if (seen.has(sample.keyId)) return [];
    seen.add(sample.keyId);
    try { return [makeCandidate(noun, sample)]; } catch { return []; }
  }).sort((a, b) => b.score - a.score || a.keyId.localeCompare(b.keyId)).slice(0, limit);
}

export async function fetchSample(noun, byteLimit = 500_000, fetchImpl = fetch) {
  validateNoun(noun);
  if (!Number.isInteger(byteLimit) || byteLimit < 10_000 || byteLimit > 1_000_000) throw new Error('Range must be 10,000-1,000,000 bytes.');
  const response = await fetchImpl(datasetUrl(noun), { headers: { Range: `bytes=0-${byteLimit - 1}` }, signal: AbortSignal.timeout(30_000) });
  if (response.status !== 206) throw new Error(`Dataset range request failed for ${noun} (HTTP ${response.status}).`);
  const data = await response.text();
  if (data.length > byteLimit * 2) throw new Error('Dataset response exceeded the sample cap.');
  return data;
}

export function reviewHtml(entries) {
  const data = JSON.stringify(entries.map(({ id, noun, keyId, svg }) => ({ id, noun, keyId, svg }))).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Tegeera Quick Draw review</title><style>body{font:16px system-ui;background:#f4f1e9;color:#27342f;margin:24px}header{max-width:850px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}.card{background:white;border:2px solid #d1d8d1;border-radius:14px;padding:12px}.card.approved{border-color:#26845f}.card.rejected{opacity:.45}.card img{display:block;width:100%;height:125px;object-fit:contain}.checks{font-size:13px;display:grid;gap:3px}button{min-height:40px;margin:8px 6px 0 0}small{word-break:break-all}</style><header><h1>Candidate doodles — not shipped</h1><p>Quick, Draw! strokes are CC BY 4.0. Check each at 64 px. Approval requires every box. Reject anything unrecognizable, unsafe, visually inconsistent, or misleading. Approve at most one per noun. Attribution and source IDs are retained on import.</p><button id="export">Download decisions.json</button></header><div class="grid" id="grid"></div><script>const entries=${data},choices={},grid=document.getElementById('grid');for(const e of entries){const card=document.createElement('article');card.className='card';const img=document.createElement('img');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(e.svg);img.alt='Candidate '+e.noun;const title=document.createElement('h3');title.textContent=e.noun;const id=document.createElement('small');id.textContent=e.keyId;card.append(img,title,id);const checks=document.createElement('div');checks.className='checks';for(const label of ['Recognizable without label','Readable at 64 px','No inappropriate or misleading content','Fits Tegeera visual style']){const row=document.createElement('label'),box=document.createElement('input');box.type='checkbox';row.append(box,document.createTextNode(' '+label));checks.append(row)}card.append(checks);const yes=document.createElement('button');yes.textContent='Approve';yes.onclick=()=>{if([...checks.querySelectorAll('input')].some(x=>!x.checked)){alert('Check all four review criteria first.');return}for(const other of entries.filter(x=>x.noun===e.noun&&x.id!==e.id)){delete choices[other.id];document.querySelector('[data-id="'+other.id+'"]')?.classList.remove('approved')}choices[e.id]={decision:'approve',checks:[true,true,true,true]};card.className='card approved'};const no=document.createElement('button');no.textContent='Reject';no.onclick=()=>{choices[e.id]={decision:'reject'};card.className='card rejected'};card.dataset.id=e.id;card.append(yes,no);grid.append(card)}document.getElementById('export').onclick=()=>{const blob=new Blob([JSON.stringify({formatVersion:'1.0.0',decisions:choices},null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='quickdraw-decisions.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}</script></html>`;
}

export function overviewSvg(entries) {
  const columns = 5, cellWidth = 188, cellHeight = 166;
  const rows = Math.ceil(entries.length / columns);
  const cards = entries.map((entry, index) => {
    const x = (index % columns) * cellWidth, y = Math.floor(index / columns) * cellHeight;
    const art = entry.glyph.parts.map((part) => `<path d="${part.d}" fill="${part.fill}" stroke="${part.stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    return `<g transform="translate(${x} ${y})"><rect x="3" y="3" width="181" height="158" rx="12" fill="#fff" stroke="#d1d8d1"/><g transform="translate(39 7)">${art}</g><text x="12" y="128" font-family="Arial" font-size="14" fill="#27342f">${entry.noun}</text><text x="12" y="148" font-family="Arial" font-size="11" fill="#69766e">${entry.keyId}</text></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * cellWidth}" height="${rows * cellHeight}" viewBox="0 0 ${columns * cellWidth} ${rows * cellHeight}"><rect width="100%" height="100%" fill="#f4f1e9"/>${cards.join('')}</svg>`;
}

export function importApproved(manifest, decisions, existing, reviewer) {
  if (!reviewer || reviewer.trim().length < 2 || reviewer.length > 100 || !/^[\p{L} .'-]+$/u.test(reviewer)) {
    throw new Error('A named human reviewer is required.');
  }
  if (manifest.formatVersion !== '1.0.0' || !Array.isArray(manifest.entries)
    || decisions.formatVersion !== '1.0.0' || !decisions.decisions || typeof decisions.decisions !== 'object'
    || existing.formatVersion !== '1.0.0' || !Array.isArray(existing.entries)) throw new Error('Invalid manifest, decisions, or pack format.');
  const byId = new Map(manifest.entries.map((entry) => [entry.id, entry]));
  const approved = [];
  for (const [id, decision] of Object.entries(decisions.decisions)) {
    if (!byId.has(id)) throw new Error(`Unknown candidate ID: ${id}`);
    if (decision?.decision !== 'approve') continue;
    if (JSON.stringify(decision.checks) !== '[true,true,true,true]') throw new Error(`Incomplete visual review: ${id}`);
    approved.push(byId.get(id));
  }
  const nouns = new Set(existing.entries.map((entry) => entry.noun.toLowerCase()));
  const next = [...existing.entries];
  for (const candidate of approved) {
    validateNoun(candidate.noun);
    if (!/^\d{1,20}$/.test(String(candidate.keyId)) || candidate.id !== `${slug(candidate.noun)}-${candidate.keyId}`
      || candidate.sourceUrl !== `${datasetUrl(candidate.noun)}#key_id=${candidate.keyId}`) {
      throw new Error(`Invalid source identity: ${candidate.id}`);
    }
    // Reparse the SVG through the same strict allowlist at import time. Never trust
    // a manifest field, even when the candidate file is stored on the same machine.
    const glyph = normalizeSvg(candidate.svg).glyph;
    if (nouns.has(candidate.noun)) throw new Error(`Only one approved glyph per noun: ${candidate.noun}`);
    nouns.add(candidate.noun);
    next.push({ noun: candidate.noun, aliases: [], glyph,
      provenance: { source: 'licensed-third-party', author: 'Quick, Draw! contributor (anonymous)', license: 'CC BY 4.0', sourceUrl: candidate.sourceUrl },
      review: { reviewer: reviewer.trim(), reviewedAt: new Date().toISOString(), readableAt64px: true,
        subjectRecognizableWithoutLabel: true, noUnwantedMeaning: true, tegeeraStyleConsistent: true } });
  }
  return { formatVersion: '1.0.0', entries: next };
}

export function attributionMarkdown(pack) {
  const entries = pack.entries.filter((entry) => entry.provenance?.source === 'licensed-third-party');
  return `# Third-party doodle attributions\n\nThese approved sketches use strokes from [Google's Quick, Draw! Dataset](${SOURCE}), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). They were normalized to Tegeera's viewBox, palette, and line rendering; the underlying strokes were contributed by anonymous Quick, Draw! players. Each source file and drawing ID is linked below.\n\n${entries.length ? entries.map((entry) => `- ${entry.noun} — [source drawing](${entry.provenance.sourceUrl}); reviewed by ${entry.review.reviewer}.`).join('\n') : 'No third-party doodles are shipped.'}\n`;
}

async function main() {
  if (has('--help')) { console.log('Usage: node scripts/quickdraw-candidates.mjs --noun "dragon" [--range-bytes 500000] [--limit 16] [--out-dir .visual-check/quickdraw] | --import-approved decisions.json --reviewer "Name" [--out-dir ...]'); return; }
  const out = resolve(option('--out-dir', join(ROOT, '.visual-check', 'quickdraw')));
  await mkdir(out, { recursive: true });
  const manifestPath = join(out, 'candidates.json');
  if (has('--refresh-sheet')) {
    const entries = JSON.parse(await readFile(manifestPath, 'utf8')).entries;
    await writeFile(join(out, 'contact-sheet.html'), reviewHtml(entries));
    await writeFile(join(out, 'contact-sheet.png'), Buffer.from(new Resvg(overviewSvg(entries)).render().asPng()));
    console.log(`Refreshed ${entries.length} candidates in ${out}.`);
    return;
  }
  if (has('--import-approved')) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const decisions = JSON.parse(await readFile(resolve(option('--import-approved')), 'utf8'));
    const packPath = resolve(option('--pack-output', join(ROOT, 'src', 'glyphs', 'offline-pack.json')));
    const existing = JSON.parse(await readFile(packPath, 'utf8'));
    const pack = importApproved(manifest, decisions, existing, option('--reviewer'));
    const creditsPath = resolve(option('--credits-output', join(ROOT, 'GLYPH_CREDITS.md')));
    await saveJson(packPath, pack);
    await writeFile(creditsPath, attributionMarkdown(pack));
    console.log(`Imported ${pack.entries.length - existing.entries.length} reviewed doodles. Run npm test and inspect the app.`);
    return;
  }
  const noun = validateNoun(option('--noun') || fail('Use --noun with a Quick Draw category.'));
  const range = Number(option('--range-bytes', '500000'));
  const limit = Number(option('--limit', '16'));
  if (!Number.isInteger(limit) || limit < 1 || limit > 40) throw new Error('Limit must be 1-40.');
  const text = has('--source-file') ? await readFile(resolve(option('--source-file')), 'utf8') : await fetchSample(noun, range);
  const selected = selectCandidates(parseCandidates(text, noun), noun, limit);
  if (!selected.length) throw new Error(`No usable ${noun} candidates in this sample; try a larger range or another category.`);
  const previous = has('--replace') ? [] : await readFile(manifestPath, 'utf8').then((data) => JSON.parse(data).entries).catch(() => []);
  const entries = [...previous.filter((entry) => entry.noun !== noun), ...selected];
  await saveJson(manifestPath, { formatVersion: '1.0.0', source: SOURCE, license: 'CC BY 4.0', entries });
  await writeFile(join(out, 'contact-sheet.html'), reviewHtml(entries));
  await writeFile(join(out, 'contact-sheet.png'), Buffer.from(new Resvg(overviewSvg(entries)).render().asPng()));
  console.log(`${selected.length} candidate ${noun} doodles in ${out}. Review contact-sheet.html before any import.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
