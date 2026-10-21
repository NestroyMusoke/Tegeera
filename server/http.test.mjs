import { test } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { createInterpreterServer, serviceLimits } from "./index.mjs";
import { modelConfiguration } from "./engine.mjs";

async function withServer(settings, run) {
  const server = createInterpreterServer(settings);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("glyph endpoints negotiate additive geometry without breaking legacy clients", async () => {
  const configuration = modelConfiguration({ NVIDIA_API_KEY: "private-test-key" });
  const stroke = { part: "outline", color: "#2f3e46", pts: [[8,8],[42,8],[42,42],[8,42],[8,8]] };
  const candidate = { strokes: [{ ...stroke, interpolation: "linear" }] };
  let calls = 0;
  const modelFetch = async () => {
    calls++;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(candidate) } }] }));
  };
  await withServer({ configuration, modelFetch }, async (url) => {
    for (const route of ["/v1/glyph", "/v1/glyph/edit"]) {
      for (const strokeFormat of [undefined, "1.0", "1.1"]) {
        const response = await fetch(`${url}${route}`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ noun: "object", strokeFormat, instruction: "keep the outline", current: { strokes: [stroke] } })
        });
        assert.equal(response.status, 200);
        assert.deepEqual((await response.json()).candidate, strokeFormat === "1.1" ? candidate : { strokes: [stroke] });
      }
    }
    const response = await fetch(`${url}/v1/glyph`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ noun: "object", strokeFormat: "unsupported" }) });
    assert.equal(response.status, 400);
    assert.equal(calls, 6);
  });
});

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
    const inflated = await fetch(`${url}/v1/interpret`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        text: "A book", scene: { entities: [], relations: [] }, reusableGlyphNouns: Array(13).fill("book")
      })
    });
    assert.equal(inflated.status, 400);
    const oversizedHint = await fetch(`${url}/v1/interpret`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        text: "A book", scene: { entities: [{ id: "old-book", kind: "book", label: "b".repeat(81), x: 50, y: 50 }], relations: [] }
      })
    });
    assert.equal(oversizedHint.status, 400);
    assert.equal(providerCalls, 1);
  });
});

test("successive interpretations accept existing relationships without optional predicates", async () => {
  let providerCalls = 0;
  const candidate = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
    objects: [{ id: "new-object", label: "object", kind: "generic", x: 50, y: 50 }], connections: [] };
  const entities = Array.from({ length: 12 }, (_, index) => ({ id: `old-${index}`, kind: "book", label: "book", x: 50, y: 50 }));
  const relation = { kind: "owns", sourceIds: [entities[0].id], targetIds: entities.slice(1).map(entity => entity.id) };
  await withServer({ configuration: modelConfiguration({ NVIDIA_API_KEY: "private-test-key" }),
    limits: { perClientPerMinute: 100, maxConcurrentRequests: 2, maxProviderCallsPerDay: 100 },
    modelFetch: async () => {
      providerCalls++;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(candidate) } }] }));
    } }, async url => {
    const post = (text, scene, extra = {}) => fetch(`${url}/v1/interpret`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, scene, ...extra })
    });
    for (const text of ["there was a lion and a car", "A telescope and a suitcase", "A musician stands near a fountain"]) {
      for (const relations of [[], [relation], [{ ...relation, predicate: "owns" }]]) {
        const response = await post(text, { entities, relations });
        assert.equal(response.status, 200, JSON.stringify(await response.json()));
      }
    }
    assert.equal(providerCalls, 9);
    for (const predicate of [null, 123, {}, "", "x".repeat(65)]) {
      const response = await post("A new drawing", { entities, relations: [{ ...relation, predicate }] });
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /current drawing/);
    }
    for (const targetIds of [["missing-id"], Array(13).fill(entities[0].id), []]) {
      const response = await post("A new drawing", { entities, relations: [{ ...relation, targetIds }] });
      assert.equal(response.status, 400);
    }
    const textError = await post("x".repeat(501), { entities: [], relations: [] });
    assert.match((await textError.json()).error, /500/);
    const nounError = await post("A new drawing", { entities: [], relations: [] }, { reusableGlyphNouns: Array(13).fill("book") });
    assert.match((await nounError.json()).error, /artwork hints/);
    assert.equal(providerCalls, 9, "invalid input must not spend model calls");
  });
});

test("service limits reject invalid configuration instead of silently disabling the budget", () => {
  assert.deepEqual(serviceLimits({}), {
    perClientPerMinute: 12, maxConcurrentRequests: 2, maxProviderCallsPerDay: 80
  });
  for (const value of ["0", "-1", "Infinity", "1.5", "100001"]) {
    assert.throws(() => serviceLimits({ MAX_PROVIDER_CALLS_PER_DAY: value }), /MAX_PROVIDER_CALLS_PER_DAY/);
  }
  assert.throws(() => serviceLimits({ MAX_CONCURRENT_MODEL_REQUESTS: "17" }), /MAX_CONCURRENT_MODEL_REQUESTS/);
});

