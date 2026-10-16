# Scene changes, artwork cancellation and fresh probes

## Changes

The app now tells the artwork resolver which nouns belong to its current scene. Replacing or clearing a scene removes queued visible work for obsolete nouns and aborts active requests for those nouns. A provider that ignores cancellation cannot publish its late result or retain a generation slot. This avoids making a new scene wait behind abandoned work; it cannot guarantee a provider refunds already-started requests.

Explicit lesson prefetches and completed review drafts are retained. An immediate Undo can restore a noun while its previous request is still cleaning up: the resolver now notifies subscribers after releasing the slot, allowing that noun to restart. No generated draft is automatically approved or persisted by these changes.

New regression cases cover queued/in-flight cancellation, ignored AbortSignal, no stale publication, preserved lesson work/drafts, and immediate Undo. The existing cold-render test now logs resolution, compilation, scene application and SVG serialization separately. Its 100 ms threshold remains unchanged; timing stops immediately after serialization, before output assertions and diagnostic logging.

## Timing diagnosis

Before the lifecycle changes, the previously failing test measured 51.80 ms in isolation (resolve 0.35, compile 24.31, apply 0.03, SVG 27.12 ms). The final targeted run measured 47.23 ms. These runs did not reproduce the prior 105.24 ms full-suite failure, so this patch does **not** claim to have eliminated cold-start/scheduling variability. Neither measurement includes AI calls, phone scheduling, speech or browser paint.

## Three new live statements

The committed corpus is `evaluation/cold-path-oct15.json`; expectations were written before calling Nebius and were not sent to the model. Each statement took one provider attempt. Actual static renderer PNGs were inspected.

| Statement | Time | Structural and visual result |
| --- | --- | --- |
| An orange octopus. | 4.431 s | Complete single-object plan; existing emoji preview, tinted by the palette. Recognizable simplified icon, not a detailed anatomical illustration or newly generated artwork. |
| A violin is to the left of a drum. | 4.403 s | Both objects and the expected relationship; recognizable existing previews, correctly ordered. |
| A bag contains a thermometer. The bag is on a table. A child stands to the left of the table, and a nurse watches the child. | 10.741 s | All five roles and four expected links. Bag remains a labelled placeholder. Contains/on are diagram arrows rather than physical containment/support; nurse-to-child routing is a long detour. Not a finished scene illustration. |

All three rendered and met the literal role/endpoint checks. This small sample's 3/3 is not a completion score, generalization guarantee or visual-accuracy result. The probes are static scenes and do not execute asynchronous glyph generation; runtime behavior is covered separately by the workflow tests. No new artwork was approved.

Ignored local evidence: `.visual-check/cold-path-oct15.json`, `.visual-check/cold-path-oct15-render/`, and the `cold-path-oct15-*.png` previews. Verification totals are recorded in `NVIDIA_BUILD_STATUS.md` after the final run. No phone/APK/deployment verification is claimed.
