# Hosted propagation: implementation and live evidence

## What changed

The hosted planner can now reach the continuous propagation renderer without
matching a local sentence template. A shared service/browser topology check
requires four distinct roles: source, moving payload, medium and destination.
The graph carries source → payload emission, payload → medium propagation, and
payload → destination arrival. The earlier source → medium entry form remains
supported. All roles are arbitrary labels, not a catalogue of lesson sentences.

The compiler builds the same deterministic, validated scene as the offline path.
It preserves endpoint direction and explicit role colours. No glyph-generation
request is necessary for these schematic roles. The session cache can replay a
self-contained replacement first accepted on an empty canvas across subsequent
scene revisions, without another model call. Follow-ups, additions, extensions,
external endpoints and plans learned on occupied scenes stay context-bound.
Cache keys now include complete entities, relations and discourse context. Each
replay still passes through the current compiler and validator. The cache is
bounded, session-only, cleared on provider-setting changes, and does not generalize
to paraphrases or accelerate a first-time request.

Incomplete graphs, mixed diagrams, observing instead of emitting, negated claims,
and incorrect final-arrow endpoints are rejected. Failure leaves the accepted
canvas intact. Passive emitter modifiers are now parsed correctly: in “X emitted
by Y propagate through Z”, X is the travelling subject, not Y.

## Actual live development runs

Only the synthetic statement and empty scene were sent to Nebius. Expected roles
and links stayed in the local scorer. No training or fine-tuning was performed.

| Run | Result | What it exposed |
| --- | --- | --- |
| Initial three prompts | 0/3 accepted | Emission topology differed from the original entry-only protocol; a label spelling also mismatched. |
| Second three prompts | 2/3 complete and rendered | Vibration and ultrasound worked; the optical plan attached its final arrow to the medium. |
| Optical retry | Rejected | After endpoint repair, our source audit mistook the emitter for the traveller. |
| Final optical retry | Complete and rendered, one attempt | The passive-subject correction allowed the faithful plan through. |

The emission protocol and its expected source edge were corrected between the
first and second runs. Therefore their graph scores are not a fixed-benchmark
improvement comparison. The original 60-statement corpus was not changed.

Latest successful observations (across runs, **not one clean 3/3 batch**):

| Statement | Roles / links | Model attempts | Request duration |
| --- | --- | --- | --- |
| The transducer sends ultrasound across the gel to the sensor. | 4/4, 3/3 | 1 | 9,774 ms |
| Vibration spreads across a membrane from an oscillator on the right to a sensor on the left. | 4/4, 3/3 | 1 | 5,908 ms |
| Light pulses emitted by a transmitter propagate through an optical fibre until they reach a detector. | 4/4, 3/3 | 1 | 10,348 ms |

Thirteen provider attempts were reported across all development runs. No further
paid calls were made after the final optical test. These tiny, repeatedly tested
examples do not estimate broad accuracy. Request durations exclude phone paint
and speech recognition; hosted first requests remain far from real-time.

## Visual inspection and limits

Actual SVG previews for all three accepted plans were inspected. Labels were
separate and readable in the static desktop images, and the vibration arrow ran
right to left as requested. These are continuous-medium **schematics**: the gel,
membrane and optical fibre share an abstract visual convention. They are not
detailed object illustrations or scientific wave simulations. Phone readability,
animation and microphone-to-frame latency still need device testing.

The audit now counts schematic roles separately from ordinary object artwork;
“zero labelled placeholders” must not be misreported as four polished glyphs.

## Reproduction

With the private service key in the ignored `server/.env.local`, this command
spends inference credit (up to six attempts):

```text
node --env-file=server/.env.local scripts/probe-novel-graphs.mjs --corpus evaluation/hosted-propagation-probes.json --count 3 --seed 20261010 --out .visual-check/hosted-propagation-rerun.json
```

Saved development evidence is under ignored `.visual-check/hosted-propagation-oct10*`.
The runtime service must be restarted/redeployed to load the new protocol. A Git
push alone does not restart a separately running local or hosted Node process.

## Completion accounting

Local corpus coverage remains 26/60 = **43.33%**, a **0.00 percentage-point change**.
This build connects an existing renderer to unfamiliar hosted phrasing and fixes
integration failures; it does not establish universal visualization or product
completion. The separate live results above must not be added to the corpus score.

## Verification

- Full client suite: 628 passing, three optional live-provider tests skipped.
- Backend suite: 44 passing. Evaluation tools: 25 passing. Artwork tools: 24 passing.
- Local performance suite: two passing; 278 probes, 834 samples, p50 18.88 ms,
  p95 36.36 ms, maximum 56.10 ms to static SVG. Excludes speech, browser paint and
  phone scheduling. The later cache-only change does not alter this benchmark path.
- Production build, bundle budgets, lint and Android web-asset sync passed.
- The actual hosted form test covers accepted drawing, Undo, repeat replay without
  another API call, and preserving the drawing on malformed follow-up output.
- No phone was connected. A local APK attempt used the installed Java 21 runtime
  and downloaded Gradle 8.11.1, but encountered a loopback startup error before
  application compilation. Android platform 35 is also absent locally. Native
  build/device verification must not be inferred from successful asset sync.
