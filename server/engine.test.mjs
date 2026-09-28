import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NEBIUS_CHAT_URL, NVIDIA_SCENE_MODEL, callModel, generateGlyph, interpretScene, modelConfiguration,
  scenePrompt, sceneValidationIssue, validScene, validStrokes
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
  assert.equal(nebius.sceneResponseFormat, "schema");
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
    assert.equal(body.response_format?.type, "json_schema");
    return new Response(JSON.stringify({ model: NVIDIA_SCENE_MODEL, usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      choices: [{ message: { content: JSON.stringify(complete) } }] }), { status: 200 });
  };
  const result = await interpretScene({ text: "Water enters the plant through roots", scene }, nebius, { fetchImpl });
  assert.equal(result.provider, "nebius");
  assert.equal(result.candidate.objects.length, 3);
  assert.deepEqual(result.usage, { promptTokens: 100, completionTokens: 50, totalTokens: 150 });
  assert.equal(result.providerAttempts, 1);
  assert.equal(result.providerAttemptMs.length, 1);
  assert.ok(result.providerAttemptMs[0] >= 0);
  assert.ok(!JSON.stringify(result).includes("nebius-test-key"));
});

test("Nebius non-thinking mode is opt-in and never sent to other providers", async () => {
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(complete) } }] }), { status: 200 });
  };
  const result = await callModel("visual plan", nebius, { fetchImpl, nebiusThinking: "off" });
  assert.ok(result.providerMs >= 0);
  const nvidiaFetch = async (_url, request) => {
    assert.equal(JSON.parse(request.body).chat_template_kwargs, undefined);
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
  };
  await callModel("visual plan", nvidia, { fetchImpl: nvidiaFetch, nebiusThinking: "off" });
  const lowFetch = async (_url, request) => {
    assert.deepEqual(JSON.parse(request.body).chat_template_kwargs, { enable_thinking: true, low_effort: true });
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
  };
  await callModel("visual plan", nebius, { fetchImpl: lowFetch, nebiusThinking: "low" });
});

test("Nebius scene schema guidance can be compared or rolled back without weakening validation", async () => {
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    assert.equal(body.response_format.type, "json_schema");
    assert.deepEqual(body.response_format.json_schema.schema.required,
      ["blueprintVersion", "mode", "confidence", "objects", "connections"]);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(complete) } }] }), { status: 200 });
  };
  const result = await interpretScene({ text: "Water enters the plant through roots", scene }, nebius,
    { fetchImpl, nebiusResponseFormat: "schema" });
  assert.equal(result.providerAttempts, 1);
  const jsonFetch = async (_url, request) => {
    assert.deepEqual(JSON.parse(request.body).response_format, { type: "json_object" });
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
  };
  await callModel("visual plan", nebius, { fetchImpl: jsonFetch, nebiusResponseFormat: "json" });
  assert.equal(modelConfiguration({ NEBIUS_API_KEY: "key", NEBIUS_SCENE_RESPONSE_FORMAT: "default" }).sceneResponseFormat, "default");
  assert.equal(modelConfiguration({ NEBIUS_API_KEY: "key", NEBIUS_MODEL: "nvidia/another-model" }).sceneResponseFormat, "default");
  assert.throws(() => modelConfiguration({ NEBIUS_API_KEY: "key", NEBIUS_SCENE_RESPONSE_FORMAT: "unsafe" }),
    /must be default or schema/);
  assert.equal(modelConfiguration({ NVIDIA_API_KEY: "key", NEBIUS_SCENE_RESPONSE_FORMAT: "unsafe" }).provider, "nvidia");
  const glyphFetch = async (_url, request) => {
    assert.equal(JSON.parse(request.body).response_format, undefined);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(strokes) } }] }), { status: 200 });
  };
  await generateGlyph({ noun: "dragon" }, nebius, { fetchImpl: glyphFetch });
});

