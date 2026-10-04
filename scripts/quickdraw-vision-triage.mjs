#!/usr/bin/env node
// Blind model triage of candidate art. This never approves or ships a glyph.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { extractSafePaths } from './build-glyph-pack.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const ENDPOINT = 'https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions';
export const VISION_MODEL = 'openbmb/MiniCPM-V-4_5';
const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
const has = (name) => args.includes(name);
const saveJson = (path, data) => writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function visionReportHtml(entries, report) {
  const reviewed = entries.filter((entry) => report.items[entry.id]?.fingerprint === candidateFingerprint(entry));
  const cards = reviewed.map((entry) => {
    const item = report.items[entry.id];
    extractSafePaths(entry.svg);
    const png = Buffer.from(new Resvg(entry.svg, { fitTo: { mode: 'width', value: 64 },
      background: '#ffffff', font: { loadSystemFonts: false } }).render().asPng());
    return `<article><img width="64" height="64" alt="Candidate sketch" src="data:image/png;base64,${png.toString('base64')}"><div><strong>Model guessed:</strong> ${escapeHtml(item.blindGuess ?? item.error ?? 'No guess')}</div><div><strong>Target:</strong> ${escapeHtml(entry.noun)}</div><small>${escapeHtml(entry.id)} · ${escapeHtml(item.status)}</small></article>`;
  }).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tegeera blind vision triage</title><style>body{font:16px system-ui;background:#f4f1e9;color:#27342f;max-width:1000px;margin:24px auto;padding:0 16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}article{background:white;border:1px solid #cad4cb;border-radius:12px;padding:12px}img{display:block;object-fit:contain;margin-bottom:8px}small{color:#62736c;overflow-wrap:anywhere}</style><h1>Blind model guesses — not approvals</h1><p>The vision model saw only 64-pixel sketches, never their target nouns. A matching guess is still not proof of human recognizability; a wrong guess is a useful rejection signal. Make your own blind decision in the separate candidate contact sheet before importing anything.</p><main>${cards}</main></html>`;
}

export function roundRobinCandidates(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.noun)) groups.set(entry.noun, []);
    groups.get(entry.noun).push(entry);
  }
  const ordered = [];
  while ([...groups.values()].some((group) => group.length)) {
    for (const group of groups.values()) if (group.length) ordered.push(group.shift());
  }
  return ordered;
}

export function candidateFingerprint(entry) {
  return createHash('sha256').update(`${entry.id}\n${entry.svg}`).digest('hex').slice(0, 20);
}

export async function blindVisionGuess(entry, { key, model = VISION_MODEL, fetchImpl = fetch }) {
  if (!key?.trim()) throw new Error('NEBIUS_API_KEY is required for vision triage.');
  if (!entry?.svg || typeof entry.svg !== 'string' || entry.svg.length > 30_000) throw new Error('Invalid bounded candidate SVG.');
  extractSafePaths(entry.svg);
  const png = Buffer.from(new Resvg(entry.svg, { fitTo: { mode: 'width', value: 64 },
    background: '#ffffff', font: { loadSystemFonts: false } }).render().asPng());
  if (png.length > 200_000) throw new Error('Candidate preview exceeded 200 KB.');
  const started = performance.now();
  const response = await fetchImpl(ENDPOINT, { method: 'POST', signal: AbortSignal.timeout(20_000),
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 60, stream: false, messages: [{ role: 'user', content: [
      { type: 'text', text: 'Without a label or any suggested subject, identify what this small classroom sketch depicts. If unclear, answer unclear. Reply with at most five words, no explanation.' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}` } }
    ] }] }) });
  if (!response.ok) throw new Error(`Vision API HTTP ${response.status}`);
  const payload = await response.json();
  const answer = payload?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 120) throw new Error('Vision API returned no bounded answer.');
  return { blindGuess: answer.trim(), elapsedMs: Math.round(performance.now() - started),
    usage: Number.isSafeInteger(payload.usage?.total_tokens) ? { totalTokens: payload.usage.total_tokens } : null };
}

export async function runVisionTriage({ outDir, key, model = VISION_MODEL, maxCandidates = 5,
  execute = false, fetchImpl = fetch }) {
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 40) throw new Error('Max candidates must be 1–40.');
  const manifest = JSON.parse(await readFile(join(outDir, 'candidates.json'), 'utf8'));
  if (manifest.formatVersion !== '1.0.0' || !Array.isArray(manifest.entries)) throw new Error('Invalid candidate manifest.');
  const path = join(outDir, 'vision-triage.json');
  let report;
  try { report = JSON.parse(await readFile(path, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    report = { formatVersion: '1.0.0', model, warning: 'Blind model guesses are triage hints, never approval or proof of recognizability.', items: {} };
  }
  if (report.formatVersion !== '1.0.0' || !report.items || Array.isArray(report.items)
    || typeof report.items !== 'object') throw new Error('Invalid vision triage state.');
  const pending = roundRobinCandidates(manifest.entries).filter((entry) =>
    report.items[entry.id]?.fingerprint !== candidateFingerprint(entry)
    || report.items[entry.id]?.model !== model || report.items[entry.id]?.status !== 'guessed').slice(0, maxCandidates);
  if (!execute) {
    if (Object.keys(report.items).length) await writeFile(join(outDir, 'vision-report.html'), visionReportHtml(manifest.entries, report));
    return { attempted: 0, pending: pending.length, total: manifest.entries.length, path };
  }
  if (!key?.trim()) throw new Error('NEBIUS_API_KEY is required. Use the ignored server/.env.local, never the repo or browser.');
  let attempted = 0;
  for (const entry of pending) {
    const fingerprint = candidateFingerprint(entry);
    try {
      const guess = await blindVisionGuess(entry, { key, model, fetchImpl });
      report.items[entry.id] = { status: 'guessed', model, noun: entry.noun, fingerprint, ...guess };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown vision failure.';
      report.items[entry.id] = { status: 'failed', model, noun: entry.noun, fingerprint, error: message.slice(0, 160) };
      // Rate limits and payment failures are account-wide; do not continue spending attempts.
      if (/HTTP (?:402|429)/.test(message)) {
        await saveJson(path, report);
        throw new Error(`${message}; stopped further triage requests.`);
      }
    }
    attempted += 1;
    await saveJson(path, report);
  }
  await writeFile(join(outDir, 'vision-report.html'), visionReportHtml(manifest.entries, report));
  return { attempted, pending: pending.length, total: manifest.entries.length, path };
}

async function main() {
  if (has('--help')) {
    console.log('Usage: node --env-file=server/.env.local scripts/quickdraw-vision-triage.mjs [--out-dir .visual-check/quickdraw-batch] [--execute --max-candidates 5]');
    return;
  }
  const result = await runVisionTriage({ outDir: resolve(option('--out-dir', join(ROOT, '.visual-check', 'quickdraw-batch'))),
    key: process.env.NEBIUS_API_KEY, model: option('--model', VISION_MODEL),
    maxCandidates: Number(option('--max-candidates', '5')), execute: has('--execute') });
  console.log(result.attempted ? `Saved ${result.attempted} blind model guesses to ${result.path}. Human review is still required.`
    : `Dry run: ${result.pending} of ${result.total} candidates would be triaged. Add --execute to use Nebius credits.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
