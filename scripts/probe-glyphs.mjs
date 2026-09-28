#!/usr/bin/env node
// Explicit credit-consuming visual probe for the runtime stroke generator.
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { generateGlyph, modelConfiguration } from "../server/engine.mjs";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const at = args.indexOf("--nouns");
const nouns = (at >= 0 ? args[at + 1] : "motor,fan,iron nail").split(",").map((noun) => noun.trim()).filter(Boolean);
if (!nouns.length || nouns.length > 3 || nouns.some((noun) => noun.length > 48)) {
  throw new Error("Pass one to three short nouns with --nouns. Each may make two paid model calls.");
}
const configuration = modelConfiguration();
if (configuration?.provider !== "nebius") throw new Error("An ignored private Nebius key is required; no call was made.");
const directory = resolve(root, ".visual-check", "glyph-quality-probe");
await mkdir(directory, { recursive: true });
const built = await build({ stdin: { contents: `export { compileStrokeGlyph } from './src/glyphs/strokeGlyph';`,
  resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false });
const converterPath = join(directory, "stroke-converter.cjs");
await writeFile(converterPath, built.outputFiles[0].text);
const { compileStrokeGlyph } = createRequire(import.meta.url)(converterPath);
const escape = (value) => String(value).replace(/[&<>"']/g,
  (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const rows = [];
for (const noun of nouns) {
  const started = performance.now();
  try {
    const result = await generateGlyph({ noun }, configuration, { signal: AbortSignal.timeout(42_000) });
    const glyph = compileStrokeGlyph(result.candidate);
    const svg = `<svg viewBox="0 0 100 100" role="img" aria-label="Generated ${escape(noun)} doodle">${glyph.parts.map((part) =>
      `<path d="${escape(part.d)}" fill="none" stroke="${escape(part.stroke)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
    rows.push({ noun, ok: true, svg, strokes: glyph.parts.length,
      elapsedMs: Math.round(performance.now() - started), attempts: result.providerAttempts });
  } catch (error) {
    rows.push({ noun, ok: false, error: error instanceof Error ? error.message.slice(0, 160) : "Unknown error",
      elapsedMs: Math.round(performance.now() - started), attempts: error?.providerAttempts ?? null });
  }
  console.log(`${noun}: ${rows.at(-1).ok ? `${rows.at(-1).strokes} strokes` : "not usable"}; ${rows.at(-1).elapsedMs}ms`);
}
const cards = rows.map((row) => `<article><h2>${escape(row.noun)}</h2>${row.ok ? row.svg : `<p>${escape(row.error)}</p>`}<p>${row.ok ? `${row.strokes} validated strokes` : "No validated doodle"} · ${row.elapsedMs} ms · ${row.attempts ?? "?"} attempt(s)</p></article>`).join("");
const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tegeera runtime glyph review</title><style>body{font:16px system-ui;color:#293730;background:#f4f1e9;margin:20px}main{max-width:900px;margin:auto}section{background:white;padding:16px;border-radius:12px;margin-bottom:18px}article{display:inline-block;vertical-align:top;background:white;border:1px solid #cad2c5;border-radius:16px;padding:12px;margin:8px;width:220px}svg{display:block;width:200px;height:200px;background:#fffdf7}h2{margin:0 0 8px}</style><main><section><h1>Runtime doodle quality probe</h1><p>Generated synthetic nouns; inspect recognizability and style manually. Structural validation is not art approval.</p></section>${cards}</main></html>`;
const file = join(directory, "contact-sheet.html");
await writeFile(file, page);
await writeFile(join(directory, "report.json"), `${JSON.stringify({ nouns, rows: rows.map((row) => ({
  noun: row.noun, ok: row.ok, strokes: row.strokes, elapsedMs: row.elapsedMs, attempts: row.attempts,
  ...(row.error ? { error: row.error } : {})
})) }, null, 2)}\n`);
console.log(`Review: ${file}`);
