#!/usr/bin/env node
// Renders saved hosted blueprints with Tegeera's real compiler and canvas.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { scoreBlueprint } from './score-blueprint-gold.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
const has = (name) => args.includes(name);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const htmlEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function visualEvidence(markup, expected) {
  const cueIds = [...new Set([...markup.matchAll(/data-visual-cue="([^"]+)"/g)].flatMap((match) => match[1].split(/\s+/)).filter(Boolean))];
  const grammarIds = [...new Set([...markup.matchAll(/data-relation-layout="([^"]+)"/g)].map((match) => match[1]))];
  const missingCues = expected.intent === 'draw' ? expected.visualCues.filter((cue) => !cueIds.includes(cue)) : [];
  return { cueIds, grammarIds, missingCues,
    grammarMatch: expected.intent === 'draw' ? grammarIds.includes(expected.visualGrammar) : null };
}

function settledCss(css) {
  return `${css}\n*{animation-duration:0s !important;animation-delay:0s !important;transition-duration:0s !important}`;
}

async function makeRenderer(out) {
  const result = await build({ stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { DoodleCanvas } from './src/components/DoodleCanvas';
    import { compileUniversalScene } from './src/llm/universalScene';
    import { initialScene, applyDoodleScript } from './src/doodlescript/scene';
    import { validateDoodleScript } from './src/doodlescript/validator';
    export function render(candidate, statement) {
      const script = compileUniversalScene(candidate, initialScene, statement);
      const checked = validateDoodleScript(script, initialScene);
      if (!checked.ok) throw new Error(checked.issues.map(issue => issue.message).join('; '));
      const scene = applyDoodleScript(initialScene, checked.script);
      return renderToStaticMarkup(React.createElement(DoodleCanvas, { scene }));
    }
  `, resolveDir: ROOT, loader: 'tsx' }, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false });
  const bundle = result.outputFiles[0].text;
  const file = join(out, 'hosted-renderer.cjs');
  await writeFile(file, bundle);
  return { render: createRequire(import.meta.url)(file).render, bundle };
}

function casePage({ id, statement, score, markup, renderError, visual }, css) {
  const state = score.semanticReady ? 'Semantic blueprint matches annotated labels and links; visual review still required.'
    : `Semantic blueprint incomplete or unverified: ${[...score.missingConcepts, ...score.missingEdges, ...score.unverifiedPredicates].join('; ') || score.notes.join('; ')}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}\nbody{margin:0;padding:12px;background:#f4f1e9;color:#293730;font:15px system-ui}.hosted-note{background:#fff;border:1px solid #cbd6ce;border-radius:12px;padding:12px;margin-bottom:12px}.app{max-width:390px;margin:auto}</style></head><body><main class="app"><section class="hosted-note"><strong>Case ${id} — ${score.expectedIntent}</strong><p>${htmlEscape(statement)}</p><p>${htmlEscape(state)}</p>${renderError ? `<p role="alert">Render rejected: ${htmlEscape(renderError)}</p>` : ''}</section>${markup ?? '<p class="hosted-note">No drawing was accepted for this case.</p>'}<section class="hosted-note"><strong>Observed SVG evidence</strong><p>Layout: ${htmlEscape(visual?.grammarIds.join(', ') || 'none')}; missing required cues: ${htmlEscape(visual?.missingCues.join(', ') || 'not assessed')}</p></section></main></body></html>`;
}

function reviewPage(cases, revision, mode) {
  const cards = cases.filter((item) => item.expectedIntent === 'draw').map((item) => {
    const automated = item.renderError ? `Render rejected: ${item.renderError}`
      : `Grammar ${item.visual.grammarMatch ? 'matched' : 'not matched'}; missing cues: ${item.visual.missingCues.join(', ') || 'none'}.`;
    return `<article data-case="${item.id}"><h2>Case ${item.id}</h2><p>${htmlEscape(item.statement)}</p><p>${htmlEscape(item.intendedVisual)}</p><p><strong>Automated evidence:</strong> ${htmlEscape(automated)}</p><iframe title="Tegeera rendered case ${item.id}" src="case-${item.id}.html" width="390" height="800"></iframe><div class="checks">${[
      'Meaning faithful', 'All identities distinguishable', 'Relationship direction clear',
      'Legible at phone width', 'Motion and reduced motion checked in the running app', 'Useful for teaching'
    ].map((label) => `<label><input type="checkbox"> ${label}</label>`).join('')}</div><button type="button" data-decision="approve">Approve</button><button type="button" data-decision="reject">Reject</button><label>Review note <textarea rows="2"></textarea></label><strong class="decision">Pending</strong></article>`;
  }).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tegeera hosted visual review</title><style>body{font:16px system-ui;margin:24px;background:#f4f1e9;color:#293730}header,article{max-width:900px;background:#fff;border-radius:15px;padding:18px;margin:0 auto 20px}iframe{display:block;max-width:100%;border:2px solid #cad8ce;border-radius:10px}.checks{display:grid;gap:5px;margin:12px 0}.checks label{display:block}button{min-height:42px;margin:5px 8px 5px 0}textarea,input[type=text]{display:block;width:min(100%,550px);box-sizing:border-box;margin:7px 0;padding:8px}.approved{outline:3px solid #32886b}.rejected{outline:3px solid #bd5d58}</style><header><h1>Hosted scene visual review</h1><p>Source: ${mode === 'fixture' ? 'SYNTHETIC FIXTURE — cannot establish live model accuracy' : 'saved live hosted responses'}. Inspect the actual 390-pixel render, not just the model JSON. The frame is frozen here: inspect animation and reduced-motion behavior separately in the running Android app before checking that criterion. Approval alone does not override missing semantic or SVG evidence.</p><label>Reviewer <input id="reviewer" type="text"></label><label>Device/display <input id="device" type="text"></label><button id="export" type="button">Export review JSON</button><output id="status">0/${cases.filter((item) => item.expectedIntent === 'draw').length} decided</output></header>${cards}<script>const revision=${JSON.stringify(revision)},mode=${JSON.stringify(mode)},decisions={},cards=[...document.querySelectorAll('[data-case]')];function update(){document.getElementById('status').textContent=Object.keys(decisions).length+'/'+cards.length+' decided'}for(const card of cards){for(const button of card.querySelectorAll('[data-decision]'))button.onclick=()=>{const id=card.dataset.case,approve=button.dataset.decision==='approve',checks=[...card.querySelectorAll('.checks input')].map(x=>x.checked),note=card.querySelector('textarea').value.trim();if(approve&&!checks.every(Boolean)){alert('All six review criteria are required for approval.');return}if(!approve&&!note){alert('A rejection needs a concrete note.');return}decisions[id]={decision:approve?'approved':'rejected',checks,note};card.className=approve?'approved':'rejected';card.querySelector('.decision').textContent=approve?'Approved':'Rejected';update()}}document.getElementById('export').onclick=()=>{const reviewer=document.getElementById('reviewer').value.trim(),device=document.getElementById('device').value.trim();if(!reviewer||!device||Object.keys(decisions).length!==cards.length){alert('Enter reviewer and device, then decide every rendered draw case.');return}const evidence={schemaVersion:'1.0.0',renderRevision:revision,mode,reviewedAt:new Date().toISOString(),reviewer,device,viewportPx:390,decisions},blob=new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='tegeera-hosted-visual-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)};</script></html>`;
}

export async function renderHostedGold({ reportPath, out, gold, corpusMarkdown, css }) {
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const expectedHash = sha(JSON.stringify(gold) + '\n' + corpusMarkdown);
  if (report.corpusHash !== expectedHash || !['fixture', 'live'].includes(report.mode) || !report.responses || typeof report.responses !== 'object') {
    throw new Error('Saved hosted results are missing or use a different gold corpus.');
  }
  await mkdir(out, { recursive: true });
  const { render, bundle } = await makeRenderer(out);
  const revision = `sha256:${sha(bundle + css + JSON.stringify(gold) + JSON.stringify(report.responses)).slice(0, 20)}`;
  const statements = new Map([...corpusMarkdown.matchAll(/^(\d+)\. \*\*\[[EMH]\]\*\* "(.+)"$/gm)].map((match) => [Number(match[1]), match[2]]));
  const intended = new Map();
  const corpusLines = corpusMarkdown.split(/\r?\n/);
  for (const [index, line] of corpusLines.entries()) {
    const match = line.match(/^(\d+)\. \*\*\[[EMH]\]\*\*/);
    if (match) intended.set(Number(match[1]), corpusLines[index + 1]?.replace(/^\s*Intended visual: /, '') ?? '');
  }
  const items = [];
  for (const goldCase of gold.cases) {
    if (!Object.hasOwn(report.responses, goldCase.id)) continue;
    const response = report.responses[goldCase.id];
    const score = scoreBlueprint(goldCase, response?.candidate);
    let markup = null, renderError = null, visual = null;
    if (score.observedIntent === 'draw' && score.validStructure) {
      try { markup = render(response.candidate, statements.get(goldCase.id)); }
      catch (error) { renderError = error instanceof Error ? error.message.slice(0, 300) : 'Unknown render failure'; }
    }
    if (markup) visual = visualEvidence(markup, goldCase.expected);
    const item = { id: goldCase.id, statement: statements.get(goldCase.id), intendedVisual: intended.get(goldCase.id),
      expectedIntent: goldCase.expected.intent, score, rendered: Boolean(markup), renderError, visual };
    items.push(item);
    await writeFile(join(out, `case-${goldCase.id}.html`), casePage({ ...item, markup }, settledCss(css)));
  }
  const manifest = { schemaVersion: '1.0.0', renderRevision: revision, mode: report.mode,
    model: report.model ?? null, evaluated: items.length, cases: items };
  await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(out, 'review.html'), reviewPage(items, revision, report.mode));
  return manifest;
}

export function verifyReview(manifest, evidence) {
  if (evidence.schemaVersion !== '1.0.0' || evidence.renderRevision !== manifest.renderRevision
    || evidence.mode !== manifest.mode || !evidence.reviewer?.trim() || !evidence.device?.trim()
    || evidence.viewportPx !== 390 || !Number.isFinite(Date.parse(evidence.reviewedAt))
    || !evidence.decisions || typeof evidence.decisions !== 'object') throw new Error('Visual review does not match this rendered revision or lacks reviewer evidence.');
  const allowed = new Set(manifest.cases.filter((item) => item.expectedIntent === 'draw').map((item) => String(item.id)));
  if (Object.keys(evidence.decisions).some((id) => !allowed.has(id))) throw new Error('Visual review contains an unknown draw case.');
  const details = manifest.cases.map((item) => {
    const decision = evidence.decisions[item.id];
    if (decision?.decision === 'approved' && (JSON.stringify(decision.checks) !== '[true,true,true,true,true,true]' || !item.rendered || item.renderError)) {
      throw new Error(`Case ${item.id} lacks six complete review checks or a valid render.`);
    }
    if (decision?.decision === 'rejected' && !decision.note?.trim()) throw new Error(`Case ${item.id} rejection needs a reason.`);
    const strictReady = manifest.mode === 'live' && item.expectedIntent === 'draw' && item.score.semanticReady
      && item.visual?.grammarMatch === true && item.visual.missingCues.length === 0 && decision?.decision === 'approved';
    return { id: item.id, humanDecision: decision?.decision ?? 'pending', strictReady: Boolean(strictReady) };
  });
  return { source: manifest.mode, reviewed: details.filter((item) => item.humanDecision !== 'pending').length,
    strictReady: details.filter((item) => item.strictReady).length, details };
}

async function main() {
  if (has('--help')) { console.log('Usage: node scripts/render-hosted-gold.mjs [--report .visual-check/hosted-gold-report.json] [--out .visual-check/hosted-review] [--verify review.json]'); return; }
  const out = resolve(option('--out', join(ROOT, '.visual-check', 'hosted-review')));
  if (has('--verify')) {
    const manifest = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'));
    const evidence = JSON.parse(await readFile(resolve(option('--verify')), 'utf8'));
    console.log(JSON.stringify(verifyReview(manifest, evidence), null, 2));
    return;
  }
  const gold = JSON.parse(await readFile(join(ROOT, 'evaluation', 'independent-scene-gold-v1.json'), 'utf8'));
  const corpusMarkdown = await readFile(join(ROOT, 'evaluation', 'independent-teacher-corpus.md'), 'utf8');
  const css = await readFile(join(ROOT, 'src', 'styles.css'), 'utf8');
  const manifest = await renderHostedGold({ reportPath: resolve(option('--report', join(ROOT, '.visual-check', 'hosted-gold-report.json'))),
    out, gold, corpusMarkdown, css });
  console.log(`Rendered ${manifest.evaluated} saved hosted cases in ${out}. Open review.html; no human decisions have been assumed.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
