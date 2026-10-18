# Larger enclosure composition and successive explanations

## What failed and changed

Three fresh live statements tested an astronomer/telescope/moon, an aquarium
with a pointing child and cat below it, and a cabinet with a violin plus three
surrounding objects. Expected graphs were withheld from the planner.

The cabinet initially lost nesting because five objects exceeded the layout's
capacity. A new regression reproduced that failure. The layout now supports
one holder, one content identity and three connected contextual objects. It uses
bounded reusable slots rather than noun-specific templates. Spatial constraints
and body collisions prune partial candidates before they grow.

Position checks now use the displayed enclosure extent: “beside” aligns with its
visible center, “below” clears its bottom, and surrounding objects cannot overlap
the enclosure or its title area. Existing body/canvas gates remain in place.
Search is bounded to six enclosure placements and eight slots per context object,
with at most three context objects. It is not an unbounded scene solver.

A second failure appeared during replay: the nearest collision-free layout had
an unroutable connector caption. The compiler now tests connector visibility
during layout selection and tries alternatives before rejecting the scene.
This includes the existing attention conversion, so a valid pose is not mistaken
for a generic arrow that needs routing. All final validation still applies.

## Fresh live results and inspected drawings

| Statement | Live elapsed | Result and limits |
| --- | ---: | --- |
| Astronomer beside telescope, looking at moon above it | 7,294 ms | Person and telescope render; moon remains a labelled placeholder. No artwork improvement claimed. |
| Aquarium contains fish, child beside pointing, cat below | 11,868 ms | Fish remains inside; child now aligns beside the visible enclosure; cat clears its bottom. Aquarium remains a schematic box. |
| Cabinet contains violin, musician left looking, chair right, clock above | 13,316 ms | Saved-response replay now nests violin and retains all surrounding identities; clock remains a placeholder and above-connector takes a long detour. |

Three requests used three provider attempts total. Replays used no additional
model calls. Initial and updated static PNGs were inspected. Graph completeness
was 3/3, not visual approval. Natural artwork consistency, subtle gaze, long
connector paths and inference time remain limitations.

## Workflow verification

A new mounted-app test submits the five-object explanation, replaces it with
camera/violin, uses Undo to recover the exact original canvas, then resubmits the
second explanation. It reuses the accepted plan, making only two interpretation
requests. No refresh is needed. This uses a mocked provider and the real form,
compiler, renderer, history and cache; it is not a real browser or phone test.

Browser automation was attempted but failed initialization with
“failed to write kernel assets … os error 3.” No browser, APK, phone or deployment
verification is claimed. The broader full-suite results are recorded in
`NVIDIA_BUILD_STATUS.md`. Backend and provider configuration were unchanged.

## Follow-up performance work, 18 October

The broad benchmark did not exercise this five-object input. A separate 12-sample
compile/validate/static-SVG replay measured a 137.59 ms first render and 40.62 ms
median. The shared layout selector was validating every candidate before ranking.
It now ranks first and tests pure validation callbacks in score order, stopping
at the first valid candidate. The optimum and tie-breaking rules are unchanged.
A regression first failed (all three candidates validated in input order), then
passed (best rejected, next accepted, worse candidate never validated).

The same 12-sample diagnostic after that change measured first/max/p95 104.21 ms
and median 25.45 ms. These are observations from small local runs, excluding module
load, inference and screen paint, not a controlled benchmark or a guarantee of
sub-100 ms performance. In particular, the first render still missed 100 ms.
The final full suite is rerun after this shared-selector change.

Final rerun: 723 client tests passed, three optional smoke tests skipped; both
isolated performance tests passed (834 samples, p95 15.38 ms, max 29.32 ms).
The unseen-noun cold-render check passed at 28.25 ms without changing its budget.
These broad timings do not replace the slower five-object diagnostic above.
Lint, TypeScript, build, bundle budget and Android web sync passed. Main chunk
508.33 kB, with Vite's existing advisory warning. Backend was unchanged/not rerun.

Ignored evidence: `.visual-check/composition-workflow-oct17.json`, its render
folder, cabinet/aquarium replay reports, and `cabinet-before.png`,
`cabinet-after.png`, `aquarium-before.png`, `aquarium-after.png`, `astronomer.png`.
