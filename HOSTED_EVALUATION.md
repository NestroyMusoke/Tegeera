# Independent hosted-planner evaluation

Tegeera's local parser and hosted model must be measured separately. The existing independent corpus has 60 natural statements; 29 currently have frozen semantic gold annotations. This runner tests the hosted **blueprint** against those 29 annotations. It does not supply expected objects, relations, or intended visuals to the model. It cannot judge whether the final SVG is recognizable or beautiful.

## What is scored

- Exact annotated concept labels/aliases, matched one-to-one with model objects.
- Directed source-to-target links. Reversing an arrow is a failure.
- Relation labels after case and camel-case normalization. A paraphrase may be correct but remains **unverified**, never silently accepted.
- Abstention versus a confident drawing on cases expected to clarify. Hold behavior requires a separate app-level test.
- False confidence: a high-confidence blueprint that omits required concepts/links or draws an ambiguous case.

`semantic-ready` means the available annotation matches at the blueprint level. It is **not** a strict product pass. The report always says `visuallyApproved: 0` because it sees no rendered scene or human review. This score should never be merged into Tegeera's existing local-engine 3/29 result or advertised as visual accuracy.

Hosted connections can now include an optional validated `kind`: `partOf`, `flowsInto`, `illuminates`, `before`, or `causes`. These are general relationship grammars, not hard-coded teacher sentences. The label must exactly match the registered meaning; otherwise the server and client reject the plan. Older connections without `kind` remain generic arrows. The compiler spaces typed endpoints and the existing validator still rejects unreadable or contradictory geometry. More descriptive links than these five still need an honest generic rendering or a future grammar; the model cannot invent a renderer by naming a new kind.

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
npm run eval:hosted-gold -- --url https://YOUR-SERVICE-ORIGIN --max-cases 3
```

The default is three cases, with at least six seconds between requests to respect the prototype service's 12-request-per-minute limit. To cover a chosen subset, add `--ids 1,2,11 --max-cases 3`. Increase `--max-cases` only after checking the provider's current free quota, pricing and service terms. Results save under the ignored `.visual-check/hosted-gold-report.json` and resume without repeating completed cases. A 429 stops safely; that case remains pending. `--fresh` starts over. Do not add an API key to the command, URL, report, app, or GitHub Actions variable.

The saved report includes every candidate and its source case ID, separate concept/topology/predicate coverage, errors and latency. Semantic-ready and visually-approved remain deliberately separate.

## Render and review what the app actually draws

After saving model responses, run:

```bat
npm run render:hosted-gold
start "" ".visual-check\hosted-review\review.html"
```

This produces a 390-pixel HTML view for each evaluated case using the real `compileUniversalScene` and `DoodleCanvas` code, plus `manifest.json` with detected SVG cues and relation layout. Missing cues and wrong layout are failures even when the blueprint's concepts and links score perfectly. The generated review is ignored by Git; it may contain teacher statements and model output. Do not publish it without permission.

The review page has six criteria per drawing. The HTML shows a frozen frame only: inspect animation and reduced-motion behavior separately in the running Android app before checking that criterion. Enter reviewer and device, decide each drawing, and export the JSON. Verify it against the exact rendered revision:

```bat
npm run render:hosted-gold -- --verify "C:\path\to\tegeera-hosted-visual-review.json"
```

`strictReady` requires a **live** model response, semantic readiness, the required SVG cues and grammar, and completed human visual review. A fixture can exercise the workflow but can never count as a live strict pass. This is a conformance gate, not a claim that machine-readable cues alone prove artistic quality. As of this build there is no configured live NVIDIA service, no live hosted report, and no human-approved hosted drawing.
