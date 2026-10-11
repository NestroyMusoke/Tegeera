# Runtime artwork: measured changes, 11 October 2026

This checkpoint improves the drawing protocol and deployment packaging. It does
not claim that arbitrary nouns now become recognizable, polished drawings.

## What changed

- Every stroke can optionally select `interpolation: "linear"` or `"smooth"`.
  Linear strokes preserve corners; smooth strokes use the existing curve code.
  Omitting the field preserves legacy rendering exactly. Open strokes stay open.
- Backend and direct-browser generation now share one drawing-language prompt,
  with three distinct format examples, pen-lift rules, connected-part guidance,
  and consistent outline colors. There is no lookup for the probed nouns and no
  sentence-specific drawing code. Examples are not shipped as approved artwork.
- Both validation boundaries reject unknown interpolation. The backend now also
  rejects extra stroke fields before returning an artifact the strict client
  cannot accept. Stream parsing and edits preserve the optional field.
- Hosted generation/edit requests opt into `strokeFormat: "1.1"`. Requests from
  older clients (no format, or `"1.0"`) receive only the original stroke fields,
  so a backend-first update does not break strict installed clients. They retain
  legacy smoothing until updated. Unknown formats fail before a provider call.
- The probe accepts `--out-dir` to retain separate experiments and `--thinking`
  to compare modes without changing application defaults.
- The Docker recipe now includes the shared runtime modules and scene schema.
  It must be built from the repository root. A default-deny context excludes
  credentials, browser files and local artwork. Packaging tests import the
  isolated copied source tree, not the developer checkout.

## Live comparison

Two unresolved nouns from the previous run were tested before and after the
change, and again with low-effort reasoning requested. Each result was rendered
as PNG and visually inspected. Six completed drafts consumed **seven provider
attempts**; one revised bottle needed its allowed correction.

| Configuration | Lamp | Bottle | Provider attempts |
| --- | --- | --- | --- |
| Original prompt, reasoning off | 7,036 ms | 3,634 ms | 2 |
| Shared language, reasoning off | 7,054 ms | 3,704 ms | 3 |
| Shared language, low-effort reasoning requested | 3,657 ms | 3,748 ms | 2 |

The revised straight base and cap remain straight. The reasoning-off bottle is
more coherent but jar-like; the lamps remain ambiguous. Low-effort reasoning did
not reliably improve recognizability. These are six observations, not a latency
distribution or a controlled quality benchmark. No artwork was approved or
promoted into the reusable pack. **The runtime reasoning default is unchanged.**

Separate reports, strokes and review sheets are saved under:

- `.visual-check/glyph-oct11-baseline`
- `.visual-check/glyph-oct11-revised`
- `.visual-check/glyph-oct11-reasoning`

The reports' `ok` means structural validation, not visual acceptance. These
results show that prompting and interpolation alone do not solve the model's
shape-knowledge limitations. Reviewed retrieval and stronger visual generation/
verification remain necessary; no generic rectangle fallback is being presented
as finished artwork.

## Limits and readiness

The local 60-statement benchmark remains **26/60 = 43.33%**, a change of **0.00
percentage points**. This is local language coverage, not product completion.
No new APK, phone test, or deployed-backend update is claimed in this checkpoint.
Docker's daemon was unavailable, so an actual image build was not verified;
source packaging is checked independently by the backend tests.

## Regression evidence

- Full client suite: **652 passed**, three optional live smoke tests skipped.
- After the final HTTP compatibility guard, all **nine** affected hosted/client
  tests were rerun and passed. No real credentials were used in these mocks.
- Final backend suite: **51 passed**, including legacy/new response negotiation,
  rejecting unknown formats without provider calls, and isolated source packaging.
- Live artwork evidence is the six inspected drafts above, not the mocked tests.
- Final lint, production build, bundle budgets and Android web-asset sync passed.
  Main JavaScript is 490.00 kB, 147.57 kB gzipped. No dependencies were added.
- Both isolated performance tests passed: 278 probes / 834 samples, local
  SVG-ready p50 24.86 ms, p95 **48.61 ms**, maximum 106.07 ms. These exclude speech,
  model calls, browser commit/paint and device scheduling. Differences from prior
  host timings are not evidence of an optimization or a regression by themselves.
