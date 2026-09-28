#!/usr/bin/env node
// Explicit credit-consuming probe. Gold roles and links never enter model calls.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { interpretScene, modelConfiguration } from "../server/engine.mjs";
import { scoreNovelGraph } from "./score-novel-graphs.mjs";
import { renderNovelScene } from "./render-novel-scene.mjs";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const count = Number(option("--count", "4"));
const seed = Number(option("--seed", "20260928"));
const specificId = option("--id", "");
const excluded = new Set(option("--exclude", "").split(",").filter(Boolean));
if (!Number.isInteger(count) || count < 1 || count > 5 || !Number.isInteger(seed)) {
  throw new Error("Use --count 1..5 and an integer --seed. Each selected case may make two paid model calls.");
}
const configuration = modelConfiguration();
if (configuration?.provider !== "nebius") throw new Error("This probe requires an ignored private Nebius key; no call was made.");
const corpus = JSON.parse(await readFile(join(root, "evaluation", "novel-graph-probes.json"), "utf8"));
const shuffled = [...corpus.cases];
let state = seed >>> 0;
for (let index = shuffled.length - 1; index > 0; index -= 1) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  const other = state % (index + 1);
  [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
}
const selected = specificId ? shuffled.filter((item) => item.id === specificId).slice(0, 1)
  : shuffled.filter((item) => !excluded.has(item.id)).slice(0, count);
if (!selected.length) throw new Error("Unknown probe ID; no model call was made.");
const output = resolve(option("--out", join(root, ".visual-check", "novel-graph-probe.json")));
const renderDirectory = output.replace(/\.json$/i, "-render");
const rows = [];
for (const [index, item] of selected.entries()) {
  if (index) await new Promise((done) => setTimeout(done, 6000));
  const started = performance.now();
  let row;
  try {
    const result = await interpretScene({ text: item.text, scene: { entities: [], relations: [] } }, configuration,
      { signal: AbortSignal.timeout(42_000) });
    const score = scoreNovelGraph(item, result.candidate);
    row = { id: item.id, ...score, accepted: result.candidate.confidence >= 0.58,
      confidence: result.candidate.confidence, attempts: result.providerAttempts,
      elapsedMs: Math.round(performance.now() - started), objectCount: result.candidate.objects.length,
      connectionCount: result.candidate.connections.length,
      // These probes are public synthetic sentences; labels are saved only in
      // the ignored local report to diagnose abstraction/copying failures.
      objectLabels: result.candidate.objects.map((object) => object.label.slice(0, 32)),
      links: result.candidate.connections.map((edge) => `${edge.from}->${edge.to}:${edge.kind ?? edge.label}`.slice(0, 96)) };
    try {
      const file = await renderNovelScene(renderDirectory, item, result.candidate, score);
      row.rendered = true;
      row.reviewFile = file;
    } catch (error) {
      row.rendered = false;
      row.renderError = error instanceof Error ? error.message.slice(0, 200) : "Unknown render error";
    }
  } catch (error) {
    row = { id: item.id, graphComplete: false, accepted: false,
      elapsedMs: Math.round(performance.now() - started), attempts: error?.providerAttempts ?? null,
      error: error instanceof Error ? error.message.slice(0, 160) : "Unknown error",
      ...(typeof error?.diagnostic === "string" ? { diagnostic: error.diagnostic.slice(0, 200) } : {}),
      ...(error?.candidateSummary ? { candidateSummary: error.candidateSummary } : {}) };
  }
  rows.push(row);
  console.log(`${item.id}: ${row.graphComplete ? "graph complete" : "not complete"}; ${row.elapsedMs}ms; ${row.attempts ?? "?"} attempt(s)`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({ schemaVersion: "1.0.0", seed, selectedIds: selected.map(({ id }) => id),
    scoringLimit: "Roles and directed endpoints only; no predicate or visual approval", rows }, null, 2)}\n`);
}
console.log(`Graph-complete ${rows.filter((row) => row.graphComplete).length}/${rows.length}. Saved bounded local report to ${output}.`);
