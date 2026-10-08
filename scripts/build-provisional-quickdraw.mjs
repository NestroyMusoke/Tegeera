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
  if (entries.size !== manifest.entries.length) throw new Error('Duplicate provisional source ID.');
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
  const selected = resolve(option('--selections', resolve(root, 'scripts', 'provisional-quickdraw-selections.json')));
  const output = resolve(option('--out', resolve(root, 'src', 'glyphs', 'provisional-pack.json')));
  const selections = JSON.parse(await readFile(selected, 'utf8'));
  const directories = args.includes('--source-dir') ? [option('--source-dir')]
    : selections.sourceDirs ?? ['.visual-check/quickdraw-priority'];
  if (!Array.isArray(directories) || !directories.length || directories.length > 20
    || directories.some((directory) => typeof directory !== 'string')) throw new Error('Invalid source directories.');
  const manifest = { formatVersion: '1.0.0', entries: [] };
  const triage = { formatVersion: '1.0.0', items: {} };
  for (const directory of directories) {
    const source = resolve(root, directory);
    const batch = JSON.parse(await readFile(resolve(source, 'candidates.json'), 'utf8'));
    const screening = JSON.parse(await readFile(resolve(source, 'vision-triage.json'), 'utf8'));
    if (batch.formatVersion !== '1.0.0' || !Array.isArray(batch.entries)
      || screening.formatVersion !== '1.0.0' || !screening.items) throw new Error('Invalid source batch.');
    for (const entry of batch.entries) {
      if (manifest.entries.some((prior) => prior.id === entry.id)) throw new Error('Duplicate provisional source ID.');
      manifest.entries.push(entry);
      if (screening.items[entry.id]) triage.items[entry.id] = screening.items[entry.id];
    }
  }
  const pack = createProvisionalPack(manifest, triage, selections);
  await writeFile(output, `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`Wrote ${pack.entries.length} model-screened, human-unreviewed provisional sketches to ${output}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
