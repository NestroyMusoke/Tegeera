#!/usr/bin/env node
// Bounded candidate intake. Nothing is added to the shipped pack here.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { parseNouns } from './build-glyph-pack.mjs';
import { validateNoun, fetchSample, parseCandidates, selectCandidates, reviewHtml, overviewSvg } from './quickdraw-candidates.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
const has = (name) => args.includes(name);
const saveJson = (path, data) => writeFile(path, `${JSON.stringify(data, null, 2)}\n`);

export function queueNouns(text, limit = 30) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Batch limit must be 1–100 nouns.');
  return parseNouns(text).slice(0, limit).map(({ noun }) => ({ noun, valid: (() => {
    try { validateNoun(noun); return true; } catch { return false; }
  })() }));
}

export function classifyFetchError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /\bHTTP 404\b/.test(message) ? 'unsupported' : 'failed';
}

export async function runBatch({ nounsText, outDir, maxNouns = 30, rangeBytes = 500_000,
  candidatesPerNoun = 12, concurrency = 2, refresh = false, fetchText = fetchSample }) {
  if (!Number.isInteger(rangeBytes) || rangeBytes < 10_000 || rangeBytes > 1_000_000) throw new Error('Range must be 10,000–1,000,000 bytes.');
  if (!Number.isInteger(candidatesPerNoun) || candidatesPerNoun < 1 || candidatesPerNoun > 40) throw new Error('Candidates per noun must be 1–40.');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('Concurrency must be 1–4.');
  const nouns = queueNouns(nounsText, maxNouns);
  await mkdir(outDir, { recursive: true });
  const statePath = join(outDir, 'batch-state.json');
  let state;
  try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = { formatVersion: '1.0.0', items: {} };
  }
  if (state.formatVersion !== '1.0.0' || !state.items || Array.isArray(state.items) || typeof state.items !== 'object') {
    throw new Error('Invalid batch state. Preserve it and investigate before retrying.');
  }
  // Preserve completed work across runs. Failed network requests may be retried;
  // a missing dataset category is recorded instead of stopping the batch.
  const pending = nouns.filter(({ noun }) => refresh || !['ready', 'unsupported'].includes(state.items[noun]?.status));
  let cursor = 0;
  let stateWrite = Promise.resolve();
  const persist = () => { stateWrite = stateWrite.then(() => saveJson(statePath, state)); return stateWrite; };
  async function worker() {
    while (cursor < pending.length) {
      const { noun, valid } = pending[cursor++];
      if (!valid) {
        state.items[noun] = { status: 'unsupported', reason: 'Not a valid Quick Draw category name.' };
      } else {
        try {
          const text = await fetchText(noun, rangeBytes);
          const entries = selectCandidates(parseCandidates(text, noun), noun, candidatesPerNoun);
          state.items[noun] = entries.length
            ? { status: 'ready', entries, sampledBytes: rangeBytes }
            : { status: 'failed', reason: 'No usable recognized drawings in bounded sample.' };
        } catch (error) {
          state.items[noun] = { status: classifyFetchError(error), reason: error instanceof Error ? error.message.slice(0, 240) : 'Unknown error' };
        }
      }
      await persist();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
  const entries = nouns.flatMap(({ noun }) => state.items[noun]?.status === 'ready' ? state.items[noun].entries : []);
  await saveJson(join(outDir, 'candidates.json'), { formatVersion: '1.0.0', source: 'https://github.com/googlecreativelab/quickdraw-dataset', license: 'CC BY 4.0', entries });
  await writeFile(join(outDir, 'contact-sheet.html'), reviewHtml(entries));
  if (entries.length) await writeFile(join(outDir, 'contact-sheet.png'), Buffer.from(new Resvg(overviewSvg(entries)).render().asPng()));
  const counts = Object.fromEntries(['ready', 'unsupported', 'failed'].map((status) => [status, nouns.filter(({ noun }) => state.items[noun]?.status === status).length]));
  return { ...counts, candidates: entries.length, requested: pending.length, outDir };
}

async function main() {
  if (has('--help')) {
    console.log('Usage: node scripts/quickdraw-batch.mjs [--nouns nouns.txt] [--out-dir .visual-check/quickdraw-batch] [--max-nouns 30] [--range-bytes 500000] [--candidates-per-noun 12] [--concurrency 2] [--refresh]');
    return;
  }
  const nounsText = await readFile(resolve(option('--nouns', join(ROOT, 'nouns.txt'))), 'utf8');
  const result = await runBatch({ nounsText, outDir: resolve(option('--out-dir', join(ROOT, '.visual-check', 'quickdraw-batch'))),
    maxNouns: Number(option('--max-nouns', '30')), rangeBytes: Number(option('--range-bytes', '500000')),
    candidatesPerNoun: Number(option('--candidates-per-noun', '12')), concurrency: Number(option('--concurrency', '2')),
    refresh: has('--refresh') });
  console.log(`${result.candidates} unapproved candidates from ${result.ready} nouns; ${result.unsupported} unsupported, ${result.failed} failed, ${result.requested} attempted this run. Review ${join(result.outDir, 'contact-sheet.html')}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