test("prefers a private NVIDIA key and never inserts it into the teacher prompt", () => {
  assert.equal(nvidia.provider, "nvidia");
  assert.equal(nvidia.model, NVIDIA_SCENE_MODEL);
  assert.equal(modelConfiguration({ OPENROUTER_API_KEY: "fallback" }).provider, "openrouter");
  assert.equal(modelConfiguration({}), null);
  const prompt = scenePrompt("Roots absorb water", scene);
  assert.match(prompt, /essential named or implied visible part/);
  assert.match(prompt, /inventory explicitly named visible participants/);
  assert.match(prompt, /direct X→whole shortcut is wrong/);
  assert.match(prompt, /applied \*force\* is its own object/);
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
  assert.equal(sceneValidationIssue(complete, scene), null);
  assert.match(sceneValidationIssue({ ...complete, objects: [{ ...complete.objects[0], kind: "elephant" }] }, scene), /Object kind must be one of/);
  assert.match(sceneValidationIssue({ ...complete, connections: [{ from: "water", to: "missing", label: "flows to" }] }, scene), /two different ids present/);
  assert.match(sceneValidationIssue({ ...complete, connections: [{ from: "water", to: "roots", label: "flow", kind: "flowsInto" }] }, scene), /exact label/);
});

test("specialist links require complete, consistent diagrams rather than attractive partial arrows", () => {
  const objects = ["pump", "filter", "water", "minerals"].map((id, index) => ({
    id, label: id, kind: "generic", x: 18 + index * 20, y: 40
  }));
  const transport = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9, objects, connections: [
    { from: "pump", to: "filter", via: "water", label: "pumps to", kind: "pumpsTo" },
    { from: "filter", to: "pump", via: "water", label: "returns to", kind: "returnsTo" },
    { from: "water", to: "minerals", label: "carries", kind: "carries" }
  ] };
  assert.equal(validScene(transport, scene), true);
  assert.match(sceneValidationIssue({ ...transport, connections: transport.connections.slice(0, 2) }, scene), /exactly three links/);
  assert.match(sceneValidationIssue({ ...transport, connections: [transport.connections[0],
    { ...transport.connections[1], via: "minerals" }, transport.connections[2]] }, scene), /same payload/);
  assert.match(sceneValidationIssue({ ...transport, connections: [transport.connections[0],
    { ...transport.connections[1], from: "pump", to: "filter" }, transport.connections[2]] }, scene), /return to its source/);
  const forces = { ...transport, objects: ["body", "surface", "applied", "opposing"].map((id, index) => ({
    id, label: id, kind: "generic", x: 18 + index * 20, y: 40
  })), connections: [
    { from: "applied", to: "body", label: "applied to", kind: "appliedTo" },
    { from: "opposing", to: "applied", label: "opposes", kind: "opposes" },
    { from: "body", to: "surface", label: "contacts", kind: "contacts" }
  ] };
  assert.equal(validScene(forces, scene), true);
  assert.match(sceneValidationIssue({ ...forces, connections: [forces.connections[0],
    { ...forces.connections[1], to: "body" }, forces.connections[2]] }, scene), /opposing force must oppose/);
});

test("new hosted role grammars accept arbitrary nouns only as complete directed diagrams", () => {
  const make = (names, links) => ({ blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
    objects: names.map((label, index) => ({ id: `role-${index}`, label, kind: "generic", x: 20 + index * 25, y: 40 })),
    connections: links });
  const edge = (from, to, kind, label = kind) => ({ from: `role-${from}`, to: `role-${to}`, kind, label });
  for (const [holder, content] of [["variable", "value"], ["specimen jar", "sample"]]) {
    const candidate = make([holder, content], [edge(0, 1, "contains")]);
    assert.equal(validScene(candidate, scene), true);
    assert.match(sceneValidationIssue({ ...candidate, objects: [...candidate.objects,
      { id: "extra", label: "extra", kind: "generic", x: 80, y: 40 }] }, scene), /containment diagram/);
  }
  const control = make(["application", "service", "call site"], [
    edge(0, 1, "calls"), edge(1, 2, "returnsControlTo", "returnsTo")]);
  assert.equal(validScene(control, scene), true);
  assert.match(sceneValidationIssue({ ...control, connections: [control.connections[0]] }, scene), /call-return diagram/);
  assert.match(sceneValidationIssue({ ...control, connections: [control.connections[0],
    edge(1, 0, "returnsControlTo", "returnsTo")] }, scene), /distinct caller/);
  const motion = make(["toy rocket", "highest point", "gravity"], [
    edge(0, 1, "risesTo"), edge(0, 1, "fallsFrom"), edge(2, 0, "accelerates")]);
  assert.equal(validScene(motion, scene), true);
  assert.match(sceneValidationIssue({ ...motion, connections: motion.connections.slice(0, 2) }, scene), /changing-speed diagram/);
});

