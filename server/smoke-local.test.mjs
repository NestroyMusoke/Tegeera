import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

async function withMockServer(configured, run) {
  let calls = 0;
  const server = createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/health") {
      response.end(JSON.stringify({ configured, provider: configured ? "nvidia" : null, model: configured ? "test-model" : null }));
    } else {
      calls += 1;
      response.end(JSON.stringify({ candidate: { objects: [{ id: "book" }], connections: [] } }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const output = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [fileURLToPath(new URL("./smoke-local.mjs", import.meta.url))], {
        env: { ...process.env, TEGEERA_LOCAL_URL: `http://127.0.0.1:${server.address().port}` },
        windowsHide: true
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
    await run(output, () => calls);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("local smoke check makes one request only when NVIDIA is configured", async () => {
  await withMockServer(true, (output, calls) => {
    assert.equal(output.code, 0);
    assert.match(output.stdout, /Live interpretation: valid blueprint/);
    assert.equal(calls(), 1);
  });
  await withMockServer(false, (output, calls) => {
    assert.equal(output.code, 1);
    assert.match(output.stderr, /NVIDIA is not configured/);
    assert.equal(calls(), 0);
  });
});
