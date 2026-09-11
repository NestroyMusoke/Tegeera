import { build } from "esbuild";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

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
const gold = JSON.parse(await readFile("evaluation/independent-scene-gold-v1.json", "utf8"));
// Inspect the settled frame; animation timing needs separate interaction checks.
const css = await readFile("src/styles.css", "utf8") + `
  .doodle-stroke, .doodle-detail, .accent-stroke, .entity-label, .motion-flow, .handover-flow, .event-flow, .visual-action-flow, .visual-action-particle, .circulation-flow, .trajectory-flow, .control-flow, .water-cycle-flow, .lifecycle-flow, .lifecycle-creature, .lifecycle-cocoon, .handover-object > g:first-child, .attached-object {
    animation: none !important; stroke-dashoffset: 0; opacity: 1;
  }`;
const fixtureRevision = `sha256:${createHash("sha256").update(result.outputFiles[0].text).update(css).update(JSON.stringify(gold)).digest("hex").slice(0, 16)}`;
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
  conceptRegistry: ["Two tables"],
  partWholeFlow: ["A plant takes in water through its roots and sunlight through its leaves"],
  forceDiagram: ["If you push a box on a rough floor, friction slows it down"],
  labelledContainer: ["A variable is just a labeled box that holds a value"],
  geometricConstruction: ["A right angle is exactly ninety degrees, like the corner of a square"],
  landscapeFlow: ["Rivers usually flow from higher ground down to the sea"],
  circulationLoop: ["The heart pumps blood to the lungs, and the lungs send it back full of oxygen"],
  changingSpeedMotion: ["A ball thrown up in the air slows down, stops for a moment, then falls back faster and faster"],
  callReturnFlow: ["When you call a function, the program jumps to that function, runs it, then comes back to where it left off"],
  fractionSubtraction: ["If you have three-quarters of a pizza and eat one slice, how much is left?"],
  waterCycleLoop: ["Rain falls, soaks into the soil, and some of it later comes back up as evaporation."],
  lifecycleSequence: ["When a caterpillar is ready, it wraps itself up and comes out later as a butterfly."],
  cpuQueue: ["Imagine three processes waiting in a CPU queue", "Make that four processes", "Move the CPU to the right", "What if the second process goes first"],
};
for (const [name, commands] of Object.entries(cases)) {
  await writeFile(resolve(output, `${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><main class="app"><h1>${name}</h1>${render(commands)}</main></body></html>`);
}
await writeFile(resolve(output, "performance.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><main class="app"><h1>Composable performance protocol</h1>${renderPerformance()}</main></body></html>`);
await writeFile(resolve(output, "symbol-atlas.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><main class="app"><h1>Compositional visual-symbol system</h1>${renderSymbolAtlas()}</main></body></html>`);
await writeFile(resolve(output, "phone.html"), '<!doctype html><html><body style="margin:0;background:#fff"><iframe title="390-pixel phone viewport" src="individual.html" style="display:block;width:390px;height:1200px;border:0"></iframe></body></html>');
const reviewFixtureById = {
  1: "partWholeFlow.html", 2: "circulationLoop.html", 3: "lifecycleSequence.html", 11: "forceDiagram.html",
  12: "changingSpeedMotion.html", 21: "labelledContainer.html", 22: "callReturnFlow.html",
  31: "geometricConstruction.html", 32: "fractionSubtraction.html", 41: "landscapeFlow.html",
  42: "waterCycleLoop.html"
};
const reviewCases = gold.cases.filter(({ id, expected }) => reviewFixtureById[id] && expected.intent === "draw");
const reviewCards = reviewCases.map(({ id, expected }) => `<article data-review-case="${id}">
  <h2>Case ${id}: ${expected.visualGrammar}</h2>
  <p><strong>Required cues:</strong> ${expected.visualCues.join(" · ")}</p>
  <iframe title="Review case ${id}" src="${reviewFixtureById[id]}" width="390" height="760"></iframe>
  <fieldset><legend>Decision</legend><button type="button" data-decision="approved">Approve</button><button type="button" data-decision="rejected">Reject</button><strong data-current>Pending</strong></fieldset>
  <label>Review note <textarea rows="3" placeholder="Required for rejection; describe the visible problem"></textarea></label>
</article>`).join("");
await writeFile(resolve(output, "human-visual-review.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{font-family:system-ui,sans-serif;margin:24px;background:#f5f2e9;color:#302e29}header,article{max-width:900px;margin:0 auto 24px;background:white;padding:20px;border-radius:18px;box-shadow:0 8px 24px #24352d18}iframe{display:block;border:2px solid #c7d2cc;border-radius:14px;max-width:100%;background:white}fieldset{border:0;padding:14px 0;display:flex;gap:10px;align-items:center}button{min-height:44px;padding:8px 16px;border-radius:10px;border:1px solid #66877d;background:#edf5f1;font-weight:800}textarea,input{display:block;width:min(100%,600px);box-sizing:border-box;margin-top:6px;padding:9px}header label{display:block;margin:9px 0}.approved{outline:4px solid #62a37e}.rejected{outline:4px solid #c96969}
</style></head><body><header><h1>Tegeera human visual review</h1><p>Automated readiness is not visual approval. Apply every criterion in <code>evaluation/visual-review-protocol.md</code>.</p><label>Reviewer <input id="reviewer" required></label><label>Device/display <input id="device" required></label><label><input id="reduced" type="checkbox" style="display:inline;width:auto"> Reduced-motion rendering also inspected</label><button id="export" type="button">Export review JSON</button><output id="status">0/${reviewCases.length} decided</output></header>${reviewCards}<script>
const decisions={}; const cards=[...document.querySelectorAll('[data-review-case]')];
function refresh(){document.getElementById('status').textContent=Object.keys(decisions).length+'/'+cards.length+' decided';}
for(const card of cards){for(const button of card.querySelectorAll('[data-decision]'))button.addEventListener('click',()=>{const id=Number(card.dataset.reviewCase);const decision=button.dataset.decision;decisions[id]={decision,note:card.querySelector('textarea').value};card.classList.remove('approved','rejected');card.classList.add(decision);card.querySelector('[data-current]').textContent=decision;refresh();});}
document.getElementById('export').addEventListener('click',()=>{for(const card of cards){const id=Number(card.dataset.reviewCase);if(decisions[id])decisions[id].note=card.querySelector('textarea').value;}const rejectedWithoutNote=Object.entries(decisions).find(([,value])=>value.decision==='rejected'&&!value.note.trim());if(rejectedWithoutNote){alert('Case '+rejectedWithoutNote[0]+' needs a rejection note.');return;}const evidence={schemaVersion:'1.0.0',fixtureRevision:${JSON.stringify(fixtureRevision)},reviewedAt:new Date().toISOString(),reviewer:document.getElementById('reviewer').value,device:document.getElementById('device').value,viewportPx:390,reducedMotionChecked:document.getElementById('reduced').checked,cases:decisions};if(!evidence.reviewer||!evidence.device||Object.keys(decisions).length!==cards.length){alert('Enter reviewer and device, and decide every case.');return;}const blob=new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='tegeera-human-visual-review.json';link.click();URL.revokeObjectURL(link.href);});
</script></body></html>`);
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
      check(document.querySelector('[data-relation-kind="queuedFor"][data-relation-family="ordered"][data-relation-layout="queue"]'), 'Registered ordered relation metadata is missing');
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
      await submit('Clear everything');
      await submit('Three students wait in the school queue');
      check(document.querySelectorAll('[data-entity-id^="student-"]').length === 3, 'Service queue members are missing');
      check(document.querySelector('[data-entity-id="building-1"]'), 'Service queue destination is missing');
      check(document.querySelector('.queue-annotation').getAttribute('aria-label').includes('student 1, student 2, student 3, then building 1'), 'Generic ordered roles are wrong');
      await submit('Make that four students');
      await submit('What if the second student goes first');
      check(document.querySelector('.queue-annotation').getAttribute('aria-label').includes('student 2, student 1'), 'Generic queue order did not change');
      check(document.documentElement.scrollWidth <= innerWidth, 'Queue caused page overflow');
      document.getElementById('qa-result').textContent = 'PASS: registered ordered roles, CPU scheduling queue, service queue, capability compatibility, count correction, destination move, generic reorder, undo, layout';
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
      check(document.querySelectorAll('[data-relation-kind="visualAction"][data-relation-family="visual"][data-relation-layout="visual-flow"]').length === 3, 'Visual relation registry metadata is missing');
      check([...document.querySelectorAll('[data-relation-registry-version]')].every(node => node.dataset.relationRegistryVersion === '2.11.0'), 'Relation registry version is missing');
      check([...document.querySelectorAll('[data-layout-registry-version]')].every(node => node.dataset.layoutRegistryVersion === '2.11.0'), 'Layout registry version is missing');
      check(document.querySelectorAll('[data-layout-topology="directed-graph"]').length === 3, 'Visual layout-family topology metadata is missing');
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
      check(document.querySelector('.clarification')?.dataset.clarificationCode === 'negated-claim', 'Negation did not expose a structured reason');
      check(document.querySelector('.doodle-canvas').innerHTML === before, 'Rejected negation changed the scene');
      await submit('Clear everything');
      await submit('Water evaporates into a cloud');
      check(document.querySelector('.visual-action-cue-transform'), 'Transformation connector is missing');
      check(document.querySelector('[data-symbol-id="water"]'), 'Water symbol is missing');
      check(document.querySelector('[data-symbol-id="cloud"]'), 'Cloud symbol is missing');
      check(document.documentElement.scrollWidth <= innerWidth, 'Visual phrase caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: coordinated objects, inherited subject, atomic graph planning, identity reuse, semantic direction, registered layout family, composed symbols, honest fallback, negation rollback, transformation, accessibility, layout';
    }
    async function verifyConcepts() {
      await pause();
      await submit('Two tables');
      check(document.querySelectorAll('[data-concept-id="desk"]').length === 2, 'Registry alias did not create two desk concepts');
      check(document.querySelectorAll('[data-concept-category="furniture"]').length === 2, 'Semantic concept category is missing');
      check([...document.querySelectorAll('[data-concept-registry-version]')].every(node => node.dataset.conceptRegistryVersion === '1.0.0'), 'Concept registry version is missing');
      check(document.querySelectorAll('[data-renderer="desk"]').length === 2, 'Registry glyph key did not select the desk renderer');
      check(document.documentElement.scrollWidth <= innerWidth, 'Concept registry scene caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: data-only aliases, semantic categories, version metadata, renderer selection, quantity, layout';
    }
    async function verifyMotion() {
      await pause();
      await submit('A car drives toward a building');
      const drive = document.querySelector('[data-relation-kind="toward"][data-relation-predicate="drive"]');
      check(!!drive, 'Registered drive mode is not persisted as relation metadata');
      check(drive.dataset.relationFamily === 'directional', 'Directional relation family metadata is missing');
      check(drive.dataset.relationLayout === 'arrow', 'Directional layout family metadata is missing');
      check(!!drive.querySelector('.motion-annotation'), 'Directional arrow is missing');
      check(drive.querySelector('.motion-annotation')?.getAttribute('aria-label') === 'drives toward', 'Drive relation accessibility text is wrong');
      await submit('It moves away from the building');
      const away = document.querySelector('[data-relation-kind="away"][data-relation-predicate="move"]');
      check(!!away, 'Contextual away movement did not replace the prior direction');
      check(document.querySelectorAll('.motion-annotation').length === 1, 'Direction correction left conflicting motion arrows');
      const before = document.querySelector('.doodle-canvas').innerHTML;
      await submit('The car walks toward the building');
      check(!!document.querySelector('.clarification'), 'Incapable actor did not request clarification');
      check(document.querySelector('.doodle-canvas').innerHTML === before, 'Rejected capability mismatch changed the scene');
      check(document.documentElement.scrollWidth <= innerWidth, 'Motion scene caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: registered directional roles, persisted motion mode, contextual correction, capability rejection, rollback, accessibility, layout';
    }
    async function verifyPartWhole() {
      await pause();
      await submit('A plant takes in water through its roots and sunlight through its leaves');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 5, 'Part-whole explanation did not create five distinct identities');
      check(document.querySelectorAll('[data-relation-family="compositional"][data-relation-layout="part-whole-flow"]').length === 4, 'Registered part-whole relations are missing');
      check(document.querySelectorAll('[data-layout-topology="part-whole"]').length === 4, 'Part-whole topology metadata is missing');
      for (const cue of ['visible-roots', 'soil-boundary', 'water-entry-arrow', 'sun-symbol', 'leaf-targeted-ray']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Required visual cue is missing: ' + cue);
      }
      check(document.querySelector('[aria-label="water flows into roots"]'), 'Water-to-roots accessibility meaning is missing');
      check(document.querySelector('[aria-label="sunlight illuminates leaves"]'), 'Sunlight-to-leaves accessibility meaning is missing');
      check([...document.querySelectorAll('.entity-label')].map(node => node.textContent).sort().join('|') === 'leaves|plant|roots|sunlight|water', 'Concept labels are merged or incomplete');
      check(document.documentElement.scrollWidth <= innerWidth, 'Part-whole scene caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: five semantic identities, part ownership, typed flows, original symbols, required cues, accessibility, registry metadata, layout';
    }
    async function verifyForce() {
      await pause();
      await submit('If you push a box on a rough floor, friction slows it down');
      check(document.querySelectorAll('[data-relation-family="mechanical"][data-relation-layout="force-diagram"]').length === 3, 'Mechanical role graph is incomplete');
      check(document.querySelectorAll('[data-layout-topology="force-body"]').length === 3, 'Force-body topology metadata is missing');
      for (const cue of ['surface-line', 'forward-force-arrow', 'opposing-friction-arrow', 'friction-arrow-smaller', 'slowing-motion']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Force visual cue is missing: ' + cue);
      }
      check(document.querySelector('[data-primitive="box"]'), 'Original box primitive is missing');
      check(document.querySelector('[data-visual-role="force"]'), 'Semantic force identities are missing');
      check(document.querySelectorAll('.force-diagram-annotation').length === 1, 'Force diagram rendered duplicate annotations');
      check(document.documentElement.scrollWidth <= innerWidth, 'Force diagram caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: open mechanical slots, force identities, relative magnitude, opposition, contact surface, slowing cue, accessibility, layout';
    }
    async function verifyContainment() {
      await pause();
      await submit('A variable is just a labeled box that holds a value');
      check(document.querySelectorAll('[data-relation-family="containment"][data-relation-layout="labelled-container"]').length === 1, 'Containment relation is missing');
      check(document.querySelector('[data-layout-topology="nested-container"]'), 'Nested-container topology metadata is missing');
      for (const cue of ['container-outline', 'variable-label', 'value-inside-container']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Containment visual cue is missing: ' + cue);
      }
      check(document.querySelector('.labelled-container-annotation')?.getAttribute('aria-label') === 'variable contains value', 'Containment accessibility meaning is wrong');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Containment identities leaked as duplicate concept bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 2, 'Container and content identities are not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Labelled container caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: distinct identities, typed containment, nested value, variable label, no duplicate bubbles, accessibility, layout';
    }
    async function verifyGeometry() {
      await pause();
      await submit('A right angle is exactly ninety degrees, like the corner of a square');
      check(document.querySelectorAll('[data-relation-family="measurement"][data-relation-layout="geometric-construction"]').length === 1, 'Measurement relation is missing');
      check(document.querySelector('[data-layout-topology="angular-construction"]'), 'Angular topology metadata is missing');
      for (const cue of ['perpendicular-rays', 'right-angle-square', 'ninety-degree-label']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Geometric visual cue is missing: ' + cue);
      }
      check(document.querySelector('.geometric-construction-annotation')?.getAttribute('aria-label') === 'right angle measures 90°', 'Angular accessibility meaning is wrong');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Geometric identities leaked as duplicate concept bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 2, 'Angle and measurement identities are not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Geometric construction caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: computed perpendicular rays, right-angle marker, degree identity, typed measurement, no duplicate bubbles, accessibility, layout';
    }
    async function verifyLandscape() {
      await pause();
      await submit('Rivers usually flow from higher ground down to the sea');
      check(document.querySelectorAll('[data-relation-family="landscape"][data-relation-layout="landscape-flow"]').length === 2, 'Landscape relation pair is incomplete');
      check(document.querySelectorAll('[data-layout-topology="elevation-cross-section"]').length === 2, 'Elevation topology metadata is incomplete');
      for (const cue of ['elevation-cross-section', 'continuous-river-path', 'downhill-flow-arrow', 'sea-shape']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Landscape visual cue is missing: ' + cue);
      }
      check(document.querySelector('.landscape-flow-annotation')?.getAttribute('aria-label') === 'rivers flow from higher ground to sea', 'Landscape accessibility meaning is wrong');
      check(document.querySelectorAll('.landscape-flow-annotation').length === 1, 'Landscape rendered duplicate cross-sections');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Landscape identities leaked as duplicate concept bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 3, 'Landscape semantic identities are not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Landscape flow caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: distinct landscape identities, typed source and destination, continuous downhill path, terrain and sea cues, no duplicate bubbles, accessibility, layout';
    }
    async function verifySafety() {
      await pause();
      await submit('Draw a car');
      const drawing = document.querySelector('.doodle-canvas').innerHTML;
      const revision = [...document.querySelectorAll('*')].find(node => node.children.length === 0 && node.textContent === 'Revision 1');
      check(!!revision, 'Initial revision missing');
      await submit("Let's take a short break before we continue");
      check(document.querySelector('.hold-notice')?.dataset.holdReason === 'non-visual-speech', 'Scene-hold status is missing');
      check(document.querySelector('.hold-notice')?.textContent.includes('current drawing is unchanged'), 'Scene-hold explanation is unclear');
      check(document.querySelector('.doodle-canvas').innerHTML === drawing, 'Non-visual pause changed the scene');
      check([...document.querySelectorAll('*')].some(node => node.children.length === 0 && node.textContent === 'Revision 1'), 'Non-visual pause changed revision');
      await submit("So basically, um, it's kind of like — okay, imagine two things happening at once, but one is way faster.");
      check(document.querySelector('.clarification')?.dataset.clarificationCode === 'ambiguous-meaning', 'Ambiguous comparison did not request precise clarification');
      check(document.querySelector('.doodle-canvas').innerHTML === drawing, 'Ambiguous comparison changed the scene');
      await submit("It's kind of the opposite of what we did yesterday, but with the same idea.");
      check(document.querySelector('.clarification')?.dataset.clarificationCode === 'ambiguous-reference', 'Missing lesson context did not request precise clarification');
      check(document.querySelector('.doodle-canvas').innerHTML === drawing, 'Missing lesson context changed the scene');
      document.querySelector('.undo-button').click(); await pause();
      check(document.querySelectorAll('.doodle-object').length === 0, 'Scene hold consumed Undo history');
      check(document.documentElement.scrollWidth <= innerWidth, 'Safety notices caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: scene hold, unchanged revision, unchanged drawing, precise ambiguity codes, rollback, Undo history, mobile layout';
    }
    async function verifyCirculation() {
      await pause();
      await submit('The heart pumps blood to the lungs, and the lungs send it back full of oxygen');
      check(document.querySelectorAll('[data-relation-family="circulation"][data-relation-layout="circulation-loop"]').length === 3, 'Circulation relation triple is incomplete');
      check(document.querySelectorAll('[data-layout-topology="closed-loop"]').length === 3, 'Closed-loop topology metadata is incomplete');
      for (const cue of ['heart-shape', 'paired-lung-shapes', 'outbound-blood-arrow', 'oxygenated-return-arrow', 'closed-circulation-loop']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Circulation cue is missing: ' + cue);
      }
      check(document.querySelectorAll('.circulation-loop-annotation').length === 1, 'Circulation loop rendered more than once');
      check(document.querySelector('.circulation-loop-annotation')?.getAttribute('aria-label') === 'heart pumps blood to lungs; lungs return blood carrying oxygen to heart', 'Circulation accessibility meaning is wrong');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Circulation identities leaked as generic bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 4, 'Four circulation identities were not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Circulation scene caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: four identities, payload-aware outbound and return paths, closed-loop topology, original heart and lung symbols, accessibility, mobile layout';
    }
    async function verifyTrajectory() {
      await pause();
      await submit('A ball thrown up in the air slows down, stops for a moment, then falls back faster and faster');
      check(document.querySelectorAll('[data-relation-family="kinematics"][data-relation-layout="changing-speed-motion"]').length === 3, 'Kinematics relation triple is incomplete');
      check(document.querySelectorAll('[data-layout-topology="trajectory-profile"]').length === 3, 'Trajectory topology metadata is incomplete');
      for (const cue of ['vertical-flight-path', 'shrinking-upward-velocity', 'apex-pause', 'growing-downward-velocity']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Trajectory cue is missing: ' + cue);
      }
      check(document.querySelectorAll('.changing-speed-motion-annotation').length === 1, 'Trajectory rendered more than once');
      check(document.querySelector('.changing-speed-motion-annotation')?.getAttribute('aria-label') === 'ball rises to highest point while slowing, pauses, then falls while speeding up under gravity', 'Trajectory accessibility meaning is wrong');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Trajectory identities leaked as generic bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 3, 'Three trajectory identities were not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Trajectory caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: one moving identity, shared apex, continuous path, changing velocity, gravity, accessibility, mobile layout';
    }
    async function verifyCallReturn() {
      await pause();
      await submit('When you call a function, the program jumps to that function, runs it, then comes back to where it left off');
      check(document.querySelectorAll('[data-relation-family="control-flow"][data-relation-layout="call-return-flow"]').length === 2, 'Control-flow relation pair is incomplete');
      check(document.querySelectorAll('[data-layout-topology="control-transfer"]').length === 2, 'Control-transfer topology metadata is incomplete');
      for (const cue of ['main-flow-line', 'function-block', 'call-arrow', 'return-arrow', 'same-return-point']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Call-return cue is missing: ' + cue);
      }
      check(document.querySelectorAll('.call-return-flow-annotation').length === 1, 'Call-return flow rendered more than once');
      check(document.querySelector('.call-return-flow-annotation')?.getAttribute('aria-label') === 'program calls function; control returns to the same call site', 'Call-return accessibility meaning is wrong');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Control-flow identities leaked as generic bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 3, 'Three control-flow identities were not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Call-return flow caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: caller, function, exact return point, two directions, atomic control transfer, accessibility, mobile layout';
    }
    async function verifyFraction() {
      await pause();
      await submit('If you have three-quarters of a pizza and eat one slice, how much is left?');
      check(document.querySelectorAll('[data-relation-family="arithmetic"][data-relation-layout="fraction-subtraction"]').length === 2, 'Arithmetic relation pair is incomplete');
      check(document.querySelectorAll('[data-layout-topology="part-removal"]').length === 2, 'Part-removal topology metadata is incomplete');
      for (const cue of ['quartered-circle', 'three-initially-shaded', 'one-slice-removed', 'two-quarters-remain', 'remainder-label']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Fraction cue is missing: ' + cue);
      }
      check(document.querySelectorAll('.fraction-subtraction-annotation').length === 1, 'Fraction operation rendered more than once');
      check(document.querySelector('.fraction-subtraction-annotation')?.getAttribute('aria-label') === 'three quarters of pizza minus one quarter leaves one half', 'Fraction accessibility meaning is wrong');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Fraction identities leaked as generic bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 4, 'Four fraction identities were not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Fraction scene caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: structured fractions, visible starting amount, removed slice, simplified remainder, accessibility, mobile layout';
    }
    async function verifyWaterCycle() {
      await pause();
      await submit('Rain falls, soaks into the soil, and some of it later comes back up as evaporation.');
      check(document.querySelectorAll('[data-relation-family="hydrology"][data-relation-layout="water-cycle-loop"]').length === 3, 'Hydrology relation triple is incomplete');
      check(document.querySelectorAll('[data-layout-topology="environmental-cycle"]').length === 3, 'Environmental-cycle topology metadata is incomplete');
      for (const cue of ['cloud-symbol', 'rain-arrow-down', 'soil-infiltration', 'evaporation-arrow-up', 'closed-water-loop']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Water-cycle cue is missing: ' + cue);
      }
      check(document.querySelectorAll('.water-cycle-loop-annotation').length === 1, 'Water cycle rendered more than once');
      check(document.querySelector('.water-cycle-loop-annotation')?.getAttribute('aria-label') === 'rain falls to soil; water infiltrates soil; evaporation rises to cloud', 'Water-cycle accessibility meaning is wrong');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Water-cycle identities leaked as generic bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 5, 'Five water-cycle identities were not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Water-cycle scene caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: five hydrology identities, precipitation, infiltration, underground water, animated evaporation return, closed loop, accessibility, mobile layout';
    }
    async function verifyLifecycle() {
      await pause();
      await submit('When a caterpillar is ready, it wraps itself up and comes out later as a butterfly.');
      check(document.querySelectorAll('[data-relation-family="lifecycle"][data-relation-layout="lifecycle-sequence"]').length === 2, 'Lifecycle relation pair is incomplete');
      check(document.querySelectorAll('[data-layout-topology="stage-sequence"]').length === 2, 'Stage-sequence topology metadata is incomplete');
      for (const cue of ['caterpillar-stage', 'wrapped-cocoon', 'emerging-butterfly', 'left-to-right-stages']) {
        check(!!document.querySelector('[data-visual-cue~="' + cue + '"]'), 'Lifecycle cue is missing: ' + cue);
      }
      check(document.querySelectorAll('.lifecycle-sequence-annotation').length === 1, 'Lifecycle rendered more than once');
      check(document.querySelector('.lifecycle-sequence-annotation')?.getAttribute('aria-label') === 'caterpillar transforms to cocoon, then cocoon transforms to butterfly', 'Lifecycle accessibility meaning is wrong');
      check(document.querySelectorAll('.doodle-canvas .doodle-object').length === 0, 'Lifecycle identities leaked as generic bubbles');
      check([...document.querySelectorAll('[data-entity-id]')].filter(node => node.closest('.doodle-canvas')).length === 3, 'Three lifecycle identities were not preserved');
      check(document.documentElement.scrollWidth <= innerWidth, 'Lifecycle scene caused horizontal overflow');
      document.getElementById('qa-result').textContent = 'PASS: three distinct stages, two typed transformations, original caterpillar/cocoon/butterfly art, restrained motion, accessibility, mobile layout';
    }
    const params = new URLSearchParams(location.search);
    (params.has('lifecycle') ? verifyLifecycle() : params.has('water-cycle') ? verifyWaterCycle() : params.has('fraction') ? verifyFraction() : params.has('call-return') ? verifyCallReturn() : params.has('trajectory') ? verifyTrajectory() : params.has('circulation') ? verifyCirculation() : params.has('safety') ? verifySafety() : params.has('landscape') ? verifyLandscape() : params.has('geometry') ? verifyGeometry() : params.has('containers') ? verifyContainment() : params.has('force') ? verifyForce() : params.has('parts') ? verifyPartWhole() : params.has('motion') ? verifyMotion() : params.has('concepts') ? verifyConcepts() : params.has('phrases') ? verifyPhrases() : params.has('events') ? verifyEvents() : params.has('queue') ? verifyQueue() : verify()).catch(error => { document.getElementById('qa-result').textContent = 'FAIL: ' + error.message; });
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
await writeFile(resolve(output, "app-concepts-phone.html"), framedApp(390, "?concepts"));
await writeFile(resolve(output, "app-motion-phone.html"), framedApp(390, "?motion"));
await writeFile(resolve(output, "app-parts-phone.html"), framedApp(390, "?parts"));
await writeFile(resolve(output, "app-force-phone.html"), framedApp(390, "?force"));
await writeFile(resolve(output, "app-containers-phone.html"), framedApp(390, "?containers"));
await writeFile(resolve(output, "app-geometry-phone.html"), framedApp(390, "?geometry"));
await writeFile(resolve(output, "app-landscape-phone.html"), framedApp(390, "?landscape"));
await writeFile(resolve(output, "app-safety-phone.html"), framedApp(390, "?safety"));
await writeFile(resolve(output, "app-circulation-phone.html"), framedApp(390, "?circulation"));
await writeFile(resolve(output, "app-trajectory-phone.html"), framedApp(390, "?trajectory"));
await writeFile(resolve(output, "app-call-return-phone.html"), framedApp(390, "?call-return"));
await writeFile(resolve(output, "app-fraction-phone.html"), framedApp(390, "?fraction"));
await writeFile(resolve(output, "app-water-cycle-phone.html"), framedApp(390, "?water-cycle"));
await writeFile(resolve(output, "app-lifecycle-phone.html"), framedApp(390, "?lifecycle"));
