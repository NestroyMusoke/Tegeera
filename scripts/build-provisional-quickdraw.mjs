#!/usr/bin/env node
// A separate, visibly provisional tier. Never writes the human-approved pack.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normalizeSvg } from './build-glyph-pack.mjs';
import { blindGuessMatches, candidateFingerprint } from './quickdraw-vision-triage.mjs';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; };

export function createProvisionalPack(manifest, triage, selections) {
  if (manifest?.formatVersion !== '1.0.0' || !Array.isArray(manifest.entries)
    || triage?.formatVersion !== '1.0.0' || !triage.items || typeof triage.items !== 'object'
    || selections?.formatVersion !== '1.0.0' || !Array.isArray(selections.ids)
    || selections.ids.length > 2000) throw new Error('Invalid provisional source files.');
  const entries = new Map(manifest.entries.map((entry) => [entry.id, entry]));
  const nouns = new Set();
  const output = [];
  for (const id of selections.ids) {
    const entry = entries.get(id);
    const assessment = triage.items[id];
    if (!entry || !assessment || assessment.status !== 'guessed'
      || assessment.fingerprint !== candidateFingerprint(entry)
      || !blindGuessMatches(entry.noun, assessment.blindGuess)) {
      throw new Error(`No matching blind 64px model guess for candidate ${id}.`);
    }
    if (nouns.has(entry.noun)) throw new Error(`Duplicate provisional noun: ${entry.noun}`);
    nouns.add(entry.noun);
    const glyph = normalizeSvg(entry.svg).glyph;
    if (entry.sourceUrl !== `https://storage.googleapis.com/quickdraw_dataset/full/simplified/${encodeURIComponent(entry.noun)}.ndjson#key_id=${entry.keyId}`) {
      throw new Error(`Invalid Quick, Draw! source URL for ${id}.`);
    }
    output.push({ noun: entry.noun, glyph,
      provenance: { source: 'Quick, Draw! Dataset', license: 'CC BY 4.0', sourceUrl: entry.sourceUrl,
        drawingId: entry.keyId },
      screening: { status: 'provisional', humanReviewed: false, model: assessment.model,
        blindGuessAt64px: assessment.blindGuess } });
  }
  return { formatVersion: '1.0.0', entries: output };
}

async function main() {
  const source = resolve(option('--source-dir', resolve(root, '.visual-check', 'quickdraw-priority')));
  const selected = resolve(option('--selections', resolve(root, 'scripts', 'provisional-quickdraw-selections.json')));
  const output = resolve(option('--out', resolve(root, 'src', 'glyphs', 'provisional-pack.json')));
  const [manifest, triage, selections] = await Promise.all([
    readFile(resolve(source, 'candidates.json'), 'utf8').then(JSON.parse),
    readFile(resolve(source, 'vision-triage.json'), 'utf8').then(JSON.parse),
    readFile(selected, 'utf8').then(JSON.parse)
  ]);
  const pack = createProvisionalPack(manifest, triage, selections);
  await writeFile(output, `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`Wrote ${pack.entries.length} model-screened, human-unreviewed provisional sketches to ${output}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
