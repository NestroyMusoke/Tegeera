#!/usr/bin/env node
// Explicit credit-consuming probe. Gold roles and links never enter model calls.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { interpretScene, modelConfiguration } from "../server/engine.mjs";
import { scoreNovelGraph } from "./score-novel-graphs.mjs";
import { renderNovelScene } from "./render-novel-scene.mjs";
import { auditRenderedScene } from "./visual-probe-audit.mjs";
import { completeExplicitPassages } from "../shared/sourceConstraints.mjs";
import { normalizeOptionalTypedKinds, normalizeOrdinaryCarry } from "../shared/normalizeBlueprint.mjs";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const count = Number(option("--count", "4"));
const seed = Number(option("--seed", "20260928"));
const specificId = option("--id", "");
const corpusFile = option("--corpus", join(root, "evaluation", "novel-graph-probes.json"));
const replayCandidate = option("--replay-candidate", "");
const excluded = new Set(option("--exclude", "").split(",").filter(Boolean));
if (!Number.isInteger(count) || count < 1 || count > 5 || !Number.isInteger(seed)) {
  throw new Error("Use --count 1..5 and an integer --seed. Each selected case may make two paid model calls.");
}
if (replayCandidate && (!specificId || count !== 1)) {
  throw new Error("Replay requires --id and --count 1; no model call was made.");
}
const configuration = replayCandidate ? null : modelConfiguration();
if (!replayCandidate && configuration?.provider !== "nebius") throw new Error("This probe requires an ignored private Nebius key; no call was made.");
const corpus = JSON.parse(await readFile(resolve(corpusFile), "utf8"));
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
  if (index && !replayCandidate) await new Promise((done) => setTimeout(done, 6000));
  const started = performance.now();
  let row;
  try {
    const result = replayCandidate
      ? { candidate: JSON.parse(await readFile(resolve(replayCandidate), "utf8")), providerAttempts: 0 }
      : await interpretScene({ text: item.text, scene: { entities: [], relations: [] } }, configuration,
        { signal: AbortSignal.timeout(42_000) });
    if (!replayCandidate) {
      await mkdir(renderDirectory, { recursive: true });
      await writeFile(join(renderDirectory, `${item.id}-candidate.json`), `${JSON.stringify(result.candidate, null, 2)}\n`);
    }
    const effective = completeExplicitPassages(item.text,
      normalizeOrdinaryCarry(normalizeOptionalTypedKinds(result.candidate)));
    const score = scoreNovelGraph(item, effective);
    row = { id: item.id, replay: Boolean(replayCandidate), ...score, accepted: effective.confidence >= 0.58,
      confidence: effective.confidence, attempts: result.providerAttempts,
      elapsedMs: Math.round(performance.now() - started), objectCount: effective.objects.length,
      connectionCount: effective.connections.length,
      candidateFile: replayCandidate ? resolve(replayCandidate) : join(renderDirectory, `${item.id}-candidate.json`),
      // These probes are public synthetic sentences; labels are saved only in
      // the ignored local report to diagnose abstraction/copying failures.
      objectLabels: effective.objects.map((object) => object.label.slice(0, 32)),
      links: effective.connections.map((edge) => `${edge.from}->${edge.to}:${edge.kind ?? edge.label}`.slice(0, 96)) };
    try {
      const file = await renderNovelScene(renderDirectory, item, effective, score);
      row.rendered = true;
      row.reviewFile = file;
      row.visualAudit = auditRenderedScene(await readFile(file, "utf8"));
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
  console.log(`${item.id}: ${row.graphComplete ? "graph complete" : "not complete"}; ${row.visualAudit?.labelledPlaceholders ?? "?"} labelled placeholders; ${row.elapsedMs}ms; ${row.attempts ?? "?"} attempt(s)`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({ schemaVersion: "1.0.0", seed, selectedIds: selected.map(({ id }) => id),
    scoringLimit: "Roles and directed endpoints only. Placeholder count is automatic; visual quality requires human review.", rows }, null, 2)}\n`);
}
console.log(`Graph-complete ${rows.filter((row) => row.graphComplete).length}/${rows.length}. Saved bounded local report to ${output}.`);
