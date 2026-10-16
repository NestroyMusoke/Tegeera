# Workflow review — 16 October 2026

## Reproduced and fixed

Two mounted React tests failed before the production change:

- While a hosted explanation was pending, typing the next explanation lost that
  unsent draft when the first response committed. Successful submission now clears
  only input that still equals the submitted text. Speech no longer clears an
  unrelated typed draft either.
- Undo changed history without invalidating a pending scene request. A provider
  that ignored cancellation could then commit a plan based on the undone scene.
  Undo now uses the existing cancellation/request-sequence guard before changing
  history. The regression deliberately delivers the response after Undo.

No nouns, prompts, provider settings or model budgets were changed by this fix.

## Verification

The focused mounted-app suite passed all 25 tests across App.test.tsx,
App.hosted.test.tsx, App.propagation.test.tsx and App.hostedUnavailable.test.tsx.
This covers replacement without refresh, edits, Undo, safe rejection, stopping,
stale replies, cached replay and unavailable service behavior. These are jsdom
interaction tests, not real-browser screenshots or phone verification.

The browser tool failed initialization with “failed to write kernel assets ...
os error 3”; actual browser interaction could not be verified in this run.
The later full client run ended with 691 passed, six timed out, three skipped,
and one Vitest worker RPC timeout. It reported very large elapsed times; the
focused success is not a full-suite pass. No timeout was increased.
An isolated rerun of both affected files then passed all 19 tests, including all
six that had timed out (44.03 seconds total). The worker error did not recur in
that rerun. This does not establish the cause or erase the failed full run.
Lint, TypeScript, production build, bundle-budget check and `git diff --check`
passed. The main chunk remains above Vite's advisory 500 kB threshold (503.28 kB),
but within this repository's explicit budget. Android sync was not rerun here.

## Fresh live model probes

`evaluation/workflow-oct16.json` contains two unseen statements. Expectations
were withheld from the model. Three provider attempts total were used.

| Statement | Provider attempts | Elapsed | Static visual review |
| --- | ---: | ---: | --- |
| A yellow umbrella stands to the left of a blue suitcase. | 1 | 5,272 ms | Yellow umbrella recognizable and on left; suitcase remains a labelled placeholder. |
| A basket contains an apple. A child stands to the right of the basket and points at the apple. | 2 | 9,422 ms | All three recognizable; containment is an arrow, not physical nesting; pointing is an arrow, not a pointing pose. |

Both passed role/endpoint checks. Neither qualifies as the desired complete
visual experience. The model's valid graph does not prove a faithful illustration.
Rendered SVG PNGs were inspected, not merely the candidate JSON. Captures and
provider responses are in ignored `.visual-check/workflow-oct16*` files.

## Remaining release blockers

- Mixed spatial/action scenes need coherent physical layout, not only arrows.
- Unfamiliar nouns still lack consistently recognizable, styled artwork.
- Live planning took seconds, not real-time latency.
- Real-browser and phone interaction remain unverified here.
- Full-suite execution stability still needs investigation; affected files passed
  an isolated rerun without changing their timeout limits.

No completion percentage, production readiness, deployment or APK success is
claimed by this checkpoint.
