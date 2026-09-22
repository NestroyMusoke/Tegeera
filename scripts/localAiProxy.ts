import type { Plugin } from "vite";

const route = "/api/tegeera-ai";
const allowedModels = new Set(["google/gemma-4-26b-a4b-it:free", "google/gemma-4-31b-it:free", "openrouter/free"]);

/** Development-only bridge: the browser never receives the local OpenRouter key. */
export function localAiProxy(apiKey: string): Plugin {
  let windowStart = 0;
  let requests = 0;
  return {
    name: "tegeera-local-ai-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(route)) return next();
        const send = (status: number, body: object) => {
          res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
          res.end(JSON.stringify(body));
        };
        if (req.url === `${route}/health` && req.method === "GET") {
          return send(200, { configured: Boolean(apiKey), mode: "local" });
        }
        if (req.url !== `${route}/chat/completions` || req.method !== "POST") return send(404, { error: "Not found." });
        if (!apiKey) return send(503, { error: "Local AI key is not configured." });
        const origin = req.headers.origin;
        if (origin && !/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)) {
          return send(403, { error: "Only the local app may use this bridge." });
        }
        const now = Date.now();
        if (now - windowStart >= 60_000) { windowStart = now; requests = 0; }
        if (++requests > 30) return send(429, { error: "Local AI request limit reached." });
        try {
          let raw = "";
          for await (const chunk of req) {
            raw += chunk;
            if (raw.length > 32_000) return send(413, { error: "Request too large." });
          }
          const body = JSON.parse(raw) as { model?: unknown; models?: unknown; messages?: unknown; stream?: unknown; max_tokens?: unknown };
          const validModel = typeof body.model === "string" && allowedModels.has(body.model);
          const validFallbacks = Array.isArray(body.models) && body.models.length >= 1 && body.models.length <= 3
            && body.models.every((model: unknown) => typeof model === "string" && allowedModels.has(model));
          if ((!validModel && !validFallbacks)
            || !Array.isArray(body.messages) || body.messages.length !== 1
            || body.messages[0]?.role !== "user" || typeof body.messages[0]?.content !== "string"
            || body.messages[0].content.length > 20_000
            || typeof body.max_tokens !== "number" || body.max_tokens > 3600 || body.max_tokens < 1
            || (body.stream !== undefined && typeof body.stream !== "boolean")) {
            return send(400, { error: "Invalid local AI request." });
          }
          const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
              "http-referer": "http://localhost:5173/",
              "x-title": "Tegeera"
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(45_000)
          });
          res.writeHead(upstream.status, {
            "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
            "cache-control": "no-store"
          });
          if (!upstream.body) return res.end();
          const reader = upstream.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (res.destroyed) { await reader.cancel(); break; }
            res.write(value);
          }
          res.end();
        } catch {
          if (!res.headersSent) send(502, { error: "Local AI service is unavailable." });
          else res.end();
        }
      });
    }
  };
}
