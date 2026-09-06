import { build } from "esbuild";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

// Render the real component and styles, never a hand-written stand-in.
const output = resolve(process.argv[2] ?? ".visual-check");
await mkdir(output, { recursive: true });
const result = await build({
  stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { DoodleCanvas } from './src/components/DoodleCanvas';
    import { interpretTeacherText } from './src/doodlescript/interpret';
    import { validateDoodleScript } from './src/doodlescript/validator';
    import { initialScene, applyDoodleScript } from './src/doodlescript/scene';
    export function render(commands) {
      let scene = initialScene;
      for (const text of commands) {
        const result = interpretTeacherText(text, scene);
        if (!result.ok) throw Error(result.message);
        const valid = validateDoodleScript(result.script, scene);
        if (!valid.ok) throw Error(JSON.stringify(valid.issues));
        scene = applyDoodleScript(scene, valid.script);
      }
      return renderToStaticMarkup(<DoodleCanvas scene={scene}/>);
    }`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", write: false,
});
const bundlePath = resolve(output, "renderer.cjs");
await writeFile(bundlePath, result.outputFiles[0].text);
const { render } = createRequire(import.meta.url)(bundlePath);
// Inspect the settled frame; animation timing needs separate interaction checks.
const css = await readFile("src/styles.css", "utf8") + `
  .doodle-stroke, .doodle-detail, .accent-stroke, .entity-label, .motion-flow {
    animation: none !important; stroke-dashoffset: 0; opacity: 1;
  }`;
const cases = {
  individual: ["Three students each have two books"],
  transfer: ["Three students each have a book", "The first student gives book 1 to the second student"],
  shared: ["Three students share two books"],
  mixed: ["Three students share two books", "Another student arrives with her own book"],
};
for (const [name, commands] of Object.entries(cases)) {
  await writeFile(resolve(output, `${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><main class="app"><h1>${name}</h1>${render(commands)}</main></body></html>`);
}
await writeFile(resolve(output, "phone.html"), '<!doctype html><html><body style="margin:0;background:#fff"><iframe title="390-pixel phone viewport" src="individual.html" style="display:block;width:390px;height:1200px;border:0"></iframe></body></html>');
console.log(`Rendered ${Object.keys(cases).length} real-component fixtures in ${output}`);
