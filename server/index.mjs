import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { editGlyph, generateGlyph, interpretScene, modelConfiguration, planLesson, validStrokes } from "./engine.mjs";

const port = Number(process.env.PORT || 8080);
// Capacitor's Android WebView uses https://localhost by default. Configure
// the public Pages origin separately in deployment settings.
const origins = new Set((process.env.ALLOWED_ORIGINS || "http://localhost:5173,https://localhost").split(",").map((value) => value.trim()).filter(Boolean));
const maxClientBuckets = 2048;

function positiveLimit(value, fallback, name, maximum) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > maximum) {
    throw new Error(`${name} must be an integer from 1 to ${maximum}.`);
  }
  return Number(value);
}

export function serviceLimits(env = process.env) {
  return {
    perClientPerMinute: positiveLimit(env.MAX_REQUESTS_PER_CLIENT_PER_MINUTE, 12, "MAX_REQUESTS_PER_CLIENT_PER_MINUTE", 1000),
    maxConcurrentRequests: positiveLimit(env.MAX_CONCURRENT_MODEL_REQUESTS, 2, "MAX_CONCURRENT_MODEL_REQUESTS", 16),
    maxProviderCallsPerDay: positiveLimit(env.MAX_PROVIDER_CALLS_PER_DAY, 80, "MAX_PROVIDER_CALLS_PER_DAY", 10_000)
  };
}

function cors(origin, allowedOrigins) {
  return origin && allowedOrigins.has(origin) ? {
    "access-control-allow-origin": origin, "access-control-allow-methods": "POST,OPTIONS,GET",
    "access-control-allow-headers": "content-type", vary: "Origin"
  } : {};
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}
function rateAllowed(ip, buckets, limit) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.startedAt >= 60_000) {
    if (!bucket && buckets.size >= maxClientBuckets) {
      for (const [address, entry] of buckets) {
        if (now - entry.startedAt >= 60_000) buckets.delete(address);
      }
      if (buckets.size >= maxClientBuckets) return false;
    }
    buckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 32_000) throw new Error("Request too large.");
  }
  return JSON.parse(raw);
}

function validSceneHints(scene) {
  if (!scene || typeof scene !== "object" || !Array.isArray(scene.entities) || scene.entities.length > 64
    || !Array.isArray(scene.relations) || scene.relations.length > 128) return false;
  const ids = new Set();
  for (const entity of scene.entities) {
    if (!entity || typeof entity.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(entity.id)
      || ids.has(entity.id) || typeof entity.kind !== "string" || entity.kind.length > 32
      || (entity.label !== undefined && (typeof entity.label !== "string" || entity.label.length > 80))
      || !Number.isFinite(entity.x) || entity.x < 0 || entity.x > 100
      || !Number.isFinite(entity.y) || entity.y < 0 || entity.y > 100) return false;
    ids.add(entity.id);
  }
  return scene.relations.every((relation) => relation && typeof relation === "object"
    && typeof relation.kind === "string" && relation.kind.length <= 40
    && typeof relation.predicate === "string" && relation.predicate.length <= 64
    && Array.isArray(relation.sourceIds) && relation.sourceIds.length <= 8
    && Array.isArray(relation.targetIds) && relation.targetIds.length <= 8
    && [...relation.sourceIds, ...relation.targetIds].every((id) => ids.has(id)));
}

function validReusableNouns(nouns) {
  return nouns === undefined || (Array.isArray(nouns) && nouns.length <= 12
    && nouns.every((noun) => typeof noun === "string" && noun.length >= 2 && noun.length <= 48));
}

