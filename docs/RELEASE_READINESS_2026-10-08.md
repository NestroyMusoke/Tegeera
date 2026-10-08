# Tegeera release evidence — 8 October 2026

Status: improved development build, **not a finished universal real-time doodling product**.
Automated safety, graph coverage, recognizable artwork and device usability are separate gates.

## Implemented and checked

- A self-contained new hosted explanation replaces an unrelated previous scene even when the model chooses `extend`. Explicit additions and references to established objects can still extend. The rule runs in both backend and browser and does not require an extra model request. Undo retains the previous scene.
- Suggested coordinates no longer make overlapping objects or an over-specified vertical stack impossible by themselves. A bounded alternative placement search preserves explicit spatial constraints. Contradictory above/below requirements still fail safely.
- When model coordinates contradict a spatial relationship, the compiler compares actual connector lengths to avoid unnecessary board-wide detours. Saved steam/cup/lid output now has two short upward connectors.
- Concrete native silhouettes require a matching noun from the existing concept registry. A model calling a bridge a `building` no longer produces a house drawing. Unsupported nouns remain eligible for glyph retrieval and honest fallbacks.
- The separate provisional Quick, Draw! pack increased from 3 to 15 entries, with source IDs, CC BY 4.0 attribution and explicit non-human-review status. No lesson sentences map to stored scenes. The pack contains reusable noun artwork only.
- Intake sampled 20 categories (40 candidates); blind model screening matched 19 drawings across 14 categories. Additional visual inspection excluded several ambiguous matches. Nine new-category sketches and three previously screened nature sketches were selected. A model match was not automatically treated as visual approval.
- Waiting for AI says “Preparing your drawing”; clarification messages remain for actual failures or questions. Static verbs such as “waits beside” use an undirected positional cue.

## Live evidence

Six synthetic statements were sent to Nebius Nemotron 3 Super. Initial live response times were **4.2–15.5 seconds**, one provider attempt per returned plan. The first sandboxed invocation failed to reach the network and is not counted as provider evidence. Saved plans were reused for renderer fixes without repeated paid calls.

| Statement family | Endpoint score | Observed limitation |
| --- | --- | --- |
| Battery powers motor, motor spins fan | Complete | Fan now has provisional artwork; motor remains a label. |
| Robot carries box across bridge to workshop | Complete | Precise robot/bridge/workshop artwork remains incomplete. |
| Magnet pulls an iron nail | Complete | Nail artwork remains incomplete. |
| Cyclist rides across bridge, fish beneath bridge | 2/3 expected links | Model attaches route to rider, not bicycle; this may describe travel but misses the predeclared annotation. Initial layout failure fixed. Bridge is no longer misdrawn as a house. |
| Fan blows air toward window, curtain beside window | 2/3 expected links | Model reversed the subject of “hangs beside.” This is still an interpretation defect. |
| Child holds umbrella, rain from cloud onto umbrella | Complete | Initial layout failure fixed; final picture remains a separated explanatory diagram, not a physically composed child holding an umbrella. |

These are role/directed-endpoint scores, not full semantic or visual passes. A bare edge labelled “from” can still be linguistically weak even when its endpoints match. Provisional art is not independent human approval.

Ignored evidence is under `.visual-check/oct08-*`, including live candidate JSON, replay reports and static PNGs. The committed probe definitions are in `evaluation/release-probes-oct08.json`; those expected roles/links are never sent to the model.

## Actual browser test

The development app at `http://localhost:5173/` connected to a loopback-only Nebius backend on port 8089. No API key was entered into the page.

1. “A butterfly visits a flower while a bee waits beside the flower” rendered three provisional doodles.
2. A subsequent fish/cloud statement initially accumulated objects because the model selected `extend`. This exposed the replacement bug rather than passing the test.
3. After the shared fix and a local backend restart, “A fan blows toward a flower” replaced the five-object scene with exactly fan and flower at revision 3, without refreshing.
4. Undo restored the prior five-object scene at revision 2.

One live attempt failed safely before the backend restart. It is not counted as a successful test. Browser automation and visible output confirmed replacement and Undo; no Android device test was performed.

## Verification

- Full application suite after layout/artwork fixes: **543 passed, 3 live-provider tests skipped**.
- After the final browser-discovered replacement/status changes: **60 targeted app, hosted integration, compiler and spatial-predicate tests passed**.
- Backend: **39 passed**, including one-call replacement normalization and explicit-addition preservation.
- Artwork tooling: **24 passed**. Hosted evaluation tooling: **24 passed**.
- Local rendering benchmark: **278 supported constructions, 834 samples; SVG-ready p95 50.84 ms, maximum 94.12 ms**. This measures the supported local parser/renderer, not arbitrary hosted compilation, speech, model latency or Android paint.
- Final production build, bundle budget, lint and Capacitor asset synchronization passed. Main application bundle: about 474.57 kB / 142.01 kB gzip.
- The previous committed GitHub Pages and Android APK workflows succeeded at `88a9d76`. This patch has not been committed, pushed or deployed by the agent.

## Remaining release gates

1. **Meaning:** held-out multi-clause explanations still produce missing, reversed or weakly labelled relationships. The current guardrails catch only a subset of semantic errors.
2. **Artwork and composition:** fifteen provisional drawings do not cover arbitrary teaching vocabulary. A node-and-arrow picture does not establish physical contact, action or a coherent illustrated scene. Runtime model doodles remain drafts.
3. **Cold-request latency:** 4–15 seconds is not real-time. The fast local benchmark must not be used as a claim about unseen hosted requests.
4. **Deployment:** public backend configuration was not verifiable through the unauthenticated GitHub CLI variable endpoint. Local connectivity is proven; public phone connectivity is not. Never ship the private provider key in web/APK assets.
5. **Android:** assets are synchronized, but this PC lacks the project's Android 35 platform and a verified Java 21 setup. The existing GitHub APK workflow supplies them. The new patch still requires its CI build and an actual phone test of speech, repeated input, cancellation, Undo, readable labels and latency.

Do not describe this evidence as “anything, perfectly drawn instantly” or mark the overall product finished.
