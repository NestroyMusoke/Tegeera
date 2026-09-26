#!/usr/bin/env node
// Read-only benchmark client. Gold annotations never become model prompt examples.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseTeacherStatements, summarizeScores } from './score-blueprint-gold.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
const has = (name) => args.includes(name);
const hash = (data) => createHash('sha256').update(data).digest('hex');
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function selectedIds(goldCases) {
  const raw = option('--ids');
  if (!raw) return goldCases.map(({ id }) => id);
  const ids = raw.split(',').map((id) => Number(id.trim()));
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || !goldCases.some((item) => item.id === id))
    || new Set(ids).size !== ids.length) throw new Error('--ids must list unique annotated case numbers.');
  return ids;
}

function safeUrl(value) {
  const url = new URL(value);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('--url must be a bare HTTPS service origin (or localhost HTTP), without credentials or a path.');
  }
  return url.origin;
}

export async function runEvaluation({ gold, corpusMarkdown, outputPath, endpoint, fixtures, maxCases = 3,
  delayMs = 6000, fetchImpl = fetch, fresh = false, dryRun = false, requireNebiusNemotron = false }) {
  if (!Number.isInteger(maxCases) || maxCases < 1 || maxCases > 29) throw new Error('--max-cases must be 1-29.');
  if (!Number.isInteger(delayMs) || delayMs < 6000 || delayMs > 60_000) throw new Error('--delay-ms must be 6000-60000 to respect the prototype rate limit.');
  if (gold.schemaVersion !== '1.0.0' || !Array.isArray(gold.cases)) throw new Error('Invalid gold annotations.');
  const statements = parseTeacherStatements(corpusMarkdown);
  for (const item of gold.cases) if (!statements.has(item.id)) throw new Error(`Teacher statement missing for gold case ${item.id}.`);
  const corpusHash = hash(JSON.stringify(gold) + '\n' + corpusMarkdown);
  const prior = !fresh ? await readFile(outputPath, 'utf8').then(JSON.parse).catch(() => null) : null;
  if (prior && prior.corpusHash !== corpusHash) throw new Error('Saved results use a different corpus. Pass --fresh to start a separate run.');
  const mode = fixtures ? 'fixture' : 'live';
  if (prior && prior.mode !== mode) throw new Error('Saved results use a different evaluation mode. Pass --fresh to start a separate run.');
  const responses = { ...(prior?.responses ?? {}) };
  const ids = selectedIds(gold.cases).slice(0, maxCases);
  if (dryRun) return { ids, corpusHash, resumed: Object.keys(responses).length, summary: summarizeScores(gold.cases, responses) };
  let provider = 'fixture', model = null, service = null;
  if (fixtures) {
    const data = typeof fixtures === 'string' ? JSON.parse(await readFile(fixtures, 'utf8')) : fixtures;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Response fixtures must be an object keyed by case ID.');
    for (const id of ids) if (Object.hasOwn(data, id) && !Object.hasOwn(responses, id)) responses[id] = data[id];
  } else {
    if (!endpoint) throw new Error('Supply --url with a configured Tegeera service or --responses with local fixtures.');
    service = safeUrl(endpoint);
    if (prior?.service && prior.service !== service) throw new Error('Saved results use a different service. Pass --fresh to start a separate run.');
    const health = await fetchImpl(`${service}/health`, { signal: AbortSignal.timeout(10_000) });
    if (!health.ok) throw new Error(`Service health returned HTTP ${health.status}.`);
    const status = await health.json();
    if (!status.configured) throw new Error('Hosted model is not configured; no live inference was run.');
    if (requireNebiusNemotron && (status.provider !== 'nebius' || !String(status.model ?? '').toLowerCase().includes('nemotron'))) {
      throw new Error('This run requires Nebius Token Factory serving an NVIDIA Nemotron model; no inference was run.');
    }
    provider = status.provider ?? 'unknown'; model = status.model ?? null;
    let called = 0;
    for (const id of ids) {
      if (Object.hasOwn(responses, id)) continue;
      if (called) await sleep(delayMs);
      const start = performance.now();
      let result;
      try {
        const response = await fetchImpl(`${service}/v1/interpret`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(50_000),
          body: JSON.stringify({ text: statements.get(id), scene: { sceneId: 'gold-evaluation', revision: 0, entities: [], relations: [] }, reusableGlyphNouns: [] })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          result = { error: `HTTP ${response.status}: ${String(payload?.error ?? 'unknown').slice(0, 160)}` };
        } else if (requireNebiusNemotron && (payload?.provider !== 'nebius' || !String(payload?.model ?? '').toLowerCase().includes('nemotron'))) {
          result = { error: 'Response provider/model did not match Nebius Nemotron.' };
        } else result = { candidate: payload?.candidate ?? null, provider: payload?.provider ?? provider,
          model: payload?.model ?? model, usage: payload?.usage ?? null,
          providerAttempts: Number.isInteger(payload?.providerAttempts) ? payload.providerAttempts : null };
        if (response.status === 429) {
          // Leave this ID pending so a later run can resume it without --fresh.
          console.warn(`#${id}: rate-limited; stopping without retrying or caching this case.`);
          break;
        }
      } catch (error) {
        result = { error: `Request failed: ${error instanceof Error ? error.message.slice(0, 160) : 'unknown'}` };
      }
      responses[id] = { ...result, latencyMs: Math.round(performance.now() - start) };
      called += 1;
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, `${JSON.stringify({ formatVersion: '1.0.0', corpusHash, mode, service, provider, model, responses }, null, 2)}\n`);
      const score = summarizeScores(gold.cases.filter((item) => item.id === id), { [id]: responses[id] }).scores[0];
      console.log(`#${id}: ${score.observedIntent}; concepts ${score.conceptCoverage?.matched ?? 0}/${score.conceptCoverage?.required ?? 0}; directed links ${score.topologyCoverage?.matched ?? 0}/${score.topologyCoverage?.required ?? 0}; ${responses[id].latencyMs}ms`);
    }
  }
  const summary = summarizeScores(gold.cases, responses);
  const report = { formatVersion: '1.0.0', corpusHash, mode, service, provider, model, responses, summary };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return { ids, corpusHash, resumed: Object.keys(prior?.responses ?? {}).length, summary };
}

async function main() {
  if (has('--help')) {
    console.log('Usage: node scripts/evaluate-hosted-gold.mjs --url https://SERVICE --max-cases 3 [--require-nebius-nemotron] [--ids 1,2,11] [--delay-ms 6000] [--fresh] [--out .visual-check/hosted-gold-report.json] | --responses fixtures.json');
    return;
  }
  const gold = JSON.parse(await readFile(join(ROOT, 'evaluation', 'independent-scene-gold-v1.json'), 'utf8'));
  const corpusMarkdown = await readFile(join(ROOT, 'evaluation', 'independent-teacher-corpus.md'), 'utf8');
  const result = await runEvaluation({ gold, corpusMarkdown,
    outputPath: resolve(option('--out', join(ROOT, '.visual-check', 'hosted-gold-report.json'))),
    endpoint: option('--url'), fixtures: option('--responses'), maxCases: Number(option('--max-cases', '3')),
    delayMs: Number(option('--delay-ms', '6000')), fresh: has('--fresh'), dryRun: has('--dry-run'),
    requireNebiusNemotron: has('--require-nebius-nemotron') });
  const { summary } = result;
  console.log(`Annotated ${summary.annotatedTotal}; evaluated ${summary.evaluated}; semantic-ready ${summary.semanticReady}; false-confident ${summary.falseConfident}; visually approved ${summary.visuallyApproved} (not assessed).`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
