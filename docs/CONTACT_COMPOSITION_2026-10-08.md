# Hosted scenes: physical contact composition

This patch connects hosted semantic relationships to Tegeera's existing character
performance engine. It does not train a model or add sentence-specific examples
to the interpreter. Exact registered contact verbs (hold, carry, touch and their
existing aliases) can now become a pose involving the original target object.

## What changed

- The compiler stages a human performer and object using the existing arm solver.
- Carries reuse the walking performance; holds reuse the holding performance.
- Object identity is preserved; there is no decorative duplicate held object.
- Existing objects are not moved when extending a scene.
- Explicit above/below ordering and remaining connector visibility are checked.
- Conflicting targets, specialist layouts, unmeasurable emoji surfaces and unsafe
  placements retain their original diagram rather than fabricating a pose.
- Optional scene-wide routing checks consider at most 32 contact candidates.
- No additional model call or package dependency is introduced.

## Fresh live evidence

Three new synthetic statements were sent to the configured Nebius model. Expected
roles and links were used for scoring only, never included in the model prompt.

| Statement | Endpoint coverage | API time | Visual inspection |
| --- | --- | --- | --- |
| Gardener carries a watering can; butterfly above a flower | Complete | 6.807 s | Walking performer attached to a watering-can **label**, not a finished can drawing; butterfly and flower provisional sketches |
| Scientist holds a glass flask beside a microscope | Complete | 5.201 s | Holding pose works, but flask is a **label** and microscope is an emoji preview |
| Child touches a balloon; bird above child | Complete | 8.230 s | Initial physical pose missed visible balloon ink because emoji padding differs; final patch retains a relationship diagram for this target |

Saved local evidence: `.visual-check/oct08-contact-live.json` and its render
directory. The corrected balloon replay is in
`.visual-check/oct08-contact-safe-replay-render/`. No additional API call was
needed to reproduce and fix that issue.

A saved four-object umbrella/rain/cloud scene also now shows hand-to-umbrella
contact, preserving both other links. The hand reaches the **edge**, not the
handle: this is not yet a correct ergonomic grip. Its image is in
`.visual-check/oct08-contact-replay-render/r3.png`.

## Verification

- Full frontend run: 555 passed, 3 optional live-provider tests skipped.
- Final safety changes: 52 compiler/contact tests passed, including 13 new contact
  cases. The full suite ran before the final emoji guard and two added tests;
  the targeted run covers those final changes.
- Lint, final production build and bundle-size gate passed. Android web assets
  synchronized successfully; no APK build or phone verification was performed.
- No backend source was changed.
- Real API connectivity was exercised by the three live probes above.
- Separate local performance suite: 278 supported construction probes, 834
  samples; SVG-ready p95 54.40 ms, maximum 112.38 ms. This does not measure the
  new hosted contact compiler, API latency, speech or actual phone paint.

These are engineering checks, not human approval of artwork, production Android
verification, or proof that arbitrary explanations always work.

## Remaining release gates

1. Recognizable artwork for long-tail objects instead of labels; review quality
   without confusing model recognition with human approval.
2. Glyph-specific contact surfaces/grips and consistent motion across platforms.
3. Reliable semantics for unfamiliar multi-clause explanations, not merely valid
   graph endpoints.
4. Hosted latency: the calls above take seconds, not real-time. Local layout speed
   must be reported separately from model/network/speech delay.
5. End-to-end phone tests: consecutive explanations, cancellation, Undo, speech,
   reconnecting, drawing readability and deployed backend availability.

No defensible overall "90% complete" claim follows from this patch. Progress
should be judged against these user-visible gates and a frozen unfamiliar test
set rather than the number of passing unit tests.
