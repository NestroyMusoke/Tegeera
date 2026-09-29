#!/usr/bin/env node
// Optional development audit of an actual Tegeera render. Never used in the live drawing path.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderReviewPng } from './render-review-svg.mjs';

const ENDPOINT = 'https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions';
const ISSUE_TYPES = new Set(['missing', 'direction', 'appearance', 'layout', 'other']);
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function parseVisualVerdict(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, '')) : value;
  if (!parsed || typeof parsed !== 'object' || typeof parsed.clear !== 'boolean' ||
      typeof parsed.uncertain !== 'boolean' || !Array.isArray(parsed.issues) || parsed.issues.length > 4) {
    throw new Error('Vision model returned an invalid verdict.');
  }
  const issues = parsed.issues.map((item) => {
    if (!item || !ISSUE_TYPES.has(item.type) || typeof item.detail !== 'string' ||
        item.detail.length < 5 || item.detail.length > 240) {
      throw new Error('Vision model returned an invalid issue.');
    }
    return { type: item.type, detail: item.detail };
  });
  if (parsed.clear && issues.length) throw new Error('A clear verdict cannot contain issues.');
  return { clear: parsed.clear, uncertain: parsed.uncertain, issues };
}

export async function auditScenePng({ png, statement, model, key, fetchImpl = fetch, timeoutMs = 25000 }) {
  if (!Buffer.isBuffer(png) || png.length > 2_000_000 || !png.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('A valid PNG under 2 MB is required.');
  }
  if (typeof statement !== 'string' || !statement.trim() || statement.length > 1000 ||
      typeof model !== 'string' || !/^[\w./-]{3,120}$/.test(model) ||
      typeof key !== 'string' || !key.trim() || !Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    throw new Error('A bounded statement, explicit vision model, API key, and timeout are required.');
  }
  const prompt = `Compare this actual rendered classroom doodle to the teacher's words. Identify only concrete, visible problems: missing essential objects or stages, reversed arrows/relations, unrecognizable subjects, or overlap/illegibility. Do not infer hidden SVG metadata or assume the drawing is correct from its labels. If uncertain, say so. Return ONLY JSON: {"clear":boolean,"uncertain":boolean,"issues":[{"type":"missing|direction|appearance|layout|other","detail":"specific visual observation"}]}. At most 4 issues. A clear verdict is not human approval. Teacher: ${statement}`;
  const started = performance.now();
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST', signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: false, temperature: 0, max_tokens: 400,
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}` } }
        ] }] })
    });
  } catch {
    throw new Error('Vision audit request failed or timed out.');
  }
  if (!response.ok) throw new Error(`Vision audit provider returned HTTP ${response.status}.`);
  let body;
  try { body = await response.json(); }
  catch { throw new Error('Vision audit provider returned invalid JSON.'); }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length > 5000) throw new Error('Vision audit response was empty or oversized.');
  return { ...parseVisualVerdict(content), durationMs: Math.round(performance.now() - started),
    humanVisualReview: 'pending' };
}

function parseArgs(args) {
  const get = (flag) => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1]; };
  const reviewDir = get('--review-dir'), idsArg = get('--ids'), model = get('--model'), out = get('--out');
  if (!reviewDir || !idsArg || !/^[1-9]\d*(?:,[1-9]\d*){0,4}$/.test(idsArg) || new Set(idsArg.split(',')).size !== idsArg.split(',').length) {
    throw new Error('Usage: node scripts/nebius-visual-audit.mjs --review-dir DIR --ids 1,2 [--model VISION_MODEL] [--execute] [--out DIR]. Maximum 5 unique cases.');
  }
  return { reviewDir: resolve(reviewDir), ids: idsArg.split(',').map(Number), model,
    execute: args.includes('--execute'), out: resolve(out || `.visual-check/nebius-visual-audit-${Date.now()}`) };
}

export async function runAuditCli(args, { key = process.env.NEBIUS_API_KEY, fetchImpl = fetch } = {}) {
  const options = parseArgs(args);
  if (options.execute && (!options.model || !key)) {
    throw new Error('--execute requires --model with a confirmed vision-capable model and NEBIUS_API_KEY.');
  }
  const corpus = await readFile(resolve(import.meta.dirname, '../evaluation/independent-teacher-corpus.md'), 'utf8');
  const statements = new Map([...corpus.matchAll(/^(\d+)\. \*\*\[[EMH]\]\*\* "(.+)"$/gm)]
    .map((match) => [Number(match[1]), match[2]]));
  const entries = [];
  // Complete all local input checks before a paid request or output write.
  for (const id of options.ids) {
    const statement = statements.get(id);
    if (!statement) throw new Error(`Case ${id} is not in the teacher corpus.`);
    const png = renderReviewPng(await readFile(join(options.reviewDir, `case-${id}.html`), 'utf8'), 800);
    entries.push({ id, statement, png });
  }
  await mkdir(options.out, { recursive: true });
  const report = { schemaVersion: '1.0.0', kind: 'model-assisted-render-audit',
    mode: options.execute ? 'live' : 'dry-run', model: options.execute ? options.model : null,
    note: 'Not a human approval or proof of semantic accuracy. Static SVG render, not Android or animation.',
    cases: [] };
  for (const entry of entries) {
    await writeFile(join(options.out, `case-${entry.id}.png`), entry.png);
    let verdict = null, error = null;
    if (options.execute) {
      try { verdict = await auditScenePng({ ...entry, model: options.model, key, fetchImpl }); }
      catch (caught) { error = caught instanceof Error ? caught.message : 'Vision audit failed.'; }
    }
    report.cases.push({ id: entry.id, png: `case-${entry.id}.png`, verdict, error,
      humanVisualReview: 'pending' });
    await writeFile(join(options.out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return { out: options.out, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await runAuditCli(process.argv.slice(2));
    console.log(`${result.report.mode} audit saved to ${result.out}; human visual review remains pending.`);
    if (result.report.cases.some((item) => item.error)) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Vision audit failed.');
    process.exitCode = 1;
  }
}
