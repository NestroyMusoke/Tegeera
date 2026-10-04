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

// A coarse ink occupancy signature. Similar human sketches reinforce a candidate,
// but this is only a review-order hint: agreement is not recognizability.
function inkSignature(sample) {
  const points = sample.drawing.flatMap((stroke) => stroke[0].map((x, index) => [x, stroke[1][index]]));
  const minX = Math.min(...points.map(([x]) => x)), maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y)), maxY = Math.max(...points.map(([, y]) => y));
  const ink = new Float32Array(12 * 12);
  const plot = (x, y) => {
    const column = Math.min(11, Math.max(0, Math.floor((x - minX) / Math.max(1, maxX - minX) * 11)));
    const row = Math.min(11, Math.max(0, Math.floor((y - minY) / Math.max(1, maxY - minY) * 11)));
    ink[row * 12 + column] = 1;
  };
  for (const stroke of sample.drawing) {
    for (let index = 1; index < stroke[0].length; index += 1) {
      const x0 = stroke[0][index - 1], y0 = stroke[1][index - 1];
      const x1 = stroke[0][index], y1 = stroke[1][index];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5));
      for (let step = 0; step <= steps; step += 1) plot(x0 + (x1 - x0) * step / steps, y0 + (y1 - y0) * step / steps);
    }
  }
  // Blur by one cell so a small drawing shift does not destroy similarity.
  return ink.map((_, index) => {
    const x = index % 12, y = Math.floor(index / 12);
    let value = 0;
    for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
      if (x + ox >= 0 && x + ox < 12 && y + oy >= 0 && y + oy < 12) {
        value += ink[(y + oy) * 12 + x + ox] * (ox === 0 && oy === 0 ? 3 : 1);
      }
    }
    return value;
  });
}

function inkSimilarity(a, b) {
  let dot = 0, aa = 0, bb = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]; aa += a[index] ** 2; bb += b[index] ** 2;
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

export function selectCandidates(samples, noun, limit = 16) {
  const seen = new Set();
  const candidates = samples.flatMap((sample) => {
    if (seen.has(sample.keyId)) return [];
    seen.add(sample.keyId);
    try { return [{ ...makeCandidate(noun, sample), signature: inkSignature(sample) }]; } catch { return []; }
  });
  const ranked = candidates.map((candidate, index) => {
    const peers = candidates.flatMap((other, otherIndex) => otherIndex === index ? []
      : [inkSimilarity(candidate.signature, other.signature)]).sort((a, b) => b - a);
    const consensus = peers.length ? peers.slice(0, 5).reduce((sum, value) => sum + value, 0) / Math.min(5, peers.length) : 0;
    return { ...candidate, consensus, reviewOrder: candidate.score + 5 * consensus };
  }).sort((a, b) => b.reviewOrder - a.reviewOrder || a.keyId.localeCompare(b.keyId));
  const selected = [];
  const similar = [];
  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    if (selected.some((prior) => inkSimilarity(prior.signature, candidate.signature) > 0.98)) {
      similar.push(candidate); continue;
    }
    selected.push(candidate);
  }
  selected.push(...similar.slice(0, Math.max(0, limit - selected.length)));
  return selected.map(({ signature, reviewOrder, ...candidate }) => candidate);
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

