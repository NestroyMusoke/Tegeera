import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWebServer } from "./web.mjs";

test("single-origin web server serves only public build assets and protects API routes", async t => {
  const root = await mkdtemp(join(tmpdir(), "tegeera-web-test-"));
  const directory = join(root, "dist"); await mkdir(directory); await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), "<h1>Tegeera test</h1>");
  await writeFile(join(directory, "assets", "index-abc123.js"), "console.log('public')");
  await writeFile(join(directory, "film.mp4"), Buffer.from("0123456789"));
  await writeFile(join(directory, ".env"), "SECRET=must-not-leak");
  await writeFile(join(root, "secret.json"), '{"secret":"must-not-leak"}');
  await mkdir(join(root, "outside"));
  await writeFile(join(root, "outside", "private.json"), '{"secret":"must-not-leak"}');
  await symlink(join(root, "outside"), join(directory, "escaped"), process.platform === "win32" ? "junction" : "dir");
  const server = createWebServer({ directory, apiOptions: { configuration: null, allowedOrigins: new Set(["https://tegeera.example"]) } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base); assert.equal(page.status, 200); assert.match(await page.text(), /Tegeera/);
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal((await fetch(base, { method: "HEAD" })).headers.get("content-length"), String(Buffer.byteLength("<h1>Tegeera test</h1>")));
  assert.match((await fetch(`${base}/assets/index-abc123.js`)).headers.get("cache-control"), /immutable/);
  const film = await fetch(`${base}/film.mp4`);
  assert.equal(film.headers.get("content-type"), "video/mp4");
  assert.equal(film.headers.get("accept-ranges"), "bytes");
  for (const [range, expected] of [["bytes=2-5", "2345"], ["bytes=6-", "6789"], ["bytes=-3", "789"]]) {
    const partial = await fetch(`${base}/film.mp4`, { headers: { Range: range } });
    assert.equal(partial.status, 206); assert.equal(await partial.text(), expected);
  }
  for (const range of ["bytes=99-", "bytes=5-2", "bytes=-0", "bytes=0-2,4-5", "bytes=-"]) {
    assert.equal((await fetch(`${base}/film.mp4`, { headers: { Range: range } })).status, 416);
  }
  for (const path of ["/.env", "/%2eenv", "/..%2fsecret.json", "/%5c..%5csecret.json", "/escaped/private.json", "/server/engine.mjs", "/unknown", "/bad%zz"]) {
    const response = await fetch(base + path); assert.equal(response.status, 404, path); assert.doesNotMatch(await response.text(), /must-not-leak/);
  }
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal((await (await fetch(`${base}/api/health`)).json()).configured, false);
  assert.equal((await fetch(`${base}/api/health`, { headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await fetch(`${base}/api/v1/interpret`, { method: "POST", headers: { Origin: "https://tegeera.example", "Content-Type": "application/json" }, body: "{}" })).status, 503);
  assert.equal((await fetch(`${base}/api/v1/interpret`, { method: "OPTIONS", headers: { Origin: "https://tegeera.example" } })).status, 204);
});
