import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("a captured blueprint can be replayed through the current renderer without a provider key", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tegeera-replay-"));
  try {
    const candidateFile = join(directory, "candidate.json");
    const reportFile = join(directory, "report.json");
    const candidate = { blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
      objects: ["roof", "rain", "gutter", "barrel"].map((id, index) => ({
        id, label: id, kind: "generic", x: 14 + index * 24, y: 50
      })), connections: [
        { from: "roof", to: "rain", label: "feeds" },
        { from: "rain", to: "gutter", label: "passes through" },
        { from: "gutter", to: "barrel", label: "enters" },
        { from: "roof", to: "gutter", label: "leads through" }
      ] };
    await writeFile(candidateFile, JSON.stringify(candidate));
    const child = spawnSync(process.execPath, [join(import.meta.dirname, "probe-novel-graphs.mjs"),
      "--id", "d", "--count", "1", "--replay-candidate", candidateFile, "--out", reportFile], {
      cwd: join(import.meta.dirname, ".."), encoding: "utf8", timeout: 30_000,
      env: { ...process.env, NEBIUS_API_KEY: "", NVIDIA_API_KEY: "", OPENROUTER_API_KEY: "" }
    });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const report = JSON.parse(await readFile(reportFile, "utf8"));
    assert.equal(report.rows[0].replay, true);
    assert.equal(report.rows[0].attempts, 0);
    assert.equal(report.rows[0].rendered, true);
    assert.equal(report.rows[0].connectionCount, 3);
    assert.equal(report.rows[0].links.some((link) => link.includes("feeds")), false);
    assert.equal((await readFile(report.rows[0].reviewFile, "utf8")).includes("roof feeds rain"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
