# Relation meaning and connector clearance — 18 October 2026

## Live probes and reproduced failure

Three fresh statements in `evaluation/relation-meaning-oct18.json` made three
provider attempts. Expected roles, links and accepted predicate paraphrases were
not sent to the model.

| Statement | Latency | Observed result |
| --- | --- | --- |
| A magnet attracts a nail. | 4,758 ms | Magnet preview and nail sticker. Motion arrow points toward magnet, deliberately different from grammatical actor-to-patient direction. |
| A filter removes dust from air. A fan pushes air through the filter. | 11,970 ms | Correct annotated relationships, but two nearly parallel arrows visually merged in the first PNG. |
| A moisture sensor measures soil moisture. A controller reads the moisture sensor and activates a pump. A stop button disables the pump. | 7,637 ms | Four annotated predicates retained, with distinct activates/disables arrows. Four objects remain stickers. |

All three passed graph coverage and their limited annotated relation checks.
That is not complete semantic or visual approval: the filter's extra containment
and passage edges are not all annotated, and animation was not assessed.
All three initial PNGs and the fixed filter PNG were inspected.

## Shared renderer fix

The connector router rejected intersecting strokes but allowed almost-parallel
ones to occupy the same visual lane. It now rejects sustained near-parallel
segments less than 12 canvas units apart over at least 24 units of shared span.
Both forward and opposite directions are covered. This is geometry-only: it
contains no object names or lesson-specific branches.

Saved-response replay, with zero additional provider calls, routes the filter's
removes arrow below the scene and back toward the contained dust. Both arrows
remain visible. The route is longer, but no longer visually merged. Tests cover
the low-level clearance condition and a generic enclosure/content arrangement.
The existing bounded routing search remains unchanged; if no candidate is safe,
the existing planner/validation behavior still applies.

## Stronger evaluation, without inflating results

Previously the novel-graph scorer checked only roles and directed endpoints.
Optional corpus `relations` now check explicit accepted visible labels for each
directed pair. Negation, unrelated verbs, and contradictory duplicate edges do
not pass just because the endpoints match. A correct internal kind cannot hide a
wrong visible caption. No fuzzy synonym guessing is used; an unlisted valid
paraphrase may therefore need review rather than automatically passing.

Unannotated cases explicitly report meaning as not checked (`null`), not true.
`graphComplete` remains the structural result; `semanticComplete` only combines
that result with the available annotations. Neither measures full understanding.
Reports and saved review pages expose relation coverage separately.

The three new scorer regression tests failed before the change and passed after.
No model prompts, artwork packs or backend behavior were changed. Missing
artwork, multi-second inference, and physical-phone verification remain open.

## Final verification

- Client: 741 passed; three optional smoke tests skipped.
- Backend: 69 passed. Evaluation tooling: 28 passed; final focused scorer rerun passed.
- Performance: both tests passed, 834 local samples, SVG-ready p95 16.92 ms,
  maximum 82.53 ms. Cold unseen noun 33.47 ms. These exclude model calls and paint.
- Lint, TypeScript, production build, bundle budget and Android web sync passed.
  Main chunk: 509.28 kB, with the existing advisory warning.
- No APK, interactive browser, phone or deployment verification this run.
