# Tegeera — NVIDIA build evidence and next gates

This is a product-development checkpoint, not a claim that arbitrary speech already becomes an accurate, beautiful drawing.

## Latest checkpoint — composable attention; cold-render gate still failing, 16 October 2026

See [composition evidence](docs/ATTENTION_COMPOSITION_2026-10-16.md). A reproduced
failure rendered pointing and looking at one target as two arrows. The compiler,
validator and renderer now share a narrow compatibility contract: one point and
one look toward the same target, preserving both relations and choosing the arm
pose independently of relation order. Different targets, duplicates, third
actions, waving and contact are not silently collapsed. No noun-specific rule.

Three fresh live requests used three provider attempts (4.325, 5.728 and 7.242 s).
All static PNGs were inspected; a zero-call saved-response replay verifies the
botanist pose fix. The longer four-object scene still shows containment as an
arrow and a case placeholder. Graph-complete 3/3 does not mean visually correct.

Full client run: 713 passed, one cold-render timing failure, three optional tests
skipped. A subsequent no-op pose-processing optimization passed its regression;
focused run: 55 passed, the same timing gate failed at 137.12 ms (100 ms budget).
No full-suite green claim and no relaxed threshold. Isolated coarse performance:
two passed, 834 samples, p95 57.50 ms, maximum 133.90 ms. Lint, TypeScript, build,
bundle budget and Android web sync passed; main chunk 506.65 kB, advisory remains.
Backend unchanged/not rerun; no browser, APK, phone or deployment check.
Independent corpus and strict gold are unchanged. No completion percentage.

## Previous checkpoint — human roles and visible attention, 16 October 2026

See [the attention review](docs/HUMAN_ATTENTION_2026-10-16.md). Shared planner
guidance now distinguishes human roles from unfamiliar nonhuman objects. Exact
registered pointing/looking relationships become targeted human poses without
moving objects. Poses and connectors share the displayed position of contained
artwork. No noun-specific production branches or extra provider calls were added.

Three fresh live statements used three provider attempts: 5.742 s, 8.294 s and
24.183 s. All three static SVG images were inspected. Human roles and pointing
improved; globe, camera and gate still used placeholders, gaze remains subtle,
and the cabinet is schematic. These are not perfect visual results or real-time
inference. No browser, phone, APK or deployment verification is claimed.

Final verification: 709 client tests passed, three optional smoke tests skipped;
69 backend tests passed. Both isolated performance tests passed: 278 probes,
834 samples, local SVG-ready p95 31.86 ms, maximum 56.78 ms. The unseen-noun
delayed-provider test passed at 94.26 ms. These timings exclude live inference
and screen paint. Lint, TypeScript, production build, bundle budget and Android
web sync passed. Main chunk: 505.61 kB; Vite's advisory chunk warning remains.
Independent corpus coverage remains 26/60 drawn, 1 held and 33 clarified;
strict gold remains 3/29. Neither is a product-completion percentage.

## Previous checkpoint — diagnose retries and recover explicit context, 16 October 2026

See [the retry review](docs/RETRY_REVIEW_2026-10-16.md). Source-grounded spatial
completion now also handles containment graphs, preserving existing contradiction,
uncertainty, ambiguity and graph-size guards. A controlled missing-link regression
failed after two provider attempts before the fix and succeeds in one afterwards.
An internal opt-in hook records repair reasons in local synthetic probe reports;
public API results and key handling are unchanged.

Three fresh statements used five provider attempts: 13.383 s, 23.879 s and
15.995 s. The final holdout used one call, but this does not prove a general
latency improvement. Two containment scenes remain schematic illustrations;
the pump/hose/gardener scene still has three placeholders. Static SVG images
were inspected. No universal accuracy, real-time inference or percentage claim.

Final verification: 702 client tests passed, three optional smoke tests skipped;
69 backend tests and 25 hosted-evaluation tooling tests passed. No timeout or
validation threshold was relaxed. No APK, phone or deployment check is claimed.
Lint, production build, bundle budget and Android web sync passed. Main chunk:
503.88 kB; Vite's existing advisory chunk warning remains.

## Previous checkpoint — contextual containment and visible targets, 16 October 2026

