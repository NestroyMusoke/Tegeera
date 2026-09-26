import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NEBIUS_CHAT_URL, NVIDIA_SCENE_MODEL, callModel, generateGlyph, interpretScene, modelConfiguration,
  scenePrompt, validScene, validStrokes
} from "./engine.mjs";

const scene = { entities: [], relations: [] };
const complete = {
  blueprintVersion: "1.0", mode: "replace", confidence: 0.92,
  objects: [
    { id: "water", label: "water", kind: "generic", x: 15, y: 70 },
    { id: "roots", label: "roots", kind: "generic", x: 45, y: 70 },
    { id: "plant", label: "plant", kind: "generic", x: 70, y: 32 }
  ],
  connections: [{ from: "water", to: "roots", label: "absorbed by" }, { from: "roots", to: "plant", label: "part of" }]
};
const strokes = { strokes: [{ part: "outline", color: "#2f3e46", pts: [[8, 8], [42, 8], [42, 42], [8, 8]] }] };
const nvidia = modelConfiguration({ NVIDIA_API_KEY: "private-key" });
const nebius = modelConfiguration({ NEBIUS_API_KEY: "nebius-test-key" });

test("Nebius Token Factory takes precedence and uses its Nemotron endpoint", async () => {
  assert.equal(modelConfiguration({ NEBIUS_API_KEY: "nebius-test-key", NVIDIA_API_KEY: "direct-key" }).provider, "nebius");
  assert.equal(nebius.model, NVIDIA_SCENE_MODEL);
  assert.equal(nebius.url, NEBIUS_CHAT_URL);
  assert.equal(modelConfiguration({ NEBIUS_API_KEY: " ", NVIDIA_API_KEY: "direct-key" }).provider, "nvidia");
  const fetchImpl = async (url, request) => {
    assert.equal(url, "https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions");
    assert.equal(request.headers.authorization, "Bearer nebius-test-key");
    assert.equal(request.headers["http-referer"], undefined);
    const body = JSON.parse(request.body);
    assert.equal(body.model, NVIDIA_SCENE_MODEL);
    assert.equal(body.stream, false);
    assert.equal(body.max_tokens, 3200);
    assert.equal(body.reasoning_effort, undefined);
    assert.equal(body.provider, undefined);
    return new Response(JSON.stringify({ model: NVIDIA_SCENE_MODEL, choices: [{ message: { content: JSON.stringify(complete) } }] }), { status: 200 });
  };
  const result = await interpretScene({ text: "Water enters the plant through roots", scene }, nebius, { fetchImpl });
  assert.equal(result.provider, "nebius");
  assert.equal(result.candidate.objects.length, 3);
  assert.ok(!JSON.stringify(result).includes("nebius-test-key"));
});

test("prefers a private NVIDIA key and never inserts it into the teacher prompt", () => {
  assert.equal(nvidia.provider, "nvidia");
  assert.equal(nvidia.model, NVIDIA_SCENE_MODEL);
  assert.equal(modelConfiguration({ OPENROUTER_API_KEY: "fallback" }).provider, "openrouter");
  assert.equal(modelConfiguration({}), null);
  const prompt = scenePrompt("Roots absorb water", scene);
  assert.match(prompt, /essential named or implied visible part/);
  assert.ok(!prompt.includes("private-key"));
});

test("NIM request uses its hosted endpoint and bounded low reasoning without exposing the key in output", async () => {
  let body;
  const fetchImpl = async (url, request) => {
    assert.equal(url, "https://integrate.api.nvidia.com/v1/chat/completions");
    assert.equal(request.headers.authorization, "Bearer private-key");
    body = JSON.parse(request.body);
    return new Response(JSON.stringify({ model: NVIDIA_SCENE_MODEL, choices: [{ message: { content: JSON.stringify(complete) } }] }), { status: 200 });
  };
  const response = await callModel("Draw roots", nvidia, { fetchImpl });
  assert.equal(body.model, NVIDIA_SCENE_MODEL);
  assert.equal(body.stream, false);
  assert.equal(body.reasoning_effort, "low");
  assert.equal(body.max_tokens, 3200);
  assert.ok(!JSON.stringify(response).includes("private-key"));
});

test("scene validator rejects omitted endpoints, duplicate objects and invented coordinates", () => {
  assert.equal(validScene(complete, scene), true);
  assert.equal(validScene({ ...complete, connections: [{ from: "water", to: "sun", label: "flows to" }] }, scene), false);
  assert.equal(validScene({ ...complete, objects: [...complete.objects, complete.objects[0]] }, scene), false);
  assert.equal(validScene({ ...complete, objects: [{ ...complete.objects[0], y: 120 }] }, scene), false);
  assert.equal(validScene({ ...complete, connections: [{ from: "water", to: "roots", label: "flows into", kind: "flowsInto" }] }, scene), true);
  assert.equal(validScene({ ...complete, connections: [{ from: "water", to: "roots", label: "contains", kind: "flowsInto" }] }, scene), false);
  assert.equal(validScene({ ...complete, connections: [{ from: "water", to: "roots", label: "flows into", kind: "unknown" }] }, scene), false);
});

test("repairs malformed model JSON once, then returns a structurally complete plan", async () => {
  let calls = 0;
  const fetchImpl = async (_url, request) => {
    calls += 1;
    const content = calls === 1 ? '{"blueprintVersion":"1.0","objects":[]}' : JSON.stringify(complete);
    if (calls === 2) assert.match(JSON.parse(request.body).messages[0].content, /previous response did not satisfy/i);
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  const result = await interpretScene({ text: "Water enters the plant through roots", scene }, nvidia, { fetchImpl });
  assert.equal(result.repaired, true);
  assert.equal(result.candidate.objects.length, 3);
  assert.equal(calls, 2);
});

test("invalid correction fails closed and provider errors do not trigger extra calls", async () => {
  let calls = 0;
  const invalid = async () => {
    calls += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
  };
  await assert.rejects(interpretScene({ text: "Water enters roots", scene }, nvidia, { fetchImpl: invalid }), /complete, valid visual plan/);
  assert.equal(calls, 2);
  calls = 0;
  const rateLimited = async () => { calls += 1; return new Response("{}", { status: 429 }); };
  await assert.rejects(interpretScene({ text: "Water enters roots", scene }, nvidia, { fetchImpl: rateLimited }), /HTTP 429/);
  assert.equal(calls, 1);
});

test("glyph path accepts bounded strokes and rejects unsafe or out-of-grid output", async () => {
  assert.equal(validStrokes(strokes), true);
  assert.equal(validStrokes({ strokes: [{ ...strokes.strokes[0], pts: [[1, 1], [2, 2], [3, 3], [4, 4]] }] }), false);
  assert.equal(validStrokes({ strokes: [{ ...strokes.strokes[0], color: "url(javascript:alert(1))" }] }), false);
  const fetchImpl = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(strokes) } }] }), { status: 200 });
  const result = await generateGlyph({ noun: "dragon" }, nvidia, { fetchImpl });
  assert.deepEqual(result.candidate, strokes);
});