export function reviewHtml(entries, modelGuesses = {}) {
  const data = JSON.stringify(entries.map(({ id, noun, keyId, svg }) => ({ id, noun, keyId, svg,
    modelGuess: typeof modelGuesses[id] === 'string' ? modelGuesses[id].slice(0, 120) : null }))).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tegeera Quick Draw review</title>
<style>body{font:16px system-ui;background:#f4f1e9;color:#27342f;margin:24px}header{max-width:850px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}.card{background:white;border:2px solid #d1d8d1;border-radius:14px;padding:12px}.card.approved{border-color:#26845f}.card.rejected{opacity:.45}.samples{display:flex;align-items:center;gap:12px;height:132px}.samples img{display:block;object-fit:contain}.small{width:64px;height:64px}.large{width:120px;height:120px}.checks{font-size:13px;display:grid;gap:3px}button{min-height:40px;margin:8px 6px 0 0}small{word-break:break-all}input.guess{width:95%;min-height:30px}</style>
<header><h1>Candidate doodles — not shipped</h1><p>Quick, Draw! strokes are CC BY 4.0. Guess what each 64 px drawing depicts before revealing its category. Lock in your guess, then confirm it matched. Approval also requires four visual checks; reject unrecognizable, unsafe, inconsistent, or misleading drawings. Approve at most one per noun. Attribution and source IDs are retained on import.</p><button id="export">Download decisions.json</button></header><div class="grid" id="grid"></div>
<script>
const entries=${data},choices={},grid=document.getElementById('grid');
for(const e of entries){
  const card=document.createElement('article');card.className='card';card.dataset.id=e.id;
  const samples=document.createElement('div');samples.className='samples';
  for(const [size,label] of [['small','64-pixel candidate'],['large','larger candidate']]){
    const img=document.createElement('img');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(e.svg);
    img.alt=label;img.className=size;samples.append(img)
  }
  card.append(samples);
  const guess=document.createElement('input');guess.className='guess';guess.placeholder='What does it look like?';
  guess.setAttribute('aria-label','Your guess before revealing the target');card.append(guess);
  const reveal=document.createElement('button');reveal.textContent='Reveal target';
  const title=document.createElement('h3');title.textContent=e.noun;title.hidden=true;
  const id=document.createElement('small');id.textContent=e.keyId;id.hidden=true;
  const matched=document.createElement('label');matched.hidden=true;
  const matchBox=document.createElement('input');matchBox.type='checkbox';
  matched.append(matchBox,document.createTextNode(' My locked guess matched the subject'));
  reveal.onclick=()=>{if(!guess.value.trim()){alert('Make a blind guess first.');return}
    guess.disabled=true;title.hidden=false;id.hidden=false;matched.hidden=false;reveal.disabled=true};
  card.append(reveal,title,id,matched);
  const checks=document.createElement('div');checks.className='checks';
  for(const label of ['Recognizable without label','Readable at 64 px','No inappropriate or misleading content','Fits Tegeera visual style']){
    const row=document.createElement('label'),box=document.createElement('input');box.type='checkbox';
    row.append(box,document.createTextNode(' '+label));checks.append(row)
  }
  card.append(checks);
  const yes=document.createElement('button');yes.textContent='Approve';
  const modelNote=document.createElement('p');modelNote.hidden=true;modelNote.className='model-note';
  modelNote.textContent=e.modelGuess?'Model blind guess: '+e.modelGuess:'No model guess recorded';
  yes.onclick=()=>{
    if(title.hidden||!matchBox.checked||[...checks.querySelectorAll('input')].some(x=>!x.checked)){
      alert('Approve only when your locked guess matched and all four review checks pass.');return
    }
    for(const other of entries.filter(x=>x.noun===e.noun&&x.id!==e.id)){
      delete choices[other.id];document.querySelector('[data-id="'+other.id+'"]')?.classList.remove('approved')
    }
    choices[e.id]={decision:'approve',checks:[true,true,true,true],blindGuess:guess.value.trim().slice(0,80),blindGuessMatched:true};
    card.className='card approved';modelNote.hidden=false
  };
  const no=document.createElement('button');no.textContent='Reject';
  no.onclick=()=>{choices[e.id]={decision:'reject'};card.className='card rejected';modelNote.hidden=false};
  card.append(yes,no,modelNote);grid.append(card)
}
document.getElementById('export').onclick=()=>{
  const blob=new Blob([JSON.stringify({formatVersion:'1.0.0',decisions:choices},null,2)],{type:'application/json'}),
    link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='quickdraw-decisions.json';
  link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)
}
</script></html>`;
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
    if (typeof decision.blindGuess !== 'string' || decision.blindGuess.trim().length < 2
      || decision.blindGuess.length > 80 || decision.blindGuessMatched !== true) {
      throw new Error(`A locked, matching blind guess is required: ${id}`);
    }
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
