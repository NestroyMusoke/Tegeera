# Real-time interpretation: measured bottleneck and next gates

Tegeera is not yet an arbitrary-speech-to-accurate-doodle system in real time. The fast local parser, interim noun previews, and asynchronous glyph resolver improve responsiveness, but a new unsupported explanation still waits for the semantic model's **complete, validated** blueprint. A valid JSON shape is not evidence of semantic or visual accuracy.

## What we measured (27 September 2026)

The credit-consuming `npm run benchmark:nebius-latency -- --ids 1,2,11 --modes default,low,off` path uses the frozen independent gold annotations **only to score responses**, never in the prompt. It records total wall time, provider-attempt times and tokens, and whether the blueprint meets the gold semantic graph. It does not measure microphone, Android paint, or drawing quality. Three cases are a probe, not an accuracy rate or p95.

| Model and mode | Case 1 | Case 2 | Case 11 | Interpretation |
| --- | --- | --- | --- | --- |
| Nemotron 3 Super, default reasoning | 29.9 s, not gold-ready | 29.4 s, gold-ready after repair | 17.0 s, gold-ready after repair | Best of the tested modes on these harder graphs, still slow and imperfect. |
| Nemotron 3 Super, low effort | 8.2 s, gold-ready | 14.4 s, invalid after repair | 7.8 s, not gold-ready | Faster; unsafe to select by default. |
| Nemotron 3 Super, thinking off | 4.7 s, gold-ready | 16.0 s, invalid after repair | 5.4 s, not gold-ready | Fast when it works; misses essential structure. |
| Nemotron 3.5 Lightning, thinking off | 13.3 s, invalid | 2.7 s, not gold-ready | 5.8 s, invalid | This prompt/validator combination is not viable as a drop-in. |

The default case 1 response had all expected concept and topology counts but still failed the complete gold check; counts alone do not establish correct predicates. A response may also vary between identical calls. Case 2 and 11 required two provider calls in the default run; the retry adds material latency and tokens. These are observed values from one local connection, not provider guarantees. No quality-reducing thinking switch was made to the shipped default.

