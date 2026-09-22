import { createServer } from "node:http";

const port = Number(process.env.PORT || 8080);
const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL;
const freeModels = ["google/gemma-4-26b-a4b-it:free", "google/gemma-4-31b-it:free", "openrouter/free"];
const origins = new Set((process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map((v) => v.trim()).filter(Boolean));
const buckets = new Map();
const kinds = ["person", "teacher", "student", "process", "cpu", "car", "book", "desk", "tree", "building", "generic"];

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
function makePrompt(text, scene, reusableNouns = []) {
  return `Translate a teacher's explanation into a small, accurate 2D visual plan. Return ONLY JSON, no markdown.
{"blueprintVersion":"1.0","mode":"replace","confidence":0.9,"objects":[{"id":"source","label":"source","kind":"generic","x":20,"y":30},{"id":"target","label":"target","kind":"generic","x":80,"y":70}],"connections":[{"from":"source","to":"target","label":"flows to"}]}
Preserve every essential visible part, input, output, source, and stated relationship without inventing facts. Use 1-8 distinct objects and 0-12 connections. If the limit hides meaning, confidence must be below 0.58. Kinds: ${kinds.join(", ")}; use generic for anything else. Optional colors: red, orange, yellow, green, blue, purple, pink, brown, black, white, gray. x/y are semantic 0..100 positions and must preserve above/below and left/right. Labels use at most four words. Every connection endpoint must be an exact object ID or an existing scene ID in extend mode. Never reference an omitted object or reuse an existing ID for a new object. Mode is replace unless explicitly extending. Do not emit glyphs, SVG, paths, pixels, explanations, or extra fields. Artwork is resolved separately.
Existing artwork labels (do not change meaning to favor them): ${JSON.stringify(reusableNouns)}.
Teacher: ${JSON.stringify(text)}
Current scene for reference: ${JSON.stringify(scene)}`;
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
      body: JSON.stringify({ ...(model ? { model } : { models: freeModels }), messages: [{ role: "user", content: makePrompt(body.text.trim(), body.scene,
        Array.isArray(body.reusableGlyphNouns) ? body.reusableGlyphNouns.filter((noun) => typeof noun === "string" && noun.length <= 48).slice(0, 12) : []
      ) }], temperature: 0, max_tokens: 3600, reasoning: { enabled: false }, response_format: { type: "json_object" }, provider: { allow_fallbacks: true, data_collection: "deny" } }),
      signal: AbortSignal.timeout(45_000)
    });
    const result = await upstream.json();
    if (!upstream.ok) return send(res, 502, { error: "The language service is temporarily unavailable." }, headers);
    return send(res, 200, { candidate: extractJson(result?.choices?.[0]?.message?.content), provider: "openrouter", model: result.model || model || freeModels[0] }, headers);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Interpreter failure");
    return send(res, 502, { error: "I could not safely translate that explanation." }, headers);
  }
}).listen(port, "0.0.0.0", () => console.log(`Tegeera interpreter listening on ${port}`));
