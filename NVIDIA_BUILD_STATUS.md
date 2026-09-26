# Tegeera — NVIDIA build evidence and next gates

This is a product-development checkpoint, not a claim that arbitrary speech already becomes an accurate, beautiful drawing.

## What is implemented

- Android-first Capacitor app; local speech/text, deterministic scene compiler, SVG renderer, Undo, and accessible spoken scene summary.
- Local supported constructions remain fast and work without network access. The latest isolated local SVG-ready regression run measured p95 17.12 ms across 834 observations, **excluding speech recognition, browser commit/paint, and Android device scheduling**.
- A separate Node 24 service is wired for NVIDIA Nemotron 3 Super **on Nebius Token Factory** for unsupported scene language, noun-stroke generation, glyph editing, and lesson-noun prefetch. Credentials stay on the service. Direct NVIDIA Catalog and OpenRouter providers remain development fallbacks, not qualifying hackathon paths by themselves.
- The Android and Pages workflows now build with the same public `TEGEERA_INTERPRETER_URL` variable; the API key is never a client build variable.
- Client and service validate schema, bounds, and references. On failure, the existing accepted scene remains in place. This is a safety property, **not** proof of semantic correctness or doodle quality.
- Hosted blueprints can now carry five reusable typed relationship grammars. The compiler routes those to existing visual layouts instead of turning every link into a generic arrow; untyped and unsupported meanings remain generic or are rejected. This is not a new general-purpose drawing model.
- Generated noun glyphs remain visible session drafts until explicitly approved. Rejected or superseded in-flight generations and edits cannot enter the reusable cache; approved artwork alone is persisted on the device.
- Reusable symbol drawings now render without category badge frames, and lone subjects use a tighter overview on phones. The single-subject phone screenshot was inspected.
- Multi-object scenes now keep a complete overview and offer overlapping left/middle/right phone views in a taller canvas. Three part-whole phone crops were visually inspected; cropping is explicit and never changes the semantic scene. Real-device readability is still unverified.
- The optional model service now rejects forged forwarded-IP rate-limit bypasses, caps concurrent work and outbound attempts per UTC day, bounds prompt hints, and cancels provider work after a client disconnect. These are per-process prototype guards, not a provider billing limit or distributed quota.
- Hosted plans cannot bypass the blueprint boundary with direct DoodleScript. Explicitly negated claims and missing or swapped stated colours fail closed before changing a drawing. This checks only those claims; general semantic completeness and visual quality remain unproven.

## Verified in this checkpoint

| Check | Result | Meaning |
| --- | --- | --- |
| Client suite | 472 passing, 3 live-provider cases skipped | Regression safety with mocked hosted-service flow; no live model claim. |
| Service suite | 16 passing | Mocked Nebius endpoint and key isolation, correction, invalid output, HTTP origin/health, usage guards, provider throttling, and disconnect cancellation. |
| Offline artwork intake | 12 passing | Bounded Quick, Draw! sampling, SVG safety, explicit review, provenance and attribution. No candidate auto-ships. |
| Hosted-planner gold and real-render gate | 10 passing | Saved blueprints run through the actual compiler and canvas; semantic completeness cannot count as visual success without required SVG evidence and human review. Live provider accuracy remains unmeasured. |
| TypeScript, production bundle, Capacitor sync | Passing | Client assets compile and copy to Android. Does not compile an APK. |
| Lint | Passing | Static source checks. |
| Independent teacher corpus | 25/60 drawn, 1/60 held, 34/60 clarified | Drawing/clarification counts only; not visual accuracy. |
| Strict annotated gold | 3/29 passed | Current local engine; adding an untested model does not improve this score yet. |
| Offline approved glyph pack | 0 entries | A no-cost Quick, Draw! candidate/review pipeline exists, but nothing has passed review into the app. Long-tail doodles still depend on an optional model or labelled fallback. |
| Live Nebius connectivity and three-case pilot | Run locally | Nemotron on Token Factory returned one valid-book blueprint and three independent-case responses. On the three cases, 0/3 semantic-ready and 0/3 visually approved. This is not a product pass. |
| Real-device latency, APK assemble, human visual approval | Not run | These remain required before a credible public demo. |

## First live Token Factory pilot

The private local service reported `provider: nebius` and model `nvidia/nemotron-3-super-120b-a12b`. A separate user-run single-request smoke check returned a structurally valid one-object book plan in 3299 ms; recognizability was not assessed. A bounded evaluation then sent independent teacher statements #1, #2, and #11 without supplying gold answers to the model. The saved report and actual-render review are under the ignored `.visual-check` directory. These results are a **baseline from the server process already running before the subsequent general prompt-audit and token-usage changes**; those changes need a restart and a separate live comparison.

| Case | Live result | Measured service latency | Render evidence |
| --- | --- | ---: | --- |
| #1 plant intake | 5/5 concepts and 4/4 directed links, but a sunlight-to-leaves relation was typed as material flow, so meaning remains unverified. | 7766 ms | Rendered; required leaf-targeted ray missing. |
| #2 circulation | 3/4 concepts; oxygen omitted and 0/3 required directed links. The 0.9 confidence was false. | 7052 ms | Rendered but no circulation grammar or required cues. |
| #11 force/friction | The model service could not produce a valid plan. | 10687 ms | No accepted drawing; review page now handles this safely. |

These timings are service request durations, not speech-to-painted-frame latency. No human visual approval has been entered. The pilot is too small to estimate broad accuracy; its role is to expose failure modes before spending more credits or claiming readiness.

## Next gates, in order

1. Inspect the saved three-case actual-render review with a human and record concrete rejection reasons. Improve general semantic completeness, relation typing, and invalid-output repair without adding statement-specific branches; rerun a bounded fresh live comparison before claiming progress. The $25 inference credit is not a production backend host or uptime guarantee.
2. Evaluate the **same independent 60 statements** through the hosted pipeline. The new [render-and-review workflow](HOSTED_EVALUATION.md) compares saved model responses with the actual canvas and records human decisions. Measure semantic completeness, unsafe acceptance, clarification rate, service latency, and visual appearance separately. No model gets a pass merely for returning valid JSON.
3. Curate an offline pack of recognizable, original or properly licensed doodles. Each item needs provenance and 64 px human review. Keep unapproved candidates out of the release pack. Review in-scene composition and animation on an actual phone.
4. Run speech-to-painted-frame traces on low- and mid-range Android hardware with warm/cold network, no network, and provider errors. Set p50/p95 budgets for *the whole user-visible path*, not just the local compiler.
5. Assemble and install the APK using Java 21 and Android platform 35. Verify microphone permission, WebView origin, touch targets, reduced motion, foreground/background recovery, and repeated prompts without a refresh.
6. Add a no-cost service deployment with enforceable usage/budget limits **only after** its hosting terms, free quota and hackathon rules are checked. Do not promise a public inference service on an unverified free tier.

The goal is an impressive, truthful prototype with measurable progress toward broad classroom visualization. “Anything perfectly, in real time” remains a research-level target, not the current product state.
