import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
test("container source selection includes the complete server import graph", async () => {
  const dockerfile = await readFile(join(root, "server/Dockerfile"), "utf8");
  const serverFiles = ["package.json", "index.mjs", "engine.mjs", "sceneResponseSchema.mjs", "providerBudget.mjs", "glyphResultCache.mjs", "deploymentSafety.mjs", "remoteBudget.mjs"];
  assert.ok(dockerfile.includes(`COPY ${serverFiles.map((file) => `server/${file}`).join(" ")} ./server/`));
  assert.ok(dockerfile.includes("COPY shared/*.mjs ./shared/"));
  assert.ok(dockerfile.includes('CMD ["node", "server/index.mjs"]'));
  const directory = await mkdtemp(join(tmpdir(), "tegeera-package-"));
  try {
    for (const folder of ["server", "shared"]) await mkdir(join(directory, folder));
    for (const file of serverFiles) await copyFile(join(root, "server", file), join(directory, "server", file));
    for (const file of (await readdir(join(root, "shared"))).filter((name) => name.endsWith(".mjs"))) {
      await copyFile(join(root, "shared", file), join(directory, "shared", file));
    }
    const runtime = await import(pathToFileURL(join(directory, "server/index.mjs")).href);
    assert.equal(typeof runtime.createInterpreterServer, "function");
  } finally {
    assert.equal(dirname(directory), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith("tegeera-package-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("container context defaults to excluding files and explicitly excludes credentials", async () => {
  const rules = (await readFile(join(root, ".dockerignore"), "utf8")).split(/\r?\n/)
    .map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  assert.equal(rules[0], "**");
  assert.deepEqual(rules.filter((line) => line.startsWith("!")), [
    "!server/", "!server/Dockerfile", "!server/package.json", "!server/index.mjs",
    "!server/engine.mjs", "!server/sceneResponseSchema.mjs", "!server/providerBudget.mjs", "!server/glyphResultCache.mjs", "!server/deploymentSafety.mjs", "!server/remoteBudget.mjs", "!shared/", "!shared/*.mjs"
  ]);
  assert.deepEqual(rules.slice(-2), ["**/.env*", "**/*.local"]);
});
