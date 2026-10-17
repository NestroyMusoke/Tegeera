# Composing attention without losing meaning

## Reproduced failure and general fix

Fresh live input, “A botanist points at and looks at a flower,” produced two
correct model relationships but a neutral figure with two arrows. The compiler
treated every pair of actions as conflicting. Two regression tests reproduced
that failure, including reversed relationship order.

The shared compatibility rule now permits exactly one pointing action and one
looking action by the same actor at the same target. Both semantic relationships
remain in the scene and accessible relationship list. The renderer chooses the
pointing pose deterministically; that pose already directs gaze at its target.
The validator still rejects duplicate actions, a third action, and incompatible
targets. Waving and physical-contact actions are not collapsed into this pair.
No noun-specific rules, provider changes, dependencies or paid runtime calls added.

## Fresh live evidence

Expectations in `evaluation/attention-composition-oct16.json` were withheld from
the model. Three statements used three provider attempts total:

| Statement | Model time | Static drawing review |
| --- | ---: | --- |
| Botanist points at and looks at flower | 4,325 ms | Before: two arrows and neutral arms. Saved-response replay after fix: aimed arm and gaze, flower artwork, no redundant action arrows. |
| Guide points at mountain while looking at child | 5,728 ms | Two different targets retained as arrows; not falsely collapsed to one pose. Split-direction body/gaze remains unsupported. |
| Glass case contains butterfly, biologist left pointing and student right looking | 7,242 ms | Correct roles/endpoints but containment is an arrow, not nesting. Glass case is a placeholder. This is a known visual failure for the four-object mixed scene. |

All three original static SVG PNGs and the fixed botanist replay were inspected.
The replay used zero additional model calls. These are static renderer checks,
not browser interaction, Android, animation, phone or human-approval evidence.
Graph completeness was 3/3; that is not visual accuracy or product completion.
Live inference remains seconds, not real time. Existing provisional sketch art
was used; this patch does not improve the underlying flower/butterfly artwork.

Local ignored evidence: `.visual-check/attention-composition-oct16.json`, its
render folder, `.visual-check/attention-composition-replay.json`, and
`composition-before.png`, `composition-after.png`, `observers.png`, `guide.png`.

Final automated verification is recorded in `NVIDIA_BUILD_STATUS.md`.

## Verification and remaining performance failure

The full client run had 713 passed, one failed and three optional smoke tests
skipped. The failure was the unchanged 100 ms cold unseen-noun budget: 145.42 ms.
After removing redundant pose projection for scripts without newly created
humans, a focused run had 55 passed and the same timing failure at 137.12 ms
(compile 51.77 ms, SVG 84.61 ms). All 27 grounding and nine targeted-performance
tests passed. This is not a clean full-suite checkpoint, and the timing difference
does not establish a causal speed improvement. No timing threshold was relaxed.

The separate coarse performance envelope passed both tests: 278 probes, 834
samples, local SVG-ready p95 57.50 ms, maximum 133.90 ms. Lint, TypeScript,
production build, bundle budget and Android web sync passed. Main chunk is
506.65 kB; Vite's advisory size warning remains. Backend code was unchanged and
its suite was not rerun in this checkpoint. Cold-start work needs profiling;
neither the performance-envelope pass nor successful build resolves that failure.
