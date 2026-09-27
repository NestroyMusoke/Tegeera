# Independent hosted-planner evaluation

Tegeera's local parser and hosted model must be measured separately. The existing independent corpus has 60 natural statements; 29 currently have frozen semantic gold annotations. This runner tests the hosted **blueprint** against those 29 annotations. It does not supply expected objects, relations, or intended visuals to the model. It cannot judge whether the final SVG is recognizable or beautiful.

## What is scored

- Exact annotated concept labels/aliases, matched one-to-one with model objects.
- Directed source-to-target links. Reversing an arrow is a failure.
- Relation labels after case and camel-case normalization. A paraphrase may be correct but remains **unverified**, never silently accepted.
- Abstention versus a confident drawing on cases expected to clarify. Hold behavior requires a separate app-level test.
- False confidence: a high-confidence blueprint that omits required concepts/links or draws an ambiguous case.

`semantic-ready` means the available annotation matches at the blueprint level. It is **not** a strict product pass. The report always says `visuallyApproved: 0` because it sees no rendered scene or human review. This score should never be merged into Tegeera's existing local-engine 3/29 result or advertised as visual accuracy.

Hosted connections can include eleven optional validated `kind`s: `partOf`, `flowsInto`, `illuminates`, `before`, `causes`, `pumpsTo`, `returnsTo`, `carries`, `appliedTo`, `opposes`, and `contacts`. These are general relationship grammars, not hard-coded teacher sentences. The label must match the registered meaning; otherwise the service and client reject the plan. Complete transport and force graphs reach specialist renderers; partial specialist graphs fail. Untyped links remain generic arrows if they can be drawn safely around other symbols. A shared source-to-graph audit also checks explicit passage-through and applied-versus-opposing-force claims before a hosted plan is accepted. These checks deliberately cover only narrow, high-signal language; they do not prove general semantic completeness.

## Run without a model key

From the repository in Command Prompt:

```bat
npm run test:hosted-eval
npm run eval:hosted-gold -- --dry-run --max-cases 3
```

Fixture mode can assess saved model responses without network calls:

```bat
npm run eval:hosted-gold -- --responses "C:\path\to\responses.json" --max-cases 3 --fresh
```

The fixture file is JSON keyed by gold case ID. Each value has `candidate` containing the model's blueprint and may include `provider`, `model`, and `latencyMs`.

## Run against a configured hosted service

Only after a backend exists and `/health` reports `configured: true`:

```bat
npm run eval:hosted-gold -- --url https://YOUR-SERVICE-ORIGIN --require-nebius-nemotron --max-cases 3
```

The default is three cases, with at least six seconds between requests to respect the prototype service's 12-request-per-minute limit. To cover a chosen subset, add `--ids 1,2,11 --max-cases 3`. Increase `--max-cases` only after checking the provider's current free quota, pricing and service terms. Results save under the ignored `.visual-check/hosted-gold-report.json` and resume without repeating completed cases. A 429 stops safely; that case remains pending. `--fresh` starts over. Do not add an API key to the command, URL, report, app, or GitHub Actions variable.

The saved report includes every candidate and its source case ID, separate concept/topology/predicate coverage, errors and latency. For new live responses it also records sanitized provider token counts and the number of model attempts when the provider supplies usage. Those counts help monitor credits, but they are not a billing guarantee. Semantic-ready and visually-approved remain deliberately separate.

## Render and review what the app actually draws

After saving model responses, run:

```bat
npm run render:hosted-gold
start "" ".visual-check\hosted-review\review.html"
```

This produces a 390-pixel HTML view for each evaluated case using the real `compileUniversalScene` and `DoodleCanvas` code, plus `manifest.json` with detected SVG cues and relation layout. Missing cues and wrong layout are failures even when the blueprint's concepts and links score perfectly. The generated review is ignored by Git; it may contain teacher statements and model output. Do not publish it without permission.

For a quick static SVG inspection, render any saved case to a PNG without calling the model:

```bat
node scripts/render-review-svg.mjs .visual-check\hosted-review\case-1.html .visual-check\hosted-review\case-1-svg.png
```

The PNG freezes write-on strokes so the shapes can be inspected. It is **not** an Android/browser screenshot and cannot assess animation, text sizing on a real phone, or accessibility.

The review page has six criteria per drawing. The HTML shows a frozen frame only: inspect animation and reduced-motion behavior separately in the running Android app before checking that criterion. Enter reviewer and device, decide each drawing, and export the JSON. Verify it against the exact rendered revision:

```bat
npm run render:hosted-gold -- --verify "C:\path\to\tegeera-hosted-visual-review.json"
```

`strictReady` requires a **live** model response, semantic readiness, the required SVG cues and grammar, and completed human visual review. A fixture can exercise the workflow but can never count as a live strict pass. This is a conformance gate, not a claim that machine-readable cues alone prove artistic quality. The latest bounded local Nebius Token Factory comparison on cases #1, #2, and #11 reached **3/3 semantic-ready** and all three produced the required renderer grammar/cues. The independent human phone review is still pending, so recorded strict passes remain **0/3**. Service latency was 11.4, 11.9, and 22.2 seconds respectively; this is not live drawing speed. The service has not been deployed. The saved report is `.visual-check/hosted-gold-v4b-prompt-report.json`; inspect `.visual-check/hosted-review-v6-source-grounded/review.html` for the actual rendered scenes. These local files are intentionally ignored by Git.
