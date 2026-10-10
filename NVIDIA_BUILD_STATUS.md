# Tegeera — NVIDIA build evidence and next gates

This is a product-development checkpoint, not a claim that arbitrary speech already becomes an accurate, beautiful drawing.

## Latest checkpoint — mixed explanations, 10 October 2026

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
