# Drawing-aware contact: October 9

## Capability gained

Character contact now uses the visible paths of an available generic SVG doodle,
instead of the fixed rectangle previously used for every generic object. Native
rigs retain their native geometry. Emoji-only objects still use relation diagrams
because font padding is not a reliable contact surface across devices.

The path sampler supports only the existing validated M/L/Q/C/Z language. Curves
use 24 samples per segment. Results are cached by glyph identity in a WeakMap.
This adds no dependency, network request or API charge. Contact is approximate
to sampled ink, not an inferred semantic grip or a physical simulation.

An integration mismatch was also fixed: provisional artwork is now selected
before compiling layout, rather than being added only after layout. This lets
the solver and renderer use the same picture. Provisional provenance remains
explicit; this patch does not turn model-screened sketches into approved art.

## Fresh live tests and visual inspection

Both statements were sent to Nebius once. Expected graph annotations were not
included in model input. After fixes, the saved responses were replayed without
additional model calls.

| Statement | Expected endpoints | Hosted time | Remaining limitations |
| --- | --- | --- | --- |
| A hiker holds a cup while a butterfly flies above a flower. | Complete | 11.302 s | Cup is stylized/oversized; contact is with the outline, not necessarily its handle |
| A student carries an apple while a teacher holds a book. | Complete | 10.203 s | Separate actors and objects retained; consistent object sizing still needs work |

No labeled placeholders appeared in these two scenes. This is not evidence that
all unfamiliar nouns have suitable artwork. Final local review images:

- `.visual-check/oct09-final-i1-render/i1.png`
- `.visual-check/oct09-final-i2-render/i2.png`
- `.visual-check/oct09-final-umbrella-render/r3.png` (saved four-object regression)

The umbrella replay initially exposed a narrow-stem sampling issue and a
preview-before-layout mismatch. Both were corrected and covered by regression
tests. The final hand contacts the canopy edge, not the handle. Correct grips
remain unfinished. Still images do not verify animated contact over time.

## Completion estimate

Final verification on unchanged application source: **569 tests passed**, three
optional live-provider tests skipped; separate live calls are documented above.
Production build, bundle budget, lint and Android web-asset sync passed. The
phone and a newly built APK were not tested. The earlier in-progress regression
run is superseded by this clean final run. No new claim about local end-to-end
latency is made from the hosted-call timings or test execution duration.

**30–40% toward the full open-ended, accurate, real-time vision.** This remains a
rough engineering estimate, not a measured completion percentage. There is no
increase justified by these two examples alone.

Primary remaining gaps: long-tail artwork quality, semantic accuracy on unseen
multi-clause inputs, semantic grips and scale, seconds-long hosted inference,
and release verification on the user's phone. Test counts must not be presented
as a percentage of finished product capability.
