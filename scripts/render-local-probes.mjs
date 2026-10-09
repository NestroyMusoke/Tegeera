import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
const root = resolve(import.meta.dirname, "..");
const corpus = JSON.parse(await readFile(resolve(process.argv[2] ?? join(root, "evaluation/propagation-probes.json")), "utf8"));
const directory = join(root, ".visual-check", "local-propagation");
await mkdir(directory, { recursive: true });
const compiled = await build({ stdin: { contents: `
  import React from 'react';
  import {renderToStaticMarkup} from 'react-dom/server';
  import {DoodleCanvas} from './src/components/DoodleCanvas';
  import {interpretTeacherText} from './src/doodlescript/interpret';
  import {initialScene, applyDoodleScript} from './src/doodlescript/scene';
  import {validateDoodleScript} from './src/doodlescript/validator';
  export function render(text) {
    const result = interpretTeacherText(text, initialScene);
    if (!result.ok) throw new Error(result.message);
    const checked = validateDoodleScript(result.script, initialScene);
    if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
    return renderToStaticMarkup(React.createElement(DoodleCanvas, {scene: applyDoodleScript(initialScene, checked.script)}));
  }`, resolveDir: root, loader: "tsx" }, bundle: true, platform: "node", format: "cjs", jsx: "automatic", write: false });
const bundle = join(directory, "renderer.cjs");
await writeFile(bundle, compiled.outputFiles[0].text);
const { render } = createRequire(import.meta.url)(bundle);
const css = await readFile(join(root, "src/styles.css"), "utf8");
const timings = [];
for (const item of corpus.cases) {
  if (!/^[a-z0-9-]+$/.test(item.id) || typeof item.text !== "string") throw new Error("Invalid local probe");
  const html = render(item.text);
  await writeFile(join(directory, `${item.id}.html`), `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
  console.log(`${item.id}: validated and rendered`);
  if (process.argv.includes("--benchmark")) {
    for (let warmup = 0; warmup < 3; warmup++) render(item.text);
    const samples = Array.from({ length: 30 }, () => { const start = performance.now(); render(item.text); return performance.now() - start; }).sort((a, b) => a - b);
    const row = { id: item.id, samples: samples.length, p50Ms: Number(samples[14].toFixed(2)), p95Ms: Number(samples[28].toFixed(2)), maxMs: Number(samples[29].toFixed(2)) };
    timings.push(row); console.log(JSON.stringify(row));
  }
}
if (timings.length) await writeFile(join(directory, "latency.json"), JSON.stringify({
  scope: "Local interpretation, validation and static SVG generation on this PC. Excludes network, speech, browser paint and phone scheduling.", cases: timings
}, null, 2));
