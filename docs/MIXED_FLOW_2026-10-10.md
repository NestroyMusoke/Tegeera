# Mixed-explanation and artwork-recovery checkpoint

## New live evidence

Three synthetic sentences were written with role/link expectations before calling
Nebius. Only the sentences and empty scene went to the model; scoring annotations
were not supplied. Each returned a complete expected endpoint graph on its first
attempt. This is a small diagnostic sample, not a general accuracy estimate.

| Probe | Roles | Directed links | Interpretation time | Initial labelled placeholders |
| --- | --- | --- | --- | --- |
| Child holds a kite above a tree; dog beside child | 4/4 | 3/3 | 9,875 ms | 1 |
| Battery powers lamp; solar panel charges battery | 3/3 | 2/2 | 5,682 ms | 2 |
| Pump sends ink through filter into bottle; camera watches bottle | 5/5 | 4/4 | 7,792 ms | 4 |

All three compiled and rendered. Static PNGs were inspected, not phone animation.
The flow arrows and separated labels are readable. The diagrams are NOT finished
doodle scenes: six unknown objects still use labelled placeholders after this
patch, emoji previews are not original approved artwork, and the child's holding
action is still a relationship arrow rather than physical contact with a string.

Reports and renders are in ignored `.visual-check/mixed-flow-oct10*` paths. The
committed input corpus is `evaluation/mixed-flow-probes-oct10.json`.

## Changes driven by the test

The model called the tree `generic`, despite an existing tree rig. The compiler
now reuses the concept registry for exact nouns and aliases when a generic object
has no supplied artwork. This is a registry-wide rule, not a sentence template.
Compound phrases are not reduced to their last word: a family tree is not silently
drawn as a physical tree. Explicit supplied artwork is preserved.

Replaying the identical saved response now produces zero labelled placeholders
in the kite/tree scene, retaining 4/4 roles and 3/3 links. No additional paid model
call was needed. The saved replay's 10 ms preparation time is NOT live latency or
browser-paint time. Only three paid interpretation attempts were made in this run.

## Background artwork reliability

- A generation timeout now reports failure and applies a 30-second retry cooldown.
  Previously aborting at the deadline made it look like intentional cancellation,
  suppressing the error and cooldown.
- Late results and partial strokes cannot replace the fallback after timeout.
- Replacing a provider resumes interrupted work without needing another render;
  visible nouns keep priority. Deliberate cancellation does not report a failure.
- Lesson preparation has a real deadline even if an adapter ignores AbortSignal.
  Late noun lists are not enqueued after that deadline.
- The eight-second mocked-provider test now measures SVG preparation with a real
  monotonic clock, not the fake clock used to advance network timers. This remains
  a static SVG check, not a browser paint measurement.

These changes do not automatically approve AI artwork, expand paid call budgets,
add dependencies, or change the Android architecture.

## Remaining limits

The fresh live requests took 5.7–9.9 seconds. Unknown-noun artwork, convincing
action poses, broad semantic correctness and phone verification remain open.
There was no backend responding at `127.0.0.1:8080` during this check; the live
probe called the backend engine directly using the existing private configuration.
That does not prove the deployed website is using this build.

Local corpus coverage remains 26/60 = 43.33%, unchanged. It is not an overall
product completion percentage; these three hosted probes must not be added to
that separate local benchmark's numerator.

## Verification

- Focused compiler, resolver and contact-staging tests: 84 passed.
- Full client run: 645 passed, one UI workflow exceeded its five-second deadline,
  three optional live smoke tests skipped. The affected UI file then passed all
  four tests with its original deadlines unchanged (the failed case took 1,517 ms
  on rerun). No assertion or timeout was weakened. This is not a claim that the
  initial full run was green.
- Backend: 44 passed.
- TypeScript/production build, bundle budgets, ESLint, and Android web-asset sync
  passed. Main app JavaScript is 488.90 kB before gzip, 147.20 kB gzipped.
- The first performance run shared the machine with client tests and exceeded
  its 45-second total deadline. Its measured local SVG-ready p95 was 72.21 ms;
  it is recorded as a failed run, not discarded as a successful speed result.
- Performance rerun after the main suite finished: both tests passed with the
  original limits. Across 278 probes / 834 samples, SVG-ready p50 was 16.38 ms,
  p95 29.15 ms, maximum 55.55 ms. This excludes speech, model/network latency,
  browser commit/paint and phone scheduling. The different host load means the
  difference from the previous checkpoint is not evidence of a code speedup.
