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
    }
    export function renderPerformance() {
      const base = { kind: 'person', y: 45, scale: 1.35, direction: 'right', highlighted: false };
      const scene = { sceneId: 'performance-check', revision: 1, relations: [], entities: [
        { ...base, id: 'person-wave', label: 'wave', x: 20, performance: { rightArm: { upper: -72, joint: 18 }, expression: { smile: .8, gazeX: .5 }, loop: 'wave', intensity: .8 } },
        { ...base, id: 'person-celebrate', label: 'celebrate', x: 50, performance: { leftArm: { upper: 220, joint: 0 }, rightArm: { upper: -40, joint: 0 }, expression: { smile: 1, mouthOpen: .65, browLift: .6 }, loop: 'celebrate', intensity: 1 } },
        { ...base, kind: 'teacher', id: 'teacher-talk', label: 'explain', x: 80, performance: { bodyLean: 7, headTilt: -6, expression: { mouthOpen: .45, gazeX: .8 }, loop: 'talk', intensity: .55 } }
      ]};
      return renderToStaticMarkup(<DoodleCanvas scene={scene}/>);
    }
    export function renderSymbolAtlas() {
      const labels = ['sunlight', 'evaporation', 'rainfall', 'plant', 'electricity', 'pressure', 'expansion', 'damage', 'constitutional legitimacy'];
      const scene = { sceneId: 'symbol-atlas', revision: 1, relations: [], entities: labels.map((label, index) => ({
        id: 'concept-' + (index + 1), kind: 'generic', label,
        x: 14 + (index % 5) * 18, y: 28 + Math.floor(index / 5) * 42,
        scale: 0.9, direction: 'right', highlighted: false
      })) };
      return renderToStaticMarkup(<DoodleCanvas scene={scene}/>);
    }`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", write: false,
});
const bundlePath = resolve(output, "renderer.cjs");
await writeFile(bundlePath, result.outputFiles[0].text);
const { render, renderPerformance, renderSymbolAtlas } = createRequire(import.meta.url)(bundlePath);
// Inspect the settled frame; animation timing needs separate interaction checks.
const css = await readFile("src/styles.css", "utf8") + `
  .doodle-stroke, .doodle-detail, .accent-stroke, .entity-label, .motion-flow, .handover-flow, .event-flow, .visual-action-flow, .visual-action-particle, .handover-object > g:first-child, .attached-object {
    animation: none !important; stroke-dashoffset: 0; opacity: 1;
  }`;
const cases = {
  individual: ["Three students each have two books"],
  transfer: ["Three students each have a book", "The first student gives book 1 to the second student"],
  shared: ["Three students share two books"],
  mixed: ["Three students share two books", "Another student arrives with her own book"],
  targeted: ["A teacher points at a tree"],
  stagedTarget: ["A tree", "Move the tree right", "Move the tree right", "A teacher points at the tree"],
  contact: ["A teacher touches a book"],
  contactProcess: ["A teacher touches a process"],
  holding: ["A teacher holds a book"],
  carrying: ["A student carries a book"],
  timeline: ["Evaporation happens before condensation", "Condensation happens before rainfall"],
  causality: ["Heavy rain causes soil erosion"],
  eventGraph: ["Heat causes expansion", "Heat causes pressure", "Expansion causes damage", "Pressure causes damage", "Heat causes damage"],
  visualPhrase: ["A plant absorbs sunlight and water, then produces oxygen"],
  transformation: ["Water evaporates into a cloud"],
  cpuQueue: ["Imagine three processes waiting in a CPU queue", "Make that four processes", "Move the CPU to the right", "What if the second process goes first"],
};
for (const [name, commands] of Object.entries(cases)) {
  await writeFile(resolve(output, `${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><main class="app"><h1>${name}</h1>${render(commands)}</main></body></html>`);
}
await writeFile(resolve(output, "performance.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><main class="app"><h1>Composable performance protocol</h1>${renderPerformance()}</main></body></html>`);
await writeFile(resolve(output, "symbol-atlas.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><main class="app"><h1>Compositional visual-symbol system</h1>${renderSymbolAtlas()}</main></body></html>`);
await writeFile(resolve(output, "phone.html"), '<!doctype html><html><body style="margin:0;background:#fff"><iframe title="390-pixel phone viewport" src="individual.html" style="display:block;width:390px;height:1200px;border:0"></iframe></body></html>');
console.log(`Rendered ${Object.keys(cases).length + 2} real-component fixtures in ${output}`);

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
      await submit('Could you please show me three students each having a book');
      check(document.querySelectorAll('.ownership-card').length === 3, 'Creation failed');
      check(document.querySelectorAll('.character-rig').length === 6, 'Articulated character rigs missing from canvas or ownership cards');
      check(new Set([...document.querySelectorAll('.doodle-canvas .character-rig')].map(rig => rig.dataset.pose)).size >= 2,
        'Character pose variation missing');
      check(document.querySelectorAll('.doodle-canvas .rig-arm').length === 6, 'Articulated arms missing');
      check(document.querySelectorAll('.doodle-canvas .rig-leg').length === 6, 'Articulated legs missing');
      await submit('The first student waves');
      check(document.querySelector('[data-entity-id="student-1"] .character-rig')?.dataset.motion === 'wave', 'Spoken action did not start its performance');
      await submit('The first student stops waving');
      check(document.querySelector('[data-entity-id="student-1"] .character-rig')?.dataset.motion === 'none', 'Spoken stop did not clear its performance');
      await submit('The first student points at book 1');
      check(document.querySelector('[data-entity-id="student-1"] .character-rig')?.dataset.pose === 'custom', 'Target geometry did not drive the character pose');
      check(document.querySelector('.relationship-actsOn')?.textContent.includes('point at'), 'Action-target relation missing');
      await submit('The first student stops pointing');
      check(!document.querySelector('.relationship-actsOn'), 'Stopped target relation remained visible');
      const controls = document.querySelector('.control-card');
      const details = document.querySelector('.ownership-details');
      check(controls.getBoundingClientRect().bottom <= details.getBoundingClientRect().top, 'Controls overlap details');
      await submit('The first student gives book 1 to the second student');
      check(document.querySelectorAll('[data-owner-id="student-2"] [data-owned-id]').length === 2, 'Transfer failed');
      check(document.querySelectorAll('.doodle-canvas [data-entity-id="book-1"]').length === 1, 'Transfer duplicated the object');
      check(document.querySelectorAll('.handover-annotation').length === 1, 'Handover choreography is missing');
      check(document.querySelector('[data-entity-id="book-1"]')?.dataset.handoverObject === 'true', 'Transferred object identity is not marked');
      document.querySelector('.undo-button').click(); await pause();
      check(document.querySelectorAll('[data-owner-id="student-1"] [data-owned-id]').length === 1, 'Undo failed');
      check(!document.querySelector('.handover-annotation'), 'Undo left handover choreography behind');
      await submit('A dragon eats the books');
      check(!!document.querySelector('.clarification'), 'Missing clarification');
      check(document.querySelectorAll('.doodle-object').length === 6, 'Unsupported input changed scene');
      await submit('Clear everything');
      check(document.querySelectorAll('.ownership-card').length === 0, 'Clear failed');
      document.querySelector('.undo-button').click(); await pause();
      check(document.querySelectorAll('.ownership-card').length === 3, 'Undo clear failed');
      check(document.documentElement.scrollWidth <= innerWidth, 'Horizontal overflow');
      check(document.querySelector('.undo-button').getBoundingClientRect().height >= 44, 'Undo tap area too small');
      const drawing = document.querySelector('.doodle-canvas').innerHTML;
      const detailButton = [...document.querySelectorAll('button')].find(button => button.textContent === 'Read details');
      detailButton.click(); await pause();
      const viewport = document.querySelector('.canvas-viewport');
      check(viewport.scrollWidth > viewport.clientWidth, 'Detail view is not scrollable');
      const label = document.querySelector('.doodle-canvas .entity-label');
      check(parseFloat(getComputedStyle(label).fontSize) * label.getScreenCTM().a >= 15, 'Detail labels are too small');
      const viewportBox = viewport.getBoundingClientRect();
      const labelBox = label.getBoundingClientRect();
      check(labelBox.top >= viewportBox.top && labelBox.bottom <= viewportBox.bottom,
        'Detail did not open on a readable label: label=' + JSON.stringify({ top: labelBox.top, bottom: labelBox.bottom }) +
        ' viewport=' + JSON.stringify({ top: viewportBox.top, bottom: viewportBox.bottom, scrollTop: viewport.scrollTop }));
      viewport.scrollLeft = 600; viewport.scrollTop = 250; await pause();
      check(viewport.scrollLeft > 0 && viewport.scrollTop > 0, 'Detail panning failed');
      check(document.querySelector('.doodle-canvas').innerHTML === drawing, 'Detail changed the scene');
      [...document.querySelectorAll('button')].find(button => button.textContent === 'Overview').click(); await pause();
      check(viewport.scrollLeft === 0 && viewport.scrollTop === 0, 'Overview did not reset scrolling');
      check(document.documentElement.scrollWidth <= innerWidth, 'Detail caused page overflow');
      await submit('Clear everything');
      await submit('A teacher carries a book');
      const carrier = document.querySelector('[data-entity-id="teacher-1"]');
      const carried = document.querySelector('[data-entity-id="book-1"]');
      check(carried?.dataset.attachedTo === 'teacher-1', 'Carried object identity is not attached to its actor');
      check(!!carried?.querySelector('.attached-object.motion-walk'), 'Carried object does not share walking motion');
      const carrierBefore = carrier?.getAttribute('transform');
      const carriedBefore = carried?.getAttribute('transform');
      await submit('Move the teacher right');
      check(carrier?.getAttribute('transform') !== carrierBefore, 'Carrier did not move');
      check(carried?.getAttribute('transform') !== carriedBefore, 'Attached object did not follow carrier movement');
      if (new URLSearchParams(location.search).has('detail')) { detailButton.click(); await pause(); }
      document.getElementById('qa-result').textContent = 'PASS: teaching workflow, handover identity and Undo, spoken performance, target lifecycle, contact attachment movement, character rigs, detail size, scroll, overview reset, layout';
    }
    async function verifyQueue() {
      await pause();
      await submit('Imagine three processes waiting in a CPU queue');
      check(document.querySelectorAll('[data-entity-id^="process-"]').length === 3, 'Initial process count failed');
      check(document.querySelectorAll('[data-entity-id="cpu-1"]').length === 1, 'CPU missing');
      await submit('Make that four processes');
      check(document.querySelectorAll('[data-entity-id^="process-"]').length === 4, 'Queue correction failed');
      const cpu = document.querySelector('[data-entity-id="cpu-1"]');
      const beforeMove = cpu.getAttribute('transform');
      await submit('Move the CPU to the right');
      check(cpu.getAttribute('transform') !== beforeMove, 'CPU did not move');
      await submit('What if the second process goes first');
      check(document.querySelector('.queue-annotation').getAttribute('aria-label').includes('process 2, process 1'), 'Queue order did not change');
      check(document.querySelectorAll('.queue-annotation text').length === 5, 'Queue position labels missing');
      document.querySelector('.undo-button').click(); await pause();
      check(document.querySelector('.queue-annotation').getAttribute('aria-label').includes('process 1, process 2'), 'Queue Undo failed');
      check(document.documentElement.scrollWidth <= innerWidth, 'Queue caused page overflow');
      document.getElementById('qa-result').textContent = 'PASS: CPU queue create, count correction, CPU move, reorder, undo, layout';
    }
    async function verifyEvents() {
      await pause();
      await submit('Evaporation happens before condensation');
      await submit('Condensation comes before rainfall');
      check(document.querySelectorAll('.event-before').length === 2, 'Timeline chain did not render');
      check(document.querySelectorAll('[data-renderer="generic"]').length === 3, 'Timeline duplicated or omitted a concept');
      check(document.querySelector('[data-symbol-id="evaporation"] [data-primitive="water"]'), 'Evaporation symbol did not compose its water anchor');
      check(document.querySelector('[data-symbol-id="condensation"] [data-primitive="cloud"]'), 'Condensation symbol did not compose its cloud anchor');
      check(document.querySelector('[data-symbol-id="rain"] [data-primitive="droplet"]'), 'Rainfall symbol did not compose a falling-water cue');
      const before = document.querySelector('.doodle-canvas').innerHTML;
      await submit('Rainfall happens before evaporation');
      check(!!document.querySelector('.clarification'), 'Temporal cycle did not request clarification');
      check(document.querySelector('.doodle-canvas').innerHTML === before, 'Rejected temporal cycle changed the scene');
      document.querySelector('.undo-button').click(); await pause();
      check(document.querySelectorAll('.event-before').length === 1, 'Timeline Undo did not restore the prior graph');
      await submit('Clear everything');
      await submit('Heavy rain causes soil erosion');
      check(document.querySelectorAll('.event-causes').length === 1, 'Causal relation did not render');
      check(document.querySelector('.relationship-causes')?.textContent.includes('causes'), 'Accessible causal key is missing');
      check(document.querySelector('[data-symbol-id="soil-erosion"] [data-primitive="ground"]'), 'Soil erosion symbol is missing');
      await submit('Clear everything');
      await submit('Heat causes expansion');
      await submit('Heat causes pressure');
      await submit('Expansion causes damage');
      await submit('Pressure causes damage');
      await submit('Heat causes damage');
      check(document.querySelectorAll('.event-causes').length === 5, 'Branching causal graph did not render every edge');
      check(document.querySelectorAll('[data-renderer="generic"]').length === 4, 'Branching graph duplicated a converged concept');
      check(document.querySelectorAll('[data-symbol-fallback="false"]').length === 4, 'Known graph concepts did not retrieve symbols');
      check(document.querySelectorAll('.event-flow[data-route="outer"]').length >= 1, 'Long edge did not use an outer route');
      check(document.documentElement.scrollWidth <= innerWidth, 'Event diagram caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: temporal chain, concept reuse, composed symbols, honest retrieval, cycle rollback, Undo, branching, convergence, outer routing, accessibility, layout';
    }
    async function verifyPhrases() {
      await pause();
      await submit('A plant absorbs sunlight and water, then produces oxygen');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 4, 'Explanation graph did not create four identities');
      check(document.querySelectorAll('.visual-action-annotation').length === 3, 'Coordinated action connectors are missing');
      check(document.querySelector('[data-symbol-id="plant"]'), 'Plant symbol is missing');
      check(document.querySelector('[data-symbol-id="sunlight"]'), 'Sunlight symbol is missing');
      check(document.querySelectorAll('[data-symbol-id="plant"]').length === 1, 'Continued phrase duplicated the plant');
      check([...document.querySelectorAll('.visual-action-annotation')].some(node => node.getAttribute('aria-label') === 'plant absorbs sunlight'), 'Accessible sunlight absorption is wrong');
      check([...document.querySelectorAll('.visual-action-annotation')].some(node => node.getAttribute('aria-label') === 'plant absorbs water'), 'Accessible water absorption is wrong');
      check([...document.querySelectorAll('.visual-action-annotation')].some(node => node.getAttribute('aria-label') === 'plant produces oxygen'), 'Inherited output meaning is wrong');
      check(document.querySelector('[data-entity-id="concept-4"] [data-symbol-fallback="true"]'), 'Unknown oxygen concept did not retain honest fallback');
      const before = document.querySelector('.doodle-canvas').innerHTML;
      await submit('The plant does not release oxygen');
      check(!!document.querySelector('.clarification'), 'Negated visual action did not request clarification');
      check(document.querySelector('.doodle-canvas').innerHTML === before, 'Rejected negation changed the scene');
      await submit('Clear everything');
      await submit('Water evaporates into a cloud');
      check(document.querySelector('.visual-action-cue-transform'), 'Transformation connector is missing');
      check(document.querySelector('[data-symbol-id="water"]'), 'Water symbol is missing');
      check(document.querySelector('[data-symbol-id="cloud"]'), 'Cloud symbol is missing');
      check(document.documentElement.scrollWidth <= innerWidth, 'Visual phrase caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: coordinated objects, inherited subject, atomic graph planning, identity reuse, semantic direction, composed symbols, honest fallback, negation rollback, transformation, accessibility, layout';
    }
    const params = new URLSearchParams(location.search);
    (params.has('phrases') ? verifyPhrases() : params.has('events') ? verifyEvents() : params.has('queue') ? verifyQueue() : verify()).catch(error => { document.getElementById('qa-result').textContent = 'FAIL: ' + error.message; });
  `, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, platform: "browser", format: "iife", jsx: "automatic", write: false,
  define: { "process.env.NODE_ENV": '"production"' },
});
await writeFile(resolve(output, "app-check.js"), appBundle.outputFiles[0].text);
await writeFile(resolve(output, "app-check.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><output id="qa-result">RUNNING</output><script src="app-check.js"></script></body></html>`);
const framedApp = (width, query = "") => `<!doctype html><html><body style="margin:0"><iframe id="app-frame" title="Full app at ${width} pixels" src="app-check.html${query}" style="width:${width}px;height:1750px;border:0"></iframe><output id="frame-result"></output><script>setInterval(() => { const result = document.getElementById('app-frame').contentDocument?.getElementById('qa-result'); if (result) document.getElementById('frame-result').textContent = result.textContent; }, 100);</script></body></html>`;
await writeFile(resolve(output, "app-phone.html"), framedApp(390));
await writeFile(resolve(output, "app-small-phone.html"), framedApp(320));
await writeFile(resolve(output, "app-detail-phone.html"), framedApp(390, "?detail"));
await writeFile(resolve(output, "app-queue-phone.html"), framedApp(390, "?queue"));
await writeFile(resolve(output, "app-events-phone.html"), framedApp(390, "?events"));
await writeFile(resolve(output, "app-phrases-phone.html"), framedApp(390, "?phrases"));