test("forged forwarded-IP headers cannot bypass the per-client limit", async () => {
  const configuration = modelConfiguration({ NVIDIA_API_KEY: "private-test-key" });
  const candidate = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
    objects: [{ id: "book", label: "book", kind: "book", x: 50, y: 50 }], connections: [] };
  let providerCalls = 0;
  await withServer({ configuration, limits: { perClientPerMinute: 2, maxConcurrentRequests: 2, maxProviderCallsPerDay: 20 },
    modelFetch: async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(candidate) } }] }), { status: 200 });
    } }, async (url) => {
    const statuses = [];
    for (let index = 0; index < 3; index += 1) {
      const response = await fetch(`${url}/v1/glyph`, { method: "POST", headers: {
        "content-type": "application/json", "x-forwarded-for": `203.0.113.${index + 1}`
      }, body: JSON.stringify({ noun: "dragon" }) });
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, [502, 502, 429]); // Invalid glyph output still consumes provider attempts.
    assert.equal(providerCalls, 4); // Each malformed reply triggers one bounded correction.
  });
});

test("daily budget counts correction attempts and fails closed before a third provider call", async () => {
  const configuration = modelConfiguration({ NVIDIA_API_KEY: "private-test-key" });
  let providerCalls = 0;
  await withServer({ configuration, limits: { perClientPerMinute: 20, maxConcurrentRequests: 2, maxProviderCallsPerDay: 2 },
    modelFetch: async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
    } }, async (url) => {
    const send = () => fetch(`${url}/v1/glyph`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ noun: "dragon" }) });
    assert.equal((await send()).status, 502);
    const exhausted = await send();
    assert.equal(exhausted.status, 429);
    assert.match((await exhausted.json()).error, /daily model-request allowance/);
    assert.equal(providerCalls, 2);
  });
});

test("a poor but schema-valid doodle cannot bypass the provider-call budget for its repair", async () => {
  const configuration = modelConfiguration({ NEBIUS_API_KEY: "private-test-key" });
  const tiny = { strokes: [{ part: "mark", color: "#2f3e46", pts: [[20, 20], [24, 20], [24, 24], [20, 20]] }] };
  let providerCalls = 0;
  await withServer({ configuration, limits: { perClientPerMinute: 20, maxConcurrentRequests: 2, maxProviderCallsPerDay: 1 },
    modelFetch: async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(tiny) } }] }), { status: 200 });
    } }, async (url) => {
    const response = await fetch(`${url}/v1/glyph`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ noun: "dragon" }) });
    assert.equal(response.status, 429);
    assert.match((await response.json()).error, /daily model-request allowance/);
    assert.equal(providerCalls, 1);
  });
});

test("provider throttling reaches the client as a safe 429 without retrying the model", async () => {
  const configuration = modelConfiguration({ NVIDIA_API_KEY: "private-test-key" });
  let providerCalls = 0;
  await withServer({ configuration, modelFetch: async () => {
    providerCalls += 1;
    return new Response("{}", { status: 429 });
  } }, async (url) => {
    const response = await fetch(`${url}/v1/glyph`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ noun: "dragon" }) });
    assert.equal(response.status, 429);
    const body = await response.json();
    assert.match(body.error, /provider is rate limiting/);
    assert.ok(!JSON.stringify(body).includes("private-test-key"));
    assert.equal(providerCalls, 1);
  });
});

test("concurrency guard refuses excess work before it reaches the provider", async () => {
  const configuration = modelConfiguration({ NVIDIA_API_KEY: "private-test-key" });
  const candidate = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
    objects: [{ id: "book", label: "book", kind: "book", x: 50, y: 50 }], connections: [] };
  let started;
  const startedGate = new Promise((resolve) => { started = resolve; });
  let release;
  const providerGate = new Promise((resolve) => { release = resolve; });
  let providerCalls = 0;
  await withServer({ configuration, limits: { perClientPerMinute: 20, maxConcurrentRequests: 1, maxProviderCallsPerDay: 20 },
    modelFetch: async () => {
      providerCalls += 1;
      started();
      await providerGate;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(candidate) } }] }), { status: 200 });
    } }, async (url) => {
    const send = () => fetch(`${url}/v1/interpret`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "A book", scene: { entities: [], relations: [] } }) });
    const first = send();
    await startedGate;
    const busy = await send();
    assert.equal(busy.status, 429);
    assert.match((await busy.json()).error, /busy/);
    release();
    assert.equal((await first).status, 200);
    assert.equal(providerCalls, 1);
  });
});

test("client disconnect aborts its in-flight provider call", async () => {
  const configuration = modelConfiguration({ NVIDIA_API_KEY: "private-test-key" });
  let started;
  const startedGate = new Promise((resolve) => { started = resolve; });
  let aborted;
  const abortGate = new Promise((resolve) => { aborted = resolve; });
  await withServer({ configuration, modelFetch: async (_url, options) => {
    started();
    return new Promise((_, reject) => {
      options.signal.addEventListener("abort", () => {
        aborted();
        reject(new Error("Provider request cancelled."));
      }, { once: true });
    });
  } }, async (url) => {
    const body = JSON.stringify({ text: "A book", scene: { entities: [], relations: [] } });
    const pending = httpRequest(`${url}/v1/interpret`, { method: "POST", headers: {
      "content-type": "application/json", "content-length": Buffer.byteLength(body)
    } });
    pending.on("error", () => undefined);
    pending.end(body);
    await startedGate;
    pending.destroy();
    await abortGate;
  });
});
