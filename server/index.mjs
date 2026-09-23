import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { editGlyph, generateGlyph, interpretScene, modelConfiguration, planLesson, validStrokes } from "./engine.mjs";

const port = Number(process.env.PORT || 8080);
// Capacitor's Android WebView uses https://localhost by default. Configure
// the public Pages origin separately in deployment settings.
const origins = new Set((process.env.ALLOWED_ORIGINS || "http://localhost:5173,https://localhost").split(",").map((value) => value.trim()).filter(Boolean));

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
function rateAllowed(ip, buckets) {
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
    if (raw.length > 32_000) throw new Error("Request too large.");
  }
  return JSON.parse(raw);
}

export function createInterpreterServer({ configuration = modelConfiguration(), allowedOrigins = origins, modelFetch = fetch } = {}) {
const buckets = new Map();
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
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (!rateAllowed(ip, buckets)) return send(res, 429, { error: "Please wait before trying again." }, headers);
  let body;
  try { body = await readJson(req); }
  catch { return send(res, 400, { error: "Invalid or oversized JSON request." }, headers); }
  if (!body || typeof body !== "object") return send(res, 400, { error: "A JSON object is required." }, headers);
  if (route === "/v1/interpret" && (typeof body.text !== "string" || !body.text.trim() || body.text.length > 500
    || !body.scene || !Array.isArray(body.scene.entities) || body.scene.entities.length > 64
    || !Array.isArray(body.scene.relations) || body.scene.relations.length > 128)) {
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
  try {
    const options = { signal: AbortSignal.timeout(42_000), fetchImpl: modelFetch };
    const result = route === "/v1/interpret" ? await interpretScene(body, configuration, options)
      : route === "/v1/glyph" ? await generateGlyph(body, configuration, options)
      : route === "/v1/glyph/edit" ? await editGlyph(body, configuration, options)
      : await planLesson(body, configuration, options);
    return send(res, 200, result, headers);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Interpreter failure");
    return send(res, 502, { error: "The model could not produce a valid drawing plan. The current scene is safe." }, headers);
  }
});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createInterpreterServer().listen(port, "0.0.0.0", () => console.log(`Tegeera interpreter listening on ${port}`));
}
