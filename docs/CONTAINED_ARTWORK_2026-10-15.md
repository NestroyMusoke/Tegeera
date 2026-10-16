# Fresh statements → observed failure → shared renderer repair

## What the live tests exposed

Two fresh Nebius statements, `A case contains a camera.` and `A basket contains a yellow lemon.`, produced correct typed containment plans. The renderer nevertheless drew the contents as text cards. In the lemon case the correct colour and available emoji artwork were present in the scene but not used by the specialized containment renderer. Valid graph checks therefore hid a visible fidelity loss.

## General fix

The shared containment renderer now calls the existing EntityGlyph component for contents with available native, validated, procedural, symbol or emoji artwork. It preserves colour and artwork provenance rather than inventing a second noun-to-shape implementation. The content is drawn inside the existing enclosure at a bounded scale, with its label underneath. Unknown abstract concepts keep the existing honest labelled-value fallback. There is no case/camera, basket/lemon, locker/violin or terrarium/butterfly branch in production code.

Six new regression tests cover unrelated nouns, colour, native artwork, supplied glyphs, fallback behavior and scene immutability. Existing entity identity markers are not duplicated, and artwork approval/caching rules are unchanged. No new dependency or art pack was added.

## Fresh tests and unseen follow-ups

| Input | Live time | Outcome |
| --- | --- | --- |
| A case contains a camera. | 5.323 s, one attempt | Correct graph. Saved plan replayed after the fix: camera preview now appears inside the labelled enclosure. |
| A basket contains a yellow lemon. | 7.544 s, one attempt | Correct graph. Before: text card. Same saved plan after: lemon preview inside the enclosure with the requested palette tint. |
| A locker contains a violin. | 3.275 s, one attempt | Unseen post-fix provider call; violin preview visibly nested without adding a noun-specific rule. |
| A terrarium contains a butterfly. A student watches the terrarium. | 5.420 s, one attempt | Unseen multi-clause follow-up; existing provisional butterfly artwork is nested and the observer is preserved. The observer relationship remains a diagram arrow. |

All four matched their literal expected objects/endpoints and rendered. Four paid provider attempts total; camera/lemon replays made no further calls. Actual static PNGs were inspected, including the before/after lemon and each final scene. This is not browser/phone verification or a universal success estimate.

## What this does not solve

- The outer enclosure is still a labelled structural diagram, not an accurately shaped case, basket, locker or terrarium.
- Larger mixed graphs still use ordinary containment arrows; this patch does not claim to implement general nested scene layout.
- The student-to-terrarium arrow uses the existing routing and enters the header area; it is not an embodied gaze animation.
- Existing previews and provisional sketches are not newly approved original artwork. Palette tint on monochrome emoji is not a guarantee of the intended colour appearance across devices.
- Live interpretation still takes seconds. The renderer fix adds no model request and does not claim to make inference real time.

Inputs are committed in `evaluation/containment-art-oct15.json`. Ignored local evidence: `.visual-check/containment-art-before.json`, `containment-lemon-after.json`, `containment-camera-after.json`, `containment-holdout.json`, `containment-context.json`, their saved candidates/HTML and matching PNGs. Final verification totals are in `NVIDIA_BUILD_STATUS.md`.