See [contextual containment evidence](docs/CONTEXTUAL_CONTAINMENT_2026-10-16.md).
Three-object containment no longer becomes an arrow merely because the same
objects have extra ordinary relationships. Context placement preserves explicit
left/right constraints, and connectors target the displayed content rather than
its hidden layout slot. No noun-specific production rules were added.

The final clean client run passed 701 tests, with three optional smoke tests
skipped. Both isolated performance tests passed: 278 probes, 834 samples, local
SVG-ready p95 33.20 ms, maximum 59.25 ms. The unseen-noun delayed-provider test
passed at 92.16 ms. These timings exclude live inference and browser/phone paint.

Two fresh live statements used four provider attempts (16.377 and 15.859 seconds).
The left-side example exposed a placement failure; saved-response replay verifies
the fix without another call. Basket/apple, jar/lemon and cabinet/violin SVGs were
inspected. Containers remain labelled schematics and natural pointing/gaze is not
established. Larger mixed/nested scenes remain unsupported by this layout.
Independent corpus coverage is unchanged; this is not a completion percentage.
Lint, TypeScript, production build, bundle budget and Android web sync passed.
The main chunk is 503.85 kB (Vite's advisory warning remains). No APK, real-browser
or phone verification is claimed for this patch. Backend code was unchanged.

## Previous checkpoint — protect ongoing teaching interactions, 16 October 2026

See [the workflow review](docs/WORKFLOW_REVIEW_2026-10-16.md). Two reproduced
failures are fixed: late hosted replies no longer erase a newer unsent draft,
and Undo cancels/invalidate pending interpretation before changing history.
All 25 focused mounted-app tests passed. A subsequent full run had 691 passed,
six timed out, three skipped and one worker RPC timeout. Both affected files then
passed all 19 tests in isolation; this is not a full-suite green checkpoint. Lint,
production build and bundle budget passed. Browser automation failed
initialization, so no real-browser or phone verification is claimed.

Two unseen live explanations used three provider attempts (5.272 and 9.422
seconds). Both passed role/endpoint checks, but inspected SVGs exposed a suitcase
placeholder and arrow-only containment/pointing. Neither is claimed visually
complete. No scenario-specific production rules were added.

## Previous checkpoint — retain artwork inside containment, 15 October 2026

See [the fresh-statement containment review](docs/CONTAINED_ARTWORK_2026-10-15.md).
Two fresh plans exposed a renderer-level fidelity loss: available content artwork
and colour were replaced by a text card. The shared containment renderer now reuses
EntityGlyph inside the enclosure, retaining unknown concepts as labelled values.
No noun-specific production rules or new dependencies were added.

The same saved camera/lemon plans now show their content artwork; unseen violin
and butterfly-with-observer follow-ups also rendered nested artwork. Four fresh
statements used four provider attempts, 3.275–7.544 seconds each. All matched their
literal role/endpoint expectations; static images were inspected. Outer containers
remain labelled schematics, and larger mixed scenes still use containment arrows.
This is a bounded visual improvement, not universal visual accuracy or completion.

Verification: 695 client tests passed, three optional smoke tests skipped; both
performance tests passed. Local SVG-ready p95 was 17.72 ms over 834 samples, maximum
36.89 ms, excluding inference/speech/browser paint/device scheduling. Six new tests
cover nested native/preview/validated artwork, colour, fallback and immutability.
Lint, production build/bundle budget, Android web sync and whitespace checks passed.
Vite's advisory 500 kB chunk warning remains (main chunk 503.24 kB).
No phone, APK or deployment verification is claimed. Backend code was unchanged.

## Previous checkpoint — cancel obsolete scene artwork, 15 October 2026

See [cancellation and fresh visual evidence](docs/SCENE_ARTWORK_CANCELLATION_2026-10-15.md).
Replacing or clearing a scene now cancels its obsolete queued/in-flight artwork,
while preserving lesson prefetches and completed review drafts. A quick Undo can
restart a cancelled noun after its previous request releases the slot. New tests
cover providers that ignore cancellation and prevent late results from resurfacing.

Three fresh live statements used three provider attempts: all rendered and met
their literal role/endpoint checks (4.403–10.741 seconds). Static visual inspection
found recognizable octopus/instrument previews, but the five-object bag scene
still uses a placeholder and diagram arrows rather than actual containment/support.
This is not a 100% visual score or overall completion claim.

Verification: full client suite 689 passed, three optional smoke tests skipped;
two isolated performance tests passed. Local SVG-ready p95 was 18.37 ms across
834 samples, maximum 32.68 ms, excluding AI/speech/browser paint/phone scheduling.
The under-100 ms cold-render regression passed at 50.22 ms in the full suite.
The prior 105.24 ms failure was not reproduced; scheduling variability is not
claimed solved. Stage timings are now printed without loosening the threshold.
Lint, production build/bundle budget, Android web sync and diff checks passed.
Vite's advisory chunk warning remains (main chunk 502.68 kB). No deployment,
APK or phone verification is claimed. Backend code was unchanged this run.

## Previous checkpoint — artwork activation and quality experiment, 15 October 2026

See [the live artwork/lifecycle review](docs/ARTWORK_LIFECYCLE_2026-10-15.md).
Fixed resolver notification when AI becomes available after a scene exists,
application cleanup of generation, and bounded/cancellable streamed-art readers.
Generated drafts still require review; no new artwork was marked approved.

Three fresh statements all rendered, but only 1/3 met every literal role/endpoint
expectation. One relational wording was ambiguous; the complex river-monitoring
example omitted the river. Five direct glyph evaluations (seven provider attempts)
showed that low-effort reasoning did not reliably improve silhouettes. Production
model/reasoning settings were therefore left unchanged. The existing purple telescope
preview was recognizable; the generated replacements were not acceptable.

Verification: 68 backend tests passed. Full client run: 685 passed, one failed,
three optional smoke tests skipped. The failure is the existing local-render timing
assertion: 105.24 ms against a 100 ms limit. An isolated targeted run passed 23/23,
but does not erase that full-suite failure. Lint, production build, bundle budget,
Android web sync and diff whitespace checks passed. The main chunk remains above
Vite's advisory 500 kB threshold (502.12 kB). No phone/APK/deployment test is claimed.
This checkpoint is not release-green or product completion.

## Previous checkpoint — mixed explanations and misleading output, 13 October 2026

See [the six-statement mixed-mechanism review](docs/MIXED_MECHANISMS_2026-10-13.md).
Six new statements received eleven live evaluations including post-fix retries.
Complete propagation mechanisms can now retain connected ordinary context instead
of rejecting or dropping it. Physical phenomena no longer get computer-process/CPU
icons solely from a model classification. A source-grounded transfer check catches
an active/passive predicate reversal that endpoint scoring alone missed.

Two previously rejected observer scenes now retain their expected graphs and render.
The radio holdout repaired its incorrect predicate, but still draws six labelled
placeholders. The vibration retry uses payload captions instead of all expected
nodes; the heat holdout timed out at 42 seconds. These are not finished doodles,
and no overall completion percentage is justified by this small, repeated sample.

Verification: 682 client, 68 backend, 25 hosted-evaluation and 2 performance tests
passed; three optional client live smoke tests skipped. Lint, production build,
bundle budget, Android web sync and diff whitespace checks passed. Vite emitted
its 500 kB chunk warning (main chunk 501.76 kB); the repository's explicit bundle
budget passed. Local SVG-ready p95 was 30.52 ms across 834 samples, maximum 82.53 ms.
This benchmark excludes AI, speech, browser paint and phone scheduling. No deployment,
APK build or phone verification is claimed. Static drawings were inspected; artwork
coverage and multi-second AI latency remain material product gaps.

## Previous checkpoint — general layout/appearance fixes, 13 October 2026

See [the ten-statement live review](docs/RANDOM_LIVE_REVIEW_2026-10-13.md).
Eight fresh statements plus two unseen post-fix holdouts used twelve provider attempts.
Seven of ten passed endpoint checks; seven are renderable after replaying the repaired
shelf scene. This is not a visual-accuracy or completion score.

Four-level vertical chains now determine their own row count with bounded geometry;
colour-qualified labels recover omitted attributes; emoji previews respect colours and
validated colour prefixes no longer break exact retrieval. Browser inspection also
exposed and fixed partially animated saved review pages. Conditional/negative explanations,
mixed specialist plans, physical interactions and artwork coverage remain open gaps.

Verification: 673 client, 60 backend, 25 hosted-evaluation and 2 performance tests passed
(three optional client smoke tests skipped); snapshot regression rerun passed. Lint,
build/bundle budget and Android web sync passed. Local SVG-ready p95 was 14.76ms, while
live calls took 5.707–28.406 seconds. No deployment, APK or phone verification is claimed.

## Previous checkpoint — twelve fresh live probes, 12 October 2026

See [the complete short/medium/complex review](docs/RANDOM_LIVE_REVIEW_2026-10-12.md).
Twelve new statements used thirteen provider attempts: 10/12 passed directed
endpoint checks, while only 11/12 initially rendered. A zero-call replay recovered
the missing standalone colour attribute, but monochrome emoji art remains a
visual failure. Support predicates now put a book above its desk instead of
beside it; physical contact is not yet implemented by this fix.

Actual static drawings were inspected, including the failures. Complex scenes
still have substantial placeholder coverage and incomplete conditional meaning.
Live latency was 4.217–30.777 seconds (median 6.7145 seconds), not real time.
These percentages describe this probe set, not overall completion.

Verification: 667 client tests passed (3 optional smoke tests skipped), 59 backend,
25 hosted-evaluation and 2 performance tests passed. Lint/build/bundle budget and
Android web sync passed. Local SVG-ready p95 was 17.02ms across 834 samples;
this excludes AI calls, speech, browser paint and phone performance.

## Previous checkpoint — spatial grounding and colour fidelity, 12 October 2026

See [composition and colour evidence](docs/COMPOSITION_AND_COLOUR_2026-10-12.md).
Four fresh live statements produced three complete graphs and one confident
omission of two spatial relations. The shared source-grounding path now restores
explicit, uniquely named missing spatial links without another model call;
contradictions and ambiguous wording are not silently guessed away.

Outline-only drawings now respect stated colours. Qualified native nouns such
as "blue book" retain their proper rig without reducing compound nouns to their
last word. The previously failed scene was replayed and checked in a headless
browser; a fifth new umbrella/ladder composition passed its first live call.
The student/key example still illustrates holding with an arrow, not physical
contact. Cold model calls were 5.87–8.84 seconds, not real-time speech.

Verification: **664 client**, **57 backend**, **25 hosted-evaluation**, and
**2 performance tests passed**; three optional live smoke tests skipped.
Lint, build, bundle budgets and Android web sync passed. Local SVG-ready p95:
**10.81 ms** across 834 samples, excluding model/network and browser/phone paint.
Local corpus remains **26/60 = 43.33%**, not product completion. Narrow static
browser review was clipped; physical-phone readiness is not claimed.

## Earlier checkpoint — artwork retrieval and lateral placement, 12 October 2026

See [artwork retrieval evidence](docs/ARTWORK_RETRIEVAL_2026-10-12.md).
The provisional offline pack grew from 15 to 17 nouns (bird and key added).
Twelve new blind vision calls plus nine reused screenings did not justify
shipping every model-matched drawing: the ambiguous dog was left out.

A new live bird/key/tree composition preserved 3/3 roles and 2/2 directed
endpoints in 5,742 ms with zero labelled placeholders, but static inspection
revealed diagonal placement for "beside". The general layout rule now preserves
lateral alignment along with vertical constraints, including additions beside
existing off-grid objects without moving them. The saved response was replayed
and inspected after the fix, with no additional model call.

Local corpus coverage remains **26/60 = 43.33%**, unchanged. This is not overall
product completion. The cold model call still took seconds; phone and broad
visual-quality validation remain separate open gates.

Verification: **658 client tests passed** (three optional smoke tests skipped),
then **75 focused tests passed** for the final contact-pose safeguard. Backend:
**51 passed**; artwork tools: **26 passed**. Final lint, production build,
bundle budget and Android web synchronization passed. This does not build or
test a new APK on a physical phone.
Both isolated performance checks passed: 834 local samples, SVG-ready p95
**16.13 ms**, excluding model/network time, speech and browser/device painting.

## Earlier checkpoint — stroke language, 11 October 2026

See [runtime artwork evidence](docs/STROKE_LANGUAGE_2026-10-11.md). Generated
strokes can now choose straight or curved geometry; old strokes retain their
original rendering. The backend and browser use shared drawing instructions,
and container packaging now includes the service's shared runtime modules.

Six live lamp/bottle drafts (seven provider attempts) were rendered and inspected.
Straight edges are preserved, but the lamp remains ambiguous and the bottle
varies by run. Requesting low-effort reasoning did not reliably improve artwork,
so the runtime reasoning default is unchanged. None of these drafts was promoted
to the approved pack. This is not evidence of universal doodle quality.

Local coverage remains **26/60 = 43.33%**, unchanged. Docker source packaging is
tested independently; an actual image build needs a running Docker daemon. No
new APK, phone validation or deployed-backend update is claimed here.

Verification: **652 client tests passed**, three optional live tests skipped;
the final protocol safeguard then passed nine focused client tests and all
**51 backend tests**. Lint, build, bundle budgets and Android web sync passed.
Both local performance tests passed (834 samples; SVG-ready p95 **48.61 ms**,
excluding model/network time, browser paint and phone scheduling). New clients
opt into stroke format 1.1; older clients retain the original response fields.

## Earlier checkpoint — mixed explanations, 10 October 2026

See [mixed-flow and artwork-recovery evidence](docs/MIXED_FLOW_2026-10-10.md).
Three new live Nebius explanations preserved all 12 expected roles and all nine
directed links on their first attempts (5.7–9.9 seconds). Static renders were
inspected. This is **3/3 on a small structural probe, not 100% visual accuracy**.

Exact registered nouns now reuse existing rigs when the model supplies `generic`.
Replaying the same kite/tree response removed its one unnecessary placeholder;
six placeholders remain in the other two diagrams. Compounds and supplied art
are not overwritten by the new exact-match rule. Generation deadlines now report
errors with cooldown, provider replacement resumes interrupted work, and lesson
preparation cannot wait forever on a provider that ignores cancellation.

Local corpus coverage is still **26/60 = 43.33%**, a **0.00 percentage-point**
change. It is not a whole-product completion estimate. Android web assets were
rebuilt and synchronized; a new APK and phone behavior are not verified here.

Verification: 645 client cases passed in the full run; one timed-out UI case
passed on an unchanged four-test rerun. Three optional live smoke cases were
skipped. All 44 backend tests passed. Both performance tests passed on an isolated
rerun (834 samples, local SVG-ready p95 29.15 ms, not phone or network latency).
Production build, bundle budgets and lint passed. The evidence note records both
initial timeout failures, rather than presenting them as clean first runs.

## Earlier checkpoint — hosted propagation, 10 October 2026

See [hosted propagation and replay evidence](docs/HOSTED_PROPAGATION_2026-10-10.md).
The current local corpus coverage is **26/60 (43.33%)**. Hosted propagation now
reaches the continuous renderer; three unfamiliar prompts each eventually passed
their role/link checks across several live development runs. Cold requests still
took 5.9–10.3 seconds on the successful observations, not real-time. Safe exact
standalone repeats can now reuse session plans across scene revisions.

Verification: **628 client tests passed**, three optional live smoke tests skipped;
**44 backend**, **25 hosted-evaluation tooling**, **24 artwork-tooling** and **2 local
performance** tests passed. The local SVG-ready benchmark measured **36.36 ms p95**
over 834 samples, excluding speech, browser paint and phone scheduling. Build,
bundle budget, lint and Android web-asset sync passed. No connected phone was
available. The local native build attempt encountered a Gradle loopback startup
error; it is not a verified APK build.

The sections below preserve earlier checkpoint evidence and historical live
pilots; their older counts and timings do not supersede this checkpoint.

## What is implemented

- Android-first Capacitor app; local speech/text, deterministic scene compiler, SVG renderer, Undo, and accessible spoken scene summary.
- Local supported constructions remain fast and work without network access. The latest isolated local SVG-ready regression run measured p95 18.17 ms across 834 observations with two test workers, **excluding speech recognition, browser commit/paint, and Android device scheduling**. This varies with host load and is not a phone latency claim.
- A separate Node 24 service is wired for NVIDIA Nemotron 3 Super **on Nebius Token Factory** for unsupported scene language, noun-stroke generation, glyph editing, and lesson-noun prefetch. Credentials stay on the service. Direct NVIDIA Catalog and OpenRouter providers remain development fallbacks, not qualifying hackathon paths by themselves.
- The Android and Pages workflows now build with the same public `TEGEERA_INTERPRETER_URL` variable; the API key is never a client build variable.
- Client and service validate schema, bounds, and references. On failure, the existing accepted scene remains in place. This is a safety property, **not** proof of semantic correctness or doodle quality.
- Hosted blueprints can now carry eleven reusable typed relationships. Complete transport-loop and opposing-force topologies activate the existing specialist diagrams; partial specialist graphs fail validation instead of becoming misleading generic arrows. Other untyped relationships use silhouette-clipped, obstacle-aware connectors, or fail safely if no visible route exists. This remains a constrained visual language, not a general-purpose drawing model.
- Generated noun glyphs remain visible session drafts until explicitly approved. Rejected or superseded in-flight generations and edits cannot enter the reusable cache; approved artwork alone is persisted on the device.
- Reusable symbol drawings now render without category badge frames, and lone subjects use a tighter overview on phones. The single-subject phone screenshot was inspected.
- Multi-object scenes now keep a complete overview and offer overlapping left/middle/right phone views in a taller canvas. Three part-whole phone crops were visually inspected; cropping is explicit and never changes the semantic scene. Real-device readability is still unverified.
- Dense hosted scenes no longer shrink every object to 72% of its normal scale, and a lightweight object-name guide stays readable outside the SVG viewport. This improves legibility without duplicating every glyph, but does not repair incomplete meaning by itself.
- A new reusable part-whole assembly layer places recognizable part glyphs against their whole. Complete hosted input → part → whole graphs now use the registered channel layout, so arrows no longer run across the wrong object merely because the model proposed scattered coordinates. Unknown glyphs do not acquire a pretend attachment. This is schematic composition, **not** proof of anatomical accuracy. The earlier staged review is `.visual-check/hosted-review-v4-staged/review.html`; the current live-response review is `.visual-check/hosted-review-v6-source-grounded/review.html` and still needs human phone inspection.
- The optional model service now rejects forged forwarded-IP rate-limit bypasses, caps concurrent work and outbound attempts per UTC day, bounds prompt hints, and cancels provider work after a client disconnect. These are per-process prototype guards, not a provider billing limit or distributed quota.
- Hosted plans cannot bypass the blueprint boundary with direct DoodleScript. Explicitly negated claims and missing or swapped stated colours fail closed before changing a drawing. A shared service/browser source audit now also checks named passage-through links and applied-versus-opposing-force topology, repairing once or holding the old scene instead of drawing an incomplete graph. It is a narrow structural check; general semantic completeness and visual quality remain unproven.

## Verified in this checkpoint

| Check | Result | Meaning |
| --- | --- | --- |
| Client suite | 480 passing, 3 live-provider cases skipped | Regression safety with mocked hosted-service flow; no live model claim. |
| Service suite | 20 passing | Mocked Nebius endpoint and key isolation, bounded schema/semantic correction, specialist-topology checks, invalid output, HTTP origin/health, usage guards, provider throttling, and disconnect cancellation. |
| Offline artwork intake | 12 passing | Bounded Quick, Draw! sampling, SVG safety, explicit review, provenance and attribution. No candidate auto-ships. |
| Hosted-planner gold and real-render gate | 13 passing | Saved blueprints run through the actual compiler and canvas; a complete structural transport plan is proven to reach the loop renderer. Human review remains separate. |
| TypeScript, production bundle, Capacitor sync | Passing | Client assets compile and copy to Android. Does not compile an APK. |
| Lint | Passing | Static source checks. |
| Independent teacher corpus | 25/60 drawn, 1/60 held, 34/60 clarified | Drawing/clarification counts only; not visual accuracy. |
| Strict annotated gold | 3/29 passed | Current local engine; adding an untested model does not improve this score yet. |
| Offline approved glyph pack | 0 entries | A no-cost Quick, Draw! candidate/review pipeline exists, but nothing has passed review into the app. Long-tail doodles still depend on an optional model or labelled fallback. |
| Live Nebius connectivity and three-case comparison | Run locally | The latest bounded run is 3/3 semantic-ready, with all required SVG cues and grammar detected; 0/3 recorded strict phone visual passes. One case required two model calls and 22.2 seconds. This is not a product pass or a broad accuracy estimate. |
| Real-device latency, APK assemble, human visual approval | Not run | These remain required before a credible public demo. |

## First live Token Factory pilot

The private local service reported `provider: nebius` and model `nvidia/nemotron-3-super-120b-a12b`. A separate user-run single-request smoke check returned a structurally valid one-object book plan in 3299 ms; recognizability was not assessed. A bounded evaluation then sent independent teacher statements #1, #2, and #11 without supplying gold answers to the model. The saved report and actual-render review are under the ignored `.visual-check` directory. These results are a **baseline from the server process already running before the subsequent general prompt-audit and token-usage changes**; those changes need a restart and a separate live comparison.

| Case | Live result | Measured service latency | Render evidence |
| --- | --- | ---: | --- |
| #1 plant intake | 5/5 concepts and 4/4 directed links, but a sunlight-to-leaves relation was typed as material flow, so meaning remains unverified. | 7766 ms | Rendered; required leaf-targeted ray missing. |
| #2 circulation | 3/4 concepts; oxygen omitted and 0/3 required directed links. The 0.9 confidence was false. | 7052 ms | Rendered but no circulation grammar or required cues. |
| #11 force/friction | The model service could not produce a valid plan. | 10687 ms | No accepted drawing; review page now handles this safely. |

These timings are service request durations, not speech-to-painted-frame latency. No human visual approval has been entered. The pilot is too small to estimate broad accuracy; its role is to expose failure modes before spending more credits or claiming readiness.

## Second bounded live comparison

After restarting an isolated loopback-only service with the general schema-error feedback, the same independent statements #1, #2, and #11 were sent again without giving the model gold answers. The saved live report is `.visual-check/hosted-gold-v2-live-report.json`; its rendered review is `.visual-check/hosted-review-v2-readable-final/review.html`. These local files are intentionally ignored by Git. The normal app service on port 8080 was not changed by this test.

| Case | Semantic result | Service latency | Model attempts / reported tokens |
| --- | --- | ---: | ---: |
| #1 plant intake | 5/5 concepts and 4/4 directed links; semantic-ready by the current annotation. | 7786 ms | 1 / 2010 |
| #2 circulation | 3/4 concepts and 0/3 links; oxygen missing despite 0.9 confidence. | 7616 ms | 1 / 1964 |
| #11 force/friction | 3/4 concepts and 1/3 links; push identity missing despite 0.9 confidence. | 22281 ms | 2 / 6164 |

Thus the **second pilot is 1/3 semantic-ready, 2/3 false-confident, and 0/3 visually approved**. At capture time, the renderer's machine-readable cue check succeeded for #1, but the root and leaf appeared only as separate objects rather than attached anatomy. Cases #2 and #11 fail the required visual grammar. The bounded retry made #11 structurally valid at a substantial latency/token cost, without making it semantically complete. Reported token counts are provider metadata, not a billing estimate. Do not extrapolate these three examples to broad accuracy.

After this pilot, the general channel layout stages #1's sunlight → leaf → plant and water → root → plant paths in separate rows, and the assembly layer places small part glyphs at the plant's boundary. I inspected static PNGs of all three saved scenes: #1 is clearer, while #2 still shows unrecognized heart/blood placeholders and no return loop; #11 still shows no force diagram or credible rough floor. The original pilot scores above do not change: no new provider request or human approval was made for this compiler/renderer revision. A static PNG is not an Android screenshot or a human visual-approval record.

## Third bounded live comparison — structural diagram grammar

With the new general diagram protocol, an isolated local Nebius service evaluated the same three statements. The report is `.visual-check/hosted-gold-v3-live-report.json`; the updated real-canvas review is `.visual-check/hosted-review-v5-structural/review.html`. The service was stopped after the run. No gold visual descriptions were sent to the model.

| Case | Meaning evidence | Service latency | Actual static SVG inspection |
| --- | --- | ---: | --- |
| #1 plant intake | 5/5 concepts, **2/4 links**; water and sunlight bypass their named parts despite 0.9 confidence. | 7421 ms | Rendered but missing the water-to-root and sunlight-to-leaf cues. The long routed arrows expose the semantic error rather than hiding it. |
| #2 circulation | **4/4 concepts, 3/3 links**; complete `pumpsTo` / `returnsTo` / `carries` topology. | 7061 ms | A real heart–lungs loop now appears, with distinct outbound and oxygenated return arrows; required SVG cues present. Human phone review remains pending. |
| #11 force/friction | 3/4 concepts, **0/3 links**; applied push force omitted despite 0.9 confidence. | 10943 ms | Still a generic person/box/placeholder graph, not a force diagram. |

This run is **1/3 semantic-ready, 2/3 false-confident, 0/3 recorded visual approvals**—not a broad accuracy estimate. All three responses were one provider attempt; reported total tokens were 1818, 1842, and 2231 respectively. Complete specialist diagrams are now representable and testable, but model choice and semantic self-checking remain the bottleneck. The static SVG inspection is not a browser/Android screenshot or proof of classroom usefulness.

## Fourth bounded live comparison — source-grounded links

The service and browser compiler now share narrow source-to-graph checks. An explicit input passing through a named part must reach that part, and an applied action opposed by a force must be represented by distinct arrows and contact. The service gives the model one bounded repair attempt; the browser holds the prior drawing if a bypass reaches it. These rules are structural and reusable across object names, not teacher-sentence branches. On the same three independent statements, without gold answers in the prompt, the final isolated local Nebius run was saved as `.visual-check/hosted-gold-v4b-prompt-report.json` and rendered at `.visual-check/hosted-review-v6-source-grounded/review.html`.

| Case | Live semantic result | Service latency / attempts | Actual-render check |
| --- | --- | ---: | --- |
| #1 plant intake | 5/5 concepts, 4/4 directed links | 11385 ms / 1 | Part-whole-flow grammar and all required cues detected; static SVG inspected. |
| #2 circulation | 4/4 concepts, 3/3 directed links | 11908 ms / 1 | Closed circulation-loop grammar and all required cues detected. |
| #11 force/friction | 4/4 concepts, 3/3 directed links | 22179 ms / 2 | Force-diagram grammar and all required cues detected; static SVG inspected and floating surface alignment corrected. |

This is **3/3 semantic-ready, 0/3 recorded strict visual passes** on a repeated, tiny subset. The machine cue checks do not prove artistic quality or phone readability; a static SVG is not a device screenshot. The two-call force case is much too slow for the real-time target. Reported tokens were 2447, 2204, and 6890, respectively, so retries also cost inference credit. An earlier run with the audit but without the revised planner instruction safely rejected #1 and #11; this is evidence of safer failure, not an improvement in broad acceptance by itself.

## Next gates, in order

1. Inspect the latest saved three-case actual-render review on a real phone and record concrete acceptance/rejection reasons, including label readability, motion, and part composition. Improve general semantic completeness and false-confidence detection on **unseen** statements without adding statement-specific branches. The $25 inference credit is not a production backend host or uptime guarantee.
2. Evaluate the **same independent 60 statements** through the hosted pipeline. The new [render-and-review workflow](HOSTED_EVALUATION.md) compares saved model responses with the actual canvas and records human decisions. Measure semantic completeness, unsafe acceptance, clarification rate, service latency, and visual appearance separately. No model gets a pass merely for returning valid JSON.
3. Curate an offline pack of recognizable, original or properly licensed doodles. Each item needs provenance and 64 px human review. Keep unapproved candidates out of the release pack. Review in-scene composition and animation on an actual phone.
4. Run speech-to-painted-frame traces on low- and mid-range Android hardware with warm/cold network, no network, and provider errors. Set p50/p95 budgets for *the whole user-visible path*, not just the local compiler.
5. Assemble and install the APK using Java 21 and Android platform 35. Verify microphone permission, WebView origin, touch targets, reduced motion, foreground/background recovery, and repeated prompts without a refresh.
6. Add a no-cost service deployment with enforceable usage/budget limits **only after** its hosting terms, free quota and hackathon rules are checked. Do not promise a public inference service on an unverified free tier.

The goal is an impressive, truthful prototype with measurable progress toward broad classroom visualization. “Anything perfectly, in real time” remains a research-level target, not the current product state.
