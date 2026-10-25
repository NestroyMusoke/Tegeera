import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createInterpreterServer } from "./index.mjs";

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const security = {
  "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "microphone=(self), camera=(), geolocation=()",
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://openrouter.ai; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
};

/** One deployment, one origin. Only built public assets are readable, never source/secrets. */
export function createWebServer({ directory = fileURLToPath(new URL("../dist/", import.meta.url)), apiOptions = {} } = {}) {
  const root = realpathSync.native(directory);
  const budgetFile = apiOptions.budgetFile ?? process.env.PROVIDER_BUDGET_FILE;
  if (budgetFile) {
    const distance = relative(root, resolve(budgetFile));
    if (distance === "" || (!isAbsolute(distance) && distance !== ".." && !distance.startsWith(`..${sep}`))) {
      throw new Error("The provider budget must be outside the public build directory.");
    }
  }
  const api = createInterpreterServer(apiOptions);
  return createServer(async (req, res) => {
    for (const [name, value] of Object.entries(security)) res.setHeader(name, value);
    if (req.url?.startsWith("/api/")) {
      req.url = req.url.slice(4);
      api.emit("request", req, res);
      return;
    }
    const missing = () => { res.writeHead(404, { "content-type": "text/plain", "cache-control": "no-store" }); res.end("Not found"); };
    if (!["GET", "HEAD"].includes(req.method)) return missing();
    try {
      const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
      if (!path.startsWith("/") || path.includes("\\") || path.includes("\0") || path.split("/").some(part => part.startsWith("."))) return missing();
      const candidate = await realpath(resolve(root, `.${path === "/" ? "/index.html" : path}`));
      const distance = relative(root, candidate);
      if (isAbsolute(distance) || distance === ".." || distance.startsWith(`..${sep}`)) return missing();
      const type = mime[extname(candidate)];
      if (!type || !(await stat(candidate)).isFile()) return missing();
      const bytes = await readFile(candidate);
      res.writeHead(200, { "content-type": type, "content-length": bytes.length,
        "cache-control": /^\/assets\/[^/]+-[\w-]+\.(js|css)$/.test(path) ? "public, max-age=31536000, immutable" : "no-cache" });
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch { missing(); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8080);
  const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || `http://localhost:${port},http://127.0.0.1:${port}`).split(",").map(origin => origin.trim()).filter(Boolean));
  createWebServer({ apiOptions: { allowedOrigins } }).listen(port, process.env.HOST || "0.0.0.0", () => console.log(`Tegeera web app listening on ${port}; API at /api`));
}
