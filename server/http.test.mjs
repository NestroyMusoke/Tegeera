import { test } from "node:test";
import assert from "node:assert/strict";
import { createInterpreterServer } from "./index.mjs";
import { modelConfiguration } from "./engine.mjs";

async function withServer(settings, run) {
  const server = createInterpreterServer(settings);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("health is honest without a key; Android origin is allowed and unknown origins are rejected", async () => {
  await withServer({ configuration: null, allowedOrigins: new Set(["https://localhost"]) }, async (url) => {
    const health = await fetch(`${url}/health`, { headers: { Origin: "https://localhost" } });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("access-control-allow-origin"), "https://localhost");
    assert.deepEqual(await health.json(), { status: "ok", provider: null, model: null, configured: false });
    const unavailable = await fetch(`${url}/v1/glyph`, {
      method: "POST", headers: { Origin: "https://localhost", "content-type": "application/json" }, body: JSON.stringify({ noun: "dragon" })
    });
    assert.equal(unavailable.status, 503);
    const blocked = await fetch(`${url}/health`, { headers: { Origin: "https://untrusted.example" } });
    assert.equal(blocked.status, 403);
  });
});

test("HTTP interpretation returns a validated blueprint and never exposes its key", async () => {
  const configuration = modelConfiguration({ NVIDIA_API_KEY: "private-test-key" });
  const candidate = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
    objects: [{ id: "book", label: "book", kind: "book", color: "yellow", x: 50, y: 50 }], connections: [] };
  let providerCalls = 0;
  const modelFetch = async (_url, request) => {
    providerCalls += 1;
    assert.equal(request.headers.authorization, "Bearer private-test-key");
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(candidate) } }] }), { status: 200 });
  };
  await withServer({ configuration, allowedOrigins: new Set(["https://localhost"]), modelFetch }, async (url) => {
    const preflight = await fetch(`${url}/v1/interpret`, { method: "OPTIONS", headers: { Origin: "https://localhost" } });
    assert.equal(preflight.status, 204);
    const response = await fetch(`${url}/v1/interpret`, {
      method: "POST", headers: { Origin: "https://localhost", "content-type": "application/json" },
      body: JSON.stringify({ text: "A yellow book", scene: { entities: [], relations: [] } })
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.candidate, candidate);
    assert.equal(result.provider, "nvidia");
    assert.equal(providerCalls, 1);
    assert.ok(!JSON.stringify(result).includes("private-test-key"));
    const invalid = await fetch(`${url}/v1/interpret`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "A book", scene: { entities: [] } })
    });
    assert.equal(invalid.status, 400);
    assert.equal(providerCalls, 1);
  });
});
