# Continuous propagation diagrams

Tegeera can now draw a continuous source → medium → destination explanation,
with a directional arrow and animated payload pulses. It works locally, without
an LLM call or glyph generation. The four identities remain explicit in the
scene graph; the picture is not assembled from disconnected placeholder boxes.

Start in a fresh/cleared scene, then try these consecutively without refreshing:

- When you heat a metal rod at one end, the heat slowly moves along to the other end.
- A signal travels through a cable from a transmitter to a receiver.
- A wave propagates along a spring from a shaker to a clamp.
- Thermal energy spreads through an aluminium strip from a heater to a far end.
- Heat moves along a rod from the right end to the left end.

## Reusable grammar and limits

The direct grammar accepts a payload moving/spreading/travelling/propagating
along or through a named medium, from a named source to a named destination.
Names are slots, not a stored catalogue of lesson sentences. A bounded heating
construction also recognizes the first corpus example. This is not unrestricted
natural-language understanding or a physical simulation.

Heat/thermal energy uses a flame and warm-to-cool colour treatment; other payloads
use neutral source and medium marks. Explicit right-to-left flow reverses arrow,
gradient and pulse travel. Reduced-motion mode keeps static indicators. The medium
is schematic: a spring is not drawn as a realistic coil and a signal does not
become a quantitatively simulated waveform.

The diagram owns its canvas. A complete standalone propagation explanation can
replace an earlier propagation diagram in one validated transaction. Undo restores
the previous diagram. An occupied scene of another type is preserved and a fresh
scene is requested; unrelated objects cannot be placed behind it. Explicit additions
and unresolved references do not trigger this replacement. Negation, uncertainty,
extra clauses and contradictory endpoint descriptions are not silently forced
into this grammar. Existing Undo behavior applies to the resulting DoodleScript.

## Calculated benchmark change

No corpus statements or expected annotations were changed.

| Metric | Before | After | Change from original fractions |
| --- | --- | --- | --- |
| Local corpus drawing coverage | 25/60 = 41.67% | 26/60 = 43.33% | +1.67 percentage points |
| Annotated drawing checks | 25/26 = 96.15% | 26/26 = 100.00% | +3.85 percentage points |
| All annotated automated checks | 28/29 = 96.55% | 29/29 = 100.00% | +3.45 percentage points |

These are development-conformance results, not overall completion or approval of
all artwork. The strict visual-review requirement is unchanged. Hosted accuracy,
generalization beyond supported grammar and end-to-end phone latency remain
separate release work.

## Reproduction

`node scripts/render-local-probes.mjs` writes real canvas HTML under
`.visual-check/local-propagation/`. Pass `evaluation/propagation-probes.json --benchmark`
to measure the local interpretation/validation/static-SVG path with 30 samples
per statement. This excludes speech, network, browser paint and phone scheduling.

`npm run report:readiness` recalculates corpus and annotation coverage.

## Observed local timing

Thirty warm samples per statement, 150 total, measured on this PC while other
verification was also running. This is the complete local interpretation +
validation + static SVG path, not phone paint or hosted inference:

| Probe | p50 | p95 | Maximum |
| --- | --- | --- | --- |
| Heat / metal rod | 24.84 ms | 35.60 ms | 38.48 ms |
| Signal / cable | 20.33 ms | 22.66 ms | 28.63 ms |
| Wave / spring | 21.43 ms | 32.49 ms | 35.15 ms |
| Thermal energy / strip | 20.41 ms | 33.42 ms | 83.42 ms |
| Right-to-left heat | 20.39 ms | 24.96 ms | 42.34 ms |

The full regression run passed 584 tests, with three optional live-provider tests
skipped. A final additional uncertainty/question guard then passed 54 affected
tests. The final production build, bundle budget, lint and Android web-asset sync
passed. No new APK was built or tested on a phone. No API credits were spent on
this feature. Static pictures were
inspected for heat, signal, and reverse flow; phone animation remains unverified.

## Consecutive-explanation follow-up

The real form now has regression coverage for heat → signal → wave, followed by
two Undo actions, with zero fetch calls. Three additional form cases verify that
uncertainty, an explicit addition, and an unresolved reference preserve the last
diagram, and that a subsequent complete explanation still works.

Verification for this follow-up: 92 distinct targeted tests passed across the
propagation, conversation, app, hosted-app (mocked), independent-gold and readiness
suites. Production build, bundle budget, lint and Android web-asset sync passed.
The full suite was not rerun for this follow-up. No live provider call or phone
test was performed. Local corpus coverage remains 26/60 = 43.33% (0.00 percentage
point change); this patch improves interaction reliability, not language coverage.
