import { build } from "esbuild";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const escape = (value) => String(value).replace(/[&<>"']/g,
  (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let renderer;

async function loadRenderer(directory) {
  if (renderer) return renderer;
  directory = resolve(directory);
  await mkdir(directory, { recursive: true });
  const built = await build({ stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { DoodleCanvas } from './src/components/DoodleCanvas';
    import { compileUniversalScene } from './src/llm/universalScene';
    import { initialScene, applyDoodleScript } from './src/doodlescript/scene';
    import { validateDoodleScript } from './src/doodlescript/validator';
    import { withProvisionalPreviews } from './src/glyphs/provisionalCatalog';
    export function render(candidate, statement) {
      const script = compileUniversalScene(candidate, initialScene, statement);
      const checked = validateDoodleScript(script, initialScene);
      if (!checked.ok) throw new Error(checked.issues.map(issue => issue.message).join('; '));
      return renderToStaticMarkup(React.createElement(DoodleCanvas,
        { scene: withProvisionalPreviews(applyDoodleScript(initialScene, checked.script)) }));
    }
  `, resolveDir: root, loader: "tsx" }, bundle: true, platform: "node", format: "cjs", jsx: "automatic", write: false });
  const bundlePath = join(directory, "renderer.cjs");
  await writeFile(bundlePath, built.outputFiles[0].text);
  renderer = createRequire(import.meta.url)(bundlePath).render;
  return renderer;
}

/** Render a synthetic probe through the real compiler/canvas; not visual approval. */
export async function renderNovelScene(directory, item, candidate, score) {
  directory = resolve(directory);
  const render = await loadRenderer(directory);
  const relationNote = `<p>Annotated relation meaning: ${escape(score.relationCoverage ?? "not checked")}. This checks only explicitly listed labels, not all possible meanings.</p>`;
  const markup = render(candidate, item.text);
  const css = await readFile(join(root, "src", "styles.css"), "utf8");
  const file = join(directory, `${item.id}.html`);
  // Zero duration alone leaves per-stroke delays active in headless captures.
  // Freeze only the saved review artifact, not the application's animations.
  const finalFrame = '*{animation:none!important;transition:none!important}.doodle-stroke,.doodle-detail,.accent-stroke,.glyph-ink-path{stroke-dasharray:none!important;stroke-dashoffset:0!important}.entity-label{opacity:1!important}';
  await writeFile(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tegeera synthetic probe ${escape(item.id)}</title><style>${css}\n${finalFrame}body{background:#f4f1e9;margin:0;padding:12px}.probe-note{font:14px system-ui;max-width:390px;margin:0 auto 10px;padding:12px;background:white;border:1px solid #cad2c5;border-radius:12px}.app{max-width:390px;margin:auto}</style></head><body><section class="probe-note"><strong>Synthetic probe ${escape(item.id)}</strong><p>${escape(item.text)}</p><p>Role coverage ${escape(score.roleCoverage)}, directed-endpoint coverage ${escape(score.linkCoverage)}. Actual picture requires human review; still image does not assess animation.</p>${relationNote}</section>${markup}</body></html>`);
  return file;
}