We then tested [Nebius schema-constrained JSON output](https://docs.tokenfactory.nebius.com/ai-models-inference/json) with Super's normal reasoning on six frozen cases. Both ordinary output and schema guidance were semantic-ready on the same **2/6** cases. The schema run's median wall time was about **7.7 s**, versus about **15.6 s** for the separate ordinary-output runs; this is a small, non-randomized comparison, not a p95 or proof of a 2× general speedup. Schema output still failed cases 1, 12, 21 and 22 on meaning, so the product remains far from universal accuracy. It is now the default **only for the tested Nemotron 3 Super scene planner**; `NEBIUS_SCENE_RESPONSE_FORMAT=default` rolls back to the previous request format. It does not change glyph calls, the scene validator, the browser compiler or the local interpreter. The gold cases are never sent as exemplars to the model.

The [Nemotron 3 Super model card](https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b/modelcard) documents thinking controls (`enable_thinking` and `low_effort`). The [Nemotron 3.5 Lightning model card](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b/modelcard) describes a smaller, speed-oriented model. Our result is **not** a fair model leaderboard: the prompt was written for Super, only three statements were sampled, and no per-model tuning was done.

## What actually happens on the critical path

1. Partial speech can show provisional noun hints, but those hints do not assert a relationship.
2. Final speech or typed text first enters the deterministic local parser. Successful plans compile and paint without a network call.
3. Unsupported language makes one hosted model request. A malformed or validator-rejected response may cause one bounded repair request. Only then may its blueprint change the scene.
4. The client compiles and validates the blueprint. An unfamiliar noun may render as a labelled placeholder while a separate glyph request runs. Glyph generation must never hold up the semantic scene.
5. An **exact repeat in the same scene context** can reuse the session's prior accepted blueprint without another model call. It is recompiled and revalidated on replay. The cache is bounded to 24 entries, cleared when provider settings change, kept only in browser memory, and does not generalize to unseen text.

The live probe shows the provider and possible repair dominate cold-request wall time. Drawing code is not the main source of multi-second delay. Network proximity, queued requests and token count still matter, but should be profiled separately before claiming gains.

## Route to a genuinely responsive, accurate version

- **Keep the truth boundary.** No partial relationship is promoted to a finished diagram until a bounded plan passes structural, source-grounding and client-side validation. Show provisional visuals as provisional. Never exchange a missing arrow for a faster animation.
- **Build a representative latency/quality set.** Run each frozen gold case several times per candidate model/mode and record semantic correctness, repairs, token use, first-token time and full completion time. Include unseen statements and phone visual review. Promote a fast mode only if it meets a predetermined quality floor, not because one example looked good.
- **Reduce avoidable model work.** Measure prompt and output tokens separately. Try a shorter prompt or grammar-constrained output against the *same* gold set; retain rules that protect source/part/whole, negation, direction and force diagrams. One fewer repair is often more valuable than a marginally faster first response.
- **Stream for perception, not false certainty.** If first structured objects arrive well before the last token, render them as labelled drafts while the full blueprint is pending. The final validated graph replaces them atomically. Streaming alone does not reduce time to a trustworthy final scene.
- **Decouple noun art.** Keep preapproved glyphs and editable cached strokes offline, and background-generate unseen glyphs. This improves the final image without delaying the lesson's semantic plan.
- **Measure on Android.** Capture speech-finalization, queue wait, provider first token, provider completion, compile, first paint and final glyph. Publish p50/p95 separately for cold unseen requests, local grammar, exact repeats and warm glyphs. A desktop provider timing cannot stand in for real Android end-to-end latency.
- **Use the new phase split now.** The privacy-safe performance export records whether a sample used the local parser, hosted planner, or session replay, plus bounded provider-attempt count and total provider milliseconds when the backend supplies them. This separates model time from browser paint without exporting the teacher's words. Queue wait and first-token time are not captured yet.
- **Consider model specialization after evidence.** A small fast model could draft or handle a validated low-risk subset, with Super as fallback, but if the draft is often wrong a serial fallback makes both cost and latency worse. A custom trained or distilled model needs a licensed corpus of teacher utterances paired with reviewed semantic graphs and held-out evaluation; it is not a free shortcut to visual correctness.

The near-term product target is immediate honest feedback, then a correct scene as soon as the model finishes. “Anything perfectly doodled instantly” remains the research goal, not a shipped claim.

## Next protocol increment

The hosted blueprint grammar can now carry three more **complete, noun-independent** topologies already available to the local SVG renderer: container→content; caller→function→return point; and moving object↔apex with an accelerating force. Server and browser reject partial or reversed role graphs, and integration tests confirm the real container, control-flow, and changing-speed visual cues with unrelated nouns. This removes a protocol/renderer gap. It does **not** make Nemotron choose the correct graph: a fresh three-case live probe of cases 12, 21 and 22 was **0/3 semantic-ready** (case 21 was rejected after repair). Those model failures remain open and are not counted as product successes.

## Follow-up evidence (28 September 2026)

Source-to-graph checks now request one repair when a confident plan replaces an explicitly stated containment, call-return, or changing-speed relationship with a generic arrow. In a single three-case Nebius probe, case 12 became **semantic-ready after two attempts (27.6 s)**; cases 21 and 22 did not. This is not a visual approval or a stable success rate. A further case-22 probe still failed after about 20 s.

The failed case-21 repair exposed a different bottleneck: our own validator required a containment scene to have *exactly* two objects and one edge. That blocks a valid holder/content subgraph with connected explanatory context. The server and browser now allow that connected context while rejecting orphan objects and mixed specialist layouts. A new case-21 probe returned an accepted but **not gold-ready** plan in one attempt (8.3 s): it omitted the named holder. A source-role check now demands that an explicitly named labelled holder originate the `contains` link. A subsequent single probe was still not gold-ready (13.5 s). None of these measurements shows that an unseen classroom sentence can be illustrated reliably or in real time.

The ignored benchmark report now records bounded plan confidence, mode, object count, connection kinds and the validator's final diagnostic on failure; it does not record the key or raw model output. The next optimization should use those diagnostics across a representative held-out set before changing reasoning mode or timeout. A faster, semantically wrong first response is not a speed win for a teaching product.
