# Independent hosted-planner evaluation

Tegeera's local parser and hosted model must be measured separately. The existing independent corpus has 60 natural statements; 29 currently have frozen semantic gold annotations. This runner tests the hosted **blueprint** against those 29 annotations. It does not supply expected objects, relations, or intended visuals to the model. It cannot judge whether the final SVG is recognizable or beautiful.

## What is scored

- Exact annotated concept labels/aliases, matched one-to-one with model objects.
- Directed source-to-target links. Reversing an arrow is a failure.
- Relation labels after case and camel-case normalization. A paraphrase may be correct but remains **unverified**, never silently accepted.
- Abstention versus a confident drawing on cases expected to clarify. Hold behavior requires a separate app-level test.
- False confidence: a high-confidence blueprint that omits required concepts/links or draws an ambiguous case.

`semantic-ready` means the available annotation matches at the blueprint level. It is **not** a strict product pass. The report always says `visuallyApproved: 0` because it sees no rendered scene or human review. This score should never be merged into Tegeera's existing local-engine 3/29 result or advertised as visual accuracy.

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

The saved report includes every candidate and its source case ID, separate concept/topology/predicate coverage, errors and latency. A future visual-review run must render and inspect each accepted scene on an actual Android device, recording observed cues and a human approval or rejection. Until then, semantic-ready and visually-approved are deliberately separate.
