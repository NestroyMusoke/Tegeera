#!/usr/bin/env node
// Explicit credit-consuming experiment. Gold annotations are never placed in prompts.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { interpretScene, modelConfiguration } from "../server/engine.mjs";
import { parseTeacherStatements, scoreBlueprint } from "./score-blueprint-gold.mjs";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const ids = option("--ids", "1,2,11").split(",").map(Number);
const modes = option("--modes", "default,off").split(",");
const responseFormat = option("--response-format", "default");
if (args.includes("--help")) {
  console.log("Usage: npm run benchmark:nebius-latency -- [--ids 1,2,11] [--modes default,low,off] [--response-format default|json|schema] [--out .visual-check/nebius-reasoning-benchmark.json]");
  process.exit(0);
}
if (!ids.length || ids.length > 3 || ids.some((id) => !Number.isInteger(id))
  || new Set(ids).size !== ids.length || modes.length < 1 || modes.length > 3
  || modes.some((mode) => !["default", "low", "off"].includes(mode)) || new Set(modes).size !== modes.length
  || !["default", "json", "schema"].includes(responseFormat)) {
  throw new Error("This experiment is limited to three unique gold IDs and the default/low/off thinking modes.");
}
const config = modelConfiguration();
if (config?.provider !== "nebius" || !config.model.toLowerCase().includes("nemotron")) {
  throw new Error("A private Nebius Nemotron key is required in ignored server/.env.local; no provider call was made.");
}
const gold = JSON.parse(await readFile(join(root, "evaluation", "independent-scene-gold-v1.json"), "utf8"));
const statements = parseTeacherStatements(await readFile(join(root, "evaluation", "independent-teacher-corpus.md"), "utf8"));
for (const id of ids) if (!gold.cases.some((item) => item.id === id) || !statements.has(id)) {
  throw new Error(`Case ${id} has no frozen gold annotation.`);
}
const output = resolve(option("--out", join(root, ".visual-check", "nebius-reasoning-benchmark.json")));
const rows = [];
const tasks = ids.flatMap((id, index) => (index % 2 ? [...modes].reverse() : modes).map((mode) => ({ id, mode })));
for (const [index, task] of tasks.entries()) {
  if (index) await new Promise((done) => setTimeout(done, 6000));
  const started = performance.now();
  let row;
  try {
    const result = await interpretScene({ text: statements.get(task.id), scene: { entities: [], relations: [] } }, config,
      { nebiusThinking: task.mode, nebiusResponseFormat: responseFormat, signal: AbortSignal.timeout(45_000) });
    const score = scoreBlueprint(gold.cases.find((item) => item.id === task.id), result.candidate);
    row = { id: task.id, mode: task.mode, responseFormat, semanticReady: score.semanticReady,
      concepts: score.conceptCoverage, topology: score.topologyCoverage, predicates: score.predicateCoverage,
      missingConcepts: score.missingConcepts, missingEdges: score.missingEdges,
      unverifiedPredicates: score.unverifiedPredicates,
      elapsedMs: Math.round(performance.now() - started), providerAttemptMs: result.providerAttemptMs,
      providerAttempts: result.providerAttempts, usage: result.usage };
  } catch (error) {
    row = { id: task.id, mode: task.mode, responseFormat, semanticReady: false,
      elapsedMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message.slice(0, 160) : "Unknown provider error" };
  }
  rows.push(row);
  console.log(`#${row.id} ${row.mode}: ${row.semanticReady ? "semantic-ready" : "not ready"}; ${row.elapsedMs}ms; ${row.providerAttempts ?? "?"} attempts; ${row.usage?.totalTokens ?? "?"} tokens`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({ schemaVersion: "1.0.0", provider: "nebius", model: config.model, rows }, null, 2)}\n`);
}
console.log(`Saved bounded quality/latency measurements to ${output}. No key or raw response was recorded.`);