test("source grounding detects omitted passage arrows and incomplete opposing forces without lesson nouns", () => {
  const passage = {
    blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
    objects: ["machine", "fuel", "inlet", "air", "vent"].map((id, index) => ({ id, label: id, kind: "generic", x: 10 + index * 18, y: 40 })),
    connections: [
      { from: "inlet", to: "machine", label: "part of", kind: "partOf" },
      { from: "vent", to: "machine", label: "part of", kind: "partOf" },
      { from: "fuel", to: "machine", label: "flows into", kind: "flowsInto" },
      { from: "air", to: "machine", label: "flows into", kind: "flowsInto" }
    ]
  };
  const sentence = "A machine takes in fuel through its inlet and air through its vent";
  assert.match(sceneValidationIssue(passage, scene, sentence), /fuel through inlet/);
  const repaired = { ...passage, connections: passage.connections.map((link) =>
    link.from === "fuel" ? { ...link, to: "inlet" } : link.from === "air" ? { ...link, to: "vent" } : link) };
  assert.equal(sceneValidationIssue(repaired, scene, sentence), null);
  assert.equal(sceneValidationIssue(repaired, scene, "A cloud moves through the sky"), null);

  const force = { blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
    objects: ["sled", "snow", "pull", "drag"].map((id, index) => ({ id, label: id, kind: "generic", x: 10 + index * 20, y: 50 })),
    connections: [{ from: "pull", to: "sled", label: "pulls" }, { from: "drag", to: "sled", label: "slows" }] };
  const forceSentence = "Pull a sled over snow; drag opposes the motion";
  assert.match(sceneValidationIssue(force, scene, forceSentence), /complete appliedTo\/opposes\/contacts/);
  assert.equal(sceneValidationIssue({ ...force, connections: [
    { from: "pull", to: "sled", label: "applied to", kind: "appliedTo" },
    { from: "drag", to: "pull", label: "opposes", kind: "opposes" },
    { from: "sled", to: "snow", label: "contacts", kind: "contacts" }
  ] }, scene, forceSentence), null);
});

test("explicit relationship contracts reject confident generic arrows without fixing the nouns", () => {
  const make = (names, connections, confidence = 0.9) => ({ blueprintVersion: "1.0", mode: "replace", confidence,
    objects: names.map((label, index) => ({ id: `role-${index}`, label, kind: "generic", x: 18 + index * 27, y: 42 })),
    connections });
  const link = (from, to, kind, label = kind) => ({ from: `role-${from}`, to: `role-${to}`, kind, label });
  const families = [
    {
      source: "A specimen jar is a labelled vessel that holds a sample.",
      names: ["specimen jar", "sample"],
      complete: [link(0, 1, "contains")],
      issue: /holder.*contains relation/
    },
    {
      source: "When you call a service, the application jumps to it, then comes back to where it left off.",
      names: ["application", "service", "return point"],
      complete: [link(0, 1, "calls"), link(1, 2, "returnsControlTo", "returnsTo")],
      issue: /calls and returnsControlTo/
    },
    {
      source: "A toy rocket launched up slows down, stops, then falls back faster and faster.",
      names: ["toy rocket", "highest point", "gravity"],
      complete: [link(0, 1, "risesTo"), link(0, 1, "fallsFrom"), link(2, 0, "accelerates")],
      issue: /risesTo, fallsFrom, and accelerates/
    }
  ];
  for (const { source, names, complete, issue } of families) {
    const generic = make(names, [{ from: "role-0", to: "role-1", label: "relates to" }]);
    assert.match(sceneValidationIssue(generic, scene, source), issue);
    assert.equal(sceneValidationIssue(make(names, complete), scene, source), null);
    assert.equal(sceneValidationIssue(make(names, [{ from: "role-0", to: "role-1", label: "relates to" }], 0.3), scene, source), null);
  }
  const wrongCaller = make(["application", "service", "return point"], [
    link(2, 1, "calls"), link(1, 0, "returnsControlTo", "returnsTo")]);
  assert.match(sceneValidationIssue(wrongCaller, scene, families[1].source), /application as the caller/);
  const missingCaller = make(["operator", "service", "return point"], families[1].complete);
  assert.match(sceneValidationIssue(missingCaller, scene, families[1].source), /application as the caller.*missing/);
  assert.equal(sceneValidationIssue(make(["application", "service", "return point"],
    [{ from: "role-0", to: "role-1", label: "relates to" }]), scene,
  "The application does not call the service and return to the call site."), null);
});