export function createInterpreterServer({ configuration = modelConfiguration(), allowedOrigins = origins, modelFetch = fetch, limits = serviceLimits() } = {}) {
const buckets = new Map();
let activeRequests = 0;
let providerDay = Math.floor(Date.now() / 86_400_000);
let providerCalls = 0;
const budgetRemaining = () => {
  const today = Math.floor(Date.now() / 86_400_000);
  if (today !== providerDay) { providerDay = today; providerCalls = 0; }
  return providerCalls < limits.maxProviderCallsPerDay;
};
const limitedModelFetch = (...args) => {
  if (!budgetRemaining()) throw new Error("Provider call budget exhausted.");
  providerCalls += 1; // Count every outbound attempt, including corrections and provider failures.
  return modelFetch(...args);
};
return createServer(async (req, res) => {
  const origin = req.headers.origin;
  const headers = cors(origin, allowedOrigins);
  if (req.method === "OPTIONS") {
    res.writeHead(origin && allowedOrigins.has(origin) ? 204 : 403, headers);
    return res.end();
  }
  if (origin && !allowedOrigins.has(origin)) return send(res, 403, { error: "Origin is not allowed." });
  if (req.url === "/health" && req.method === "GET") return send(res, 200, {
    status: "ok", provider: configuration?.provider || null,
    model: configuration?.model || null, configured: Boolean(configuration)
  }, headers);
  const route = req.method === "POST" && ["/v1/interpret", "/v1/glyph", "/v1/glyph/edit", "/v1/lesson-nouns"].includes(req.url) ? req.url : null;
  if (!route) return send(res, 404, { error: "Not found." }, headers);
  if (!configuration) return send(res, 503, { error: "AI interpretation is not configured." }, headers);
  // An arbitrary client can forge X-Forwarded-For. Only the socket peer is trusted here.
  const ip = req.socket.remoteAddress || "unknown";
  if (!rateAllowed(ip, buckets, limits.perClientPerMinute)) return send(res, 429, { error: "Please wait before trying again." }, headers);
  let body;
  try { body = await readJson(req); }
  catch { return send(res, 400, { error: "Invalid or oversized JSON request." }, headers); }
  if (!body || typeof body !== "object") return send(res, 400, { error: "A JSON object is required." }, headers);
  if (route === "/v1/interpret" && (typeof body.text !== "string" || !body.text.trim() || body.text.length > 500
    || !validSceneHints(body.scene) || !validReusableNouns(body.reusableGlyphNouns))) {
    return send(res, 400, { error: "A short utterance and bounded scene are required." }, headers);
  }
  if (route === "/v1/glyph" && (typeof body.noun !== "string" || !body.noun.trim() || body.noun.length > 48)) {
    return send(res, 400, { error: "A short drawing noun is required." }, headers);
  }
  if (route === "/v1/glyph/edit" && (typeof body.noun !== "string" || !body.noun.trim() || body.noun.length > 48
    || typeof body.instruction !== "string" || !body.instruction.trim() || body.instruction.length > 160
    || !validStrokes(body.current))) {
    return send(res, 400, { error: "A valid current doodle and short edit are required." }, headers);
  }
  if (route === "/v1/lesson-nouns" && (typeof body.topic !== "string" || !body.topic.trim() || body.topic.length > 120)) {
    return send(res, 400, { error: "A short lesson topic is required." }, headers);
  }
  if (!budgetRemaining()) return send(res, 429, { error: "The daily model-request allowance is exhausted. Local drawings still work." }, headers);
  if (activeRequests >= limits.maxConcurrentRequests) return send(res, 429, { error: "The drawing service is busy. Please try again shortly." }, headers);
  activeRequests += 1;
  const disconnected = new AbortController();
  const onClose = () => { if (!res.writableEnded) disconnected.abort(); };
  res.once("close", onClose);
  try {
    const options = { signal: AbortSignal.any([AbortSignal.timeout(42_000), disconnected.signal]), fetchImpl: limitedModelFetch };
    const result = route === "/v1/interpret" ? await interpretScene(body, configuration, options)
      : route === "/v1/glyph" ? await generateGlyph(body, configuration, options)
      : route === "/v1/glyph/edit" ? await editGlyph(body, configuration, options)
      : await planLesson(body, configuration, options);
    return send(res, 200, result, headers);
  } catch (error) {
    if (disconnected.signal.aborted) return;
    if (error instanceof Error && error.message === "Provider call budget exhausted.") {
      return send(res, 429, { error: "The daily model-request allowance is exhausted. Local drawings still work." }, headers);
    }
    if (error instanceof Error && error.message === "Model provider returned HTTP 429.") {
      return send(res, 429, { error: "The model provider is rate limiting requests. Local drawings still work; try again later." }, headers);
    }
    console.error(error instanceof Error ? error.message : "Interpreter failure");
    return send(res, 502, { error: "The model could not produce a valid drawing plan. The current scene is safe." }, headers);
  } finally { res.off("close", onClose); activeRequests -= 1; }
});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createInterpreterServer().listen(port, "0.0.0.0", () => console.log(`Tegeera interpreter listening on ${port}`));
}
