# Tegeera — NVIDIA build evidence and next gates

This is a product-development checkpoint, not a claim that arbitrary speech already becomes an accurate, beautiful drawing.

## What is implemented

- Android-first Capacitor app; local speech/text, deterministic scene compiler, SVG renderer, Undo, and accessible spoken scene summary.
- Local supported constructions remain fast and work without network access. The local SVG-ready regression run measured p95 48.07 ms across 834 observations, **excluding speech recognition, browser commit/paint, and Android device scheduling**.
- A separate Node 24 service can use NVIDIA Nemotron 3 Super for unsupported scene language, noun-stroke generation, glyph editing, and lesson-noun prefetch. Credentials stay on the service. An existing OpenRouter provider is available as fallback when only that provider is configured.
- The Android and Pages workflows now build with the same public `TEGEERA_INTERPRETER_URL` variable; the API key is never a client build variable.
- Client and service validate schema, bounds, and references. On failure, the existing accepted scene remains in place. This is a safety property, **not** proof of semantic correctness or doodle quality.
- Hosted blueprints can now carry five reusable typed relationship grammars. The compiler routes those to existing visual layouts instead of turning every link into a generic arrow; untyped and unsupported meanings remain generic or are rejected. This is not a new general-purpose drawing model.
- Generated noun glyphs remain visible session drafts until explicitly approved. Rejected or superseded in-flight generations and edits cannot enter the reusable cache; approved artwork alone is persisted on the device.

## Verified in this checkpoint

| Check | Result | Meaning |
| --- | --- | --- |
| Client suite | 465 passing, 3 live-provider cases skipped | Regression safety with mocked hosted-service flow; no live model claim. |
| Service suite | 8 passing | Mocked NVIDIA request, correction, invalid output, HTTP origin/health and key boundary. |
| Offline artwork intake | 12 passing | Bounded Quick, Draw! sampling, SVG safety, explicit review, provenance and attribution. No candidate auto-ships. |
| Hosted-planner gold and real-render gate | 10 passing | Saved blueprints run through the actual compiler and canvas; semantic completeness cannot count as visual success without required SVG evidence and human review. Live provider accuracy remains unmeasured. |
| TypeScript, production bundle, Capacitor sync | Passing | Client assets compile and copy to Android. Does not compile an APK. |
| Lint | Passing | Static source checks. |
| Independent teacher corpus | 25/60 drawn, 1/60 held, 34/60 clarified | Drawing/clarification counts only; not visual accuracy. |
| Strict annotated gold | 3/29 passed | Current local engine; adding an untested model does not improve this score yet. |
| Offline approved glyph pack | 0 entries | A no-cost Quick, Draw! candidate/review pipeline exists, but nothing has passed review into the app. Long-tail doodles still depend on an optional model or labelled fallback. |
| Live NVIDIA calls, real-device latency, APK assemble, human visual approval | Not run | These remain required before a credible public demo. |

## Next gates, in order

1. Obtain a NVIDIA API Catalog key privately; never paste it into chat or commit it. Run a private local server smoke test and record model ID, response errors, latency, and actual generated scenes. A free prototype endpoint is not a production hosting or uptime guarantee.
2. Evaluate the **same independent 60 statements** through the hosted pipeline. The new [render-and-review workflow](HOSTED_EVALUATION.md) compares saved model responses with the actual canvas and records human decisions. Measure semantic completeness, unsafe acceptance, clarification rate, service latency, and visual appearance separately. No model gets a pass merely for returning valid JSON.
3. Curate an offline pack of recognizable, original or properly licensed doodles. Each item needs provenance and 64 px human review. Keep unapproved candidates out of the release pack. Review in-scene composition and animation on an actual phone.
4. Run speech-to-painted-frame traces on low- and mid-range Android hardware with warm/cold network, no network, and provider errors. Set p50/p95 budgets for *the whole user-visible path*, not just the local compiler.
5. Assemble and install the APK using Java 21 and Android platform 35. Verify microphone permission, WebView origin, touch targets, reduced motion, foreground/background recovery, and repeated prompts without a refresh.
6. Add a no-cost service deployment with enforceable usage/budget limits **only after** its hosting terms, free quota and hackathon rules are checked. Do not promise a public inference service on an unverified free tier.

The goal is an impressive, truthful prototype with measurable progress toward broad classroom visualization. “Anything perfectly, in real time” remains a research-level target, not the current product state.