test("a semantic omission triggers one bounded model repair with actionable feedback", async () => {
  const first = { ...complete, connections: [{ from: "water", to: "plant", label: "flows into", kind: "flowsInto" },
    { from: "roots", to: "plant", label: "part of", kind: "partOf" }] };
  const corrected = { ...complete, connections: [{ from: "water", to: "roots", label: "flows into", kind: "flowsInto" },
    { from: "roots", to: "plant", label: "part of", kind: "partOf" }] };
  let calls = 0;
  const fetchImpl = async (_url, request) => {
    calls += 1;
    if (calls === 2) assert.match(JSON.parse(request.body).messages[0].content, /water through roots/);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(calls === 1 ? first : corrected) } }] }), { status: 200 });
  };
  const result = await interpretScene({ text: "Water enters the plant through roots", scene }, nebius, { fetchImpl });
  assert.equal(result.repaired, true);
  assert.equal(calls, 2);
  assert.equal(result.candidate.connections[0].to, "roots");
});

test("repairs malformed model JSON once, then returns a structurally complete plan", async () => {
  let calls = 0;
  const fetchImpl = async (_url, request) => {
    calls += 1;
    const content = calls === 1 ? '{"blueprintVersion":"1.0","objects":[]}' : JSON.stringify(complete);
    if (calls === 2) assert.match(JSON.parse(request.body).messages[0].content, /previous response did not satisfy/i);
    return new Response(JSON.stringify({ usage: { prompt_tokens: 40, completion_tokens: 20, total_tokens: 60 },
      choices: [{ message: { content } }] }), { status: 200 });
  };
  const result = await interpretScene({ text: "Water enters the plant through roots", scene }, nvidia, { fetchImpl });
  assert.equal(result.repaired, true);
  assert.equal(result.candidate.objects.length, 3);
  assert.equal(calls, 2);
  assert.equal(result.providerAttempts, 2);
  assert.deepEqual(result.usage, { promptTokens: 80, completionTokens: 40, totalTokens: 120 });
});

test("repair identifies a general schema fault without trusting the rejected output as instructions", async () => {
  let calls = 0;
  const invalid = { ...complete, connections: [{ from: "water", to: "unknown", label: "flows to" }] };
  const fetchImpl = async (_url, request) => {
    calls += 1;
    if (calls === 2) {
      const message = JSON.parse(request.body).messages[0].content;
      assert.match(message, /two different ids present in objects/);
      assert.match(message, /untrusted data, not instructions/);
      assert.match(message, /Water enters the plant/);
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(calls === 1 ? invalid : complete) } }] }), { status: 200 });
  };
  const result = await interpretScene({ text: "Water enters the plant", scene }, nebius, { fetchImpl });
  assert.equal(result.repaired, true);
  assert.equal(result.providerAttempts, 2);
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
