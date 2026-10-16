# Contextual containment — 16 October 2026

## Reproduced failures and shared fixes

1. A three-object scene lost its actual containment layout when it had more
   than two links. The compiler now selects this layout by object topology,
   retaining the existing single holder/content pair plus one context object.
   Extra ordinary links no longer turn `contains` into a generic arrow.
2. The renderer painted content away from its logical slot, while arrows still
   targeted that slot. Rendering and scene-level connector routing now share
   `containedArtworkPlacement`; connector-only projections do not mutate the
   scene or consume history.
3. Recentring only the enclosure could violate an explicit left/right claim.
   The bounded planner now stages its one movable contextual object with the
   enclosure and validates spatial relations before selecting a candidate.

No noun-specific production branches, new dependencies, model changes or extra
runtime API calls were added. Existing collision, canvas and route checks remain.
More than three objects still use the previous generic fallback; multiple or
mixed specialist containment graphs are not newly supported.

## Live evidence and visual inspection

The previous basket/apple/child response was replayed without a model call. It
now nests the apple and aims the contextual arrow at its displayed position.

Two fresh statements from `evaluation/context-containment-oct16.json` used four
provider attempts total. Expectations were not sent to the provider.

- Jar/lemon/teacher on the left: 16,377 ms, two attempts. The initial candidate
  met role/endpoint checks but failed client spatial validation. The exact saved
  response renders after the context-placement fix, with the teacher on the left.
- Cabinet/violin/student on the right: 15,859 ms, two attempts. Initial rendering
  crowded the observer against the enclosure. Replaying after joint placement
  separates them and preserves the right-side relationship.

Actual static SVG PNGs were inspected for all three scenes. Enclosures are
labelled boxes, not subject-specific container artwork. Attention/action links
remain schematic; this does not establish natural poses, realism or universal
visual accuracy. These are static renderer checks, not browser or phone tests.
Live inference latency is not real time.

Local ignored evidence: `.visual-check/context-containment-live.json`,
`context-containment-replay.json`, `context-left-replay.json`,
`context-right-replay.json`, associated render folders and PNGs.

## Verification

Regression tests cover unrelated noun sets, multiple contextual links, actual
contained artwork, left/right constraints, corrected target geometry and scene
immutability. Final verification results are recorded in NVIDIA_BUILD_STATUS.md.
The final clean run passed 701 client tests (three optional smoke tests skipped)
and both isolated performance tests. Local SVG-ready p95 was 33.20 ms across 834
samples, maximum 59.25 ms. An earlier run started before the final planner edit
reported the left-side regression; the clean rerun passed it without relaxing
any checks or changing timeout limits.
Lint, production build, bundle-budget check and Android web sync passed. The
existing advisory chunk-size warning remains. No APK or device run was performed.
