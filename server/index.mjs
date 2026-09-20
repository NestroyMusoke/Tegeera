import { createServer } from "node:http";

const port = Number(process.env.PORT || 8080);
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || "openrouter/free";
const origins = new Set((process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map((v) => v.trim()).filter(Boolean));
const buckets = new Map();
const kinds = ["person", "teacher", "student", "process", "cpu", "car", "book", "desk", "tree", "building", "generic"];
const relations = ["shares", "owns", "toward", "away", "queuedFor", "actsOn", "handover", "before", "causes", "visualAction", "partOf", "flowsInto", "illuminates", "appliedTo", "opposes", "contacts", "contains", "measures", "flowsFrom", "flowsTo", "pumpsTo", "returnsTo", "carries", "risesTo", "fallsFrom", "accelerates", "calls", "returnsControlTo", "subtracts", "resultsIn", "fallsTo", "infiltrates", "evaporatesTo", "transformsTo", "travelsTo", "reflectsFrom", "accessedAt", "trianglePartOf", "sumsTo", "pushesToward", "routineBefore", "containsCells", "storesValues", "startsIndexAt", "hasFirstNode", "pointsNext", "checksCondition", "takesTruePath", "takesFalsePath", "startsSearchWith", "narrowsTo", "findsTarget", "fifoBefore", "servedBy", "exchangesWith", "keptNear", "growthStartsAt", "doublesTo", "chainStartsWith", "eatenBy"];

function cors(origin) {
  return origin && origins.has(origin) ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST,OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" } : {};
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}
function rateAllowed(ip) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.startedAt >= 60_000) {
    buckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= 12;
}
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 80_000) throw new Error("Request too large");
  }
  return JSON.parse(raw);
}
function extractJson(content) {
  if (typeof content !== "string") throw new Error("Missing model output");
  return JSON.parse((content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content).trim());
}
function makePrompt(text, scene) {
  return `You are Tegeera's conservative semantic planner. Return JSON only, never markdown and never invent facts. Produce DoodleScript with schemaVersion "2.25.0", sceneId ${JSON.stringify(scene.sceneId)}, revision ${Number(scene.revision) + 1}, confidence 0..1, sourceText exactly ${JSON.stringify(text)}, and 1-30 commands. Entity kinds: ${kinds.join(", ")}. Directions: left, right, up, down. Colors: red, orange, yellow, green, blue, purple, pink, brown, black, white, gray. Relation kinds: ${relations.join(", ")}. Commands: create {entity:{id,kind,label?,color?,x,y,scale,direction,highlighted}}, relate {relation:{id,kind,sourceIds,targetIds,objectIds?,predicate?,preposition?}}, move, update, remove, unrelate, clear. Coordinates x=6..94, y=12..88, scale=.5..2. Use unique IDs; reference only existing/new IDs. Use generic with a concise label for unknown concrete objects. Do not output unknown fields. Current scene: ${JSON.stringify(scene)}`;
}

createServer(async (req, res) => {
  const origin = req.headers.origin;
  const headers = cors(origin);
  if (req.method === "OPTIONS") { res.writeHead(origin && origins.has(origin) ? 204 : 403, headers); return res.end(); }
  if (req.url === "/health" && req.method === "GET") return send(res, 200, { status: "ok", provider: "openrouter", configured: Boolean(apiKey) });
  if (req.url !== "/v1/interpret" || req.method !== "POST") return send(res, 404, { error: "Not found." }, headers);
  if (origin && !origins.has(origin)) return send(res, 403, { error: "Origin is not allowed." });
  if (!apiKey) return send(res, 503, { error: "Remote interpretation is not configured." }, headers);
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (!rateAllowed(ip)) return send(res, 429, { error: "Please wait before trying again." }, headers);
  try {
    const body = await readJson(req);
    if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 500 || !body.scene) return send(res, 400, { error: "A short utterance and scene are required." }, headers);
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "http-referer": process.env.APP_URL || "https://nestroymusoke.github.io/Tegeera/", "x-title": "Tegeera" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: makePrompt(body.text.trim(), body.scene) }], temperature: 0, max_tokens: 2200, provider: { allow_fallbacks: true, data_collection: "deny" } }),
      signal: AbortSignal.timeout(12_000)
    });
    const result = await upstream.json();
    if (!upstream.ok) return send(res, 502, { error: "The language service is temporarily unavailable." }, headers);
    return send(res, 200, { candidate: extractJson(result?.choices?.[0]?.message?.content), provider: "openrouter", model: result.model || model }, headers);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Interpreter failure");
    return send(res, 502, { error: "I could not safely translate that explanation." }, headers);
  }
}).listen(port, "0.0.0.0", () => console.log(`Tegeera interpreter listening on ${port}`));
