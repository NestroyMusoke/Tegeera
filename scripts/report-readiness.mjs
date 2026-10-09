import { build } from "esbuild";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const directory = join(root, ".visual-check", "readiness");
const temporary = await mkdtemp(join(tmpdir(), "tegeera-readiness-"));
const compiled = await build({ entryPoints: [join(root, "src/evaluation/readiness.tsx")], bundle: true,
  platform: "node", format: "cjs", jsx: "automatic", write: false });
const modulePath = join(temporary, "readiness.cjs");
await writeFile(modulePath, compiled.outputFiles[0].text);
const { measureReadiness, metricChange } = createRequire(import.meta.url)(modulePath);
const corpus = await readFile(join(root, "evaluation/independent-teacher-corpus.md"), "utf8");
const annotations = await readFile(join(root, "evaluation/independent-scene-gold-v1.json"), "utf8");
const report = measureReadiness(corpus, JSON.parse(annotations));
report.benchmarkFingerprint = createHash("sha256").update(JSON.stringify(["readiness-v1", corpus, annotations])).digest("hex");
report.generatedAt = new Date().toISOString();
let previous;
try { previous = JSON.parse(await readFile(join(directory, "report.json"), "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw new Error("Previous readiness report is unreadable; refusing to overwrite it."); }
report.changes = Object.fromEntries(Object.entries(report.metrics).map(([name, metric]) =>
  [name, previous && previous.benchmarkFingerprint !== report.benchmarkFingerprint
    ? { status: "benchmark-changed-or-unversioned", percentagePoints: null }
    : metricChange(metric, previous?.metrics?.[name])]));
report.comparisonLimit = "Changes require matching corpus/annotation fingerprints and denominators; scoring-rule changes require a new benchmark version.";
try {
  report.gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  report.workingTreeDirty = Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim());
} catch { report.gitCommit = null; report.workingTreeDirty = null; }
await mkdir(directory, { recursive: true });
await writeFile(join(directory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
const lines = ["# Tegeera measured readiness", "", `Generated: ${report.generatedAt}`, "", report.scope, "",
  "| Metric | Calculation | Result |", "| --- | --- | --- |",
  ...Object.entries(report.metrics).map(([name, metric]) => `| ${name} | ${metric.numerator}/${metric.denominator} | ${metric.percent === null ? "unknown" : `${metric.percent.toFixed(2)}%`} |`),
  "", "These are separate metrics, not a weighted product-completion score.",
  "The strict 3/29-style figure includes control cases, not visually approved drawings; this command does not import approval records.", "",
  "## Change since the previous local report", "",
  ...Object.entries(report.changes).map(([name, delta]) => `- ${name}: ${delta.percentagePoints === null ? delta.status : `${delta.percentagePoints.toFixed(2)} percentage points`}`),
  report.comparisonLimit, "",
  ...Object.entries(report.missingEvidence).map(([name, reason]) => `- ${name}: ${reason}`), "",
  "## Annotated cases not automated-ready", "",
  ...report.annotatedCases.filter((item) => !item.automatedReady).map((item) => `- Case ${item.id}: ${item.failures.join("; ")}`), ""];
await writeFile(join(directory, "report.md"), lines.join("\n"));
console.log(lines.join("\n"));
console.log(`Full case evidence: ${join(directory, "report.json")}`);
