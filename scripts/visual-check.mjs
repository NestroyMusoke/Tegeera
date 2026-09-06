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

// Exercise the real App in a browser, without adding test-only props to production.
const appBundle = await build({
  stdin: { contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import App from './src/App';
    createRoot(document.getElementById('root')).render(<App />);
    const pause = () => new Promise(resolve => setTimeout(resolve, 200));
    const check = (condition, message) => { if (!condition) throw Error(message); };
    async function submit(text) {
      const input = document.getElementById('teacher-input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await pause();
      input.closest('form').requestSubmit();
      await pause();
    }
    async function verify() {
      await pause();
      await submit('Three students each have a book');
      check(document.querySelectorAll('.ownership-card').length === 3, 'Creation failed');
      const controls = document.querySelector('.control-card');
      const details = document.querySelector('.ownership-details');
      check(controls.getBoundingClientRect().bottom <= details.getBoundingClientRect().top, 'Controls overlap details');
      await submit('The first student gives book 1 to the second student');
      check(document.querySelectorAll('[data-owner-id="student-2"] [data-owned-id]').length === 2, 'Transfer failed');
      document.querySelector('.undo-button').click(); await pause();
      check(document.querySelectorAll('[data-owner-id="student-1"] [data-owned-id]').length === 1, 'Undo failed');
      await submit('A dragon eats the books');
      check(!!document.querySelector('.clarification'), 'Missing clarification');
      check(document.querySelectorAll('.doodle-object').length === 6, 'Unsupported input changed scene');
      await submit('Clear everything');
      check(document.querySelectorAll('.ownership-card').length === 0, 'Clear failed');
      document.querySelector('.undo-button').click(); await pause();
      check(document.querySelectorAll('.ownership-card').length === 3, 'Undo clear failed');
      check(document.documentElement.scrollWidth <= innerWidth, 'Horizontal overflow');
      check(document.querySelector('.undo-button').getBoundingClientRect().height >= 44, 'Undo tap area too small');
      document.getElementById('qa-result').textContent = 'PASS: create, transfer, undo, clarification, clear, restore, layout';
    }
    verify().catch(error => { document.getElementById('qa-result').textContent = 'FAIL: ' + error.message; });
  `, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, platform: "browser", format: "iife", jsx: "automatic", write: false,
  define: { "process.env.NODE_ENV": '"production"' },
});
await writeFile(resolve(output, "app-check.js"), appBundle.outputFiles[0].text);
await writeFile(resolve(output, "app-check.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><output id="qa-result">RUNNING</output><script src="app-check.js"></script></body></html>`);
await writeFile(resolve(output, "app-phone.html"), '<!doctype html><html><body style="margin:0"><iframe title="Full app at 390 pixels" src="app-check.html" style="width:390px;height:1750px;border:0"></iframe></body></html>');
await writeFile(resolve(output, "app-small-phone.html"), '<!doctype html><html><body style="margin:0"><iframe title="Full app at 320 pixels" src="app-check.html" style="width:320px;height:1750px;border:0"></iframe></body></html>');
