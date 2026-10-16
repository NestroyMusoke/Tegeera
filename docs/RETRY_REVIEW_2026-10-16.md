# Retry diagnosis and bounded spatial recovery

## What changed

The existing source-grounded spatial completion skipped any graph with a typed
link, including `contains`. It could therefore request a second model response
for a left/right relationship explicitly present in the teacher's words.

Containment graphs now use the same limited completion as ordinary graphs:
unique existing named roles, positive explicit wording, replace mode, confidence
at least 0.58, and a free connection slot. Existing claims are never overwritten.
Contradictions, uncertainty, negation, ambiguous names, unsupported specialist
mechanisms and graph-size limits retain their previous guards. No noun-specific
branches or new model settings were introduced.

A controlled regression reproduced two unsuccessful provider attempts before the
fix. The identical mocked response now succeeds in one attempt. A client test
checks that the added relation survives compilation and correct layout.

An opt-in internal `onRepair` hook records a bounded reason and first-attempt
duration for local probes. It does not add diagnostics to public API responses,
log keys, or log raw model output. An observer exception cannot break inference.
Probe reports use synthetic text and remain in ignored `.visual-check` files.

## Fresh live evidence

Three new statements used five provider attempts total. Expectations were withheld
from the model. All three SVG outputs were inspected, not just their JSON.

| Case | Attempts | Elapsed | Finding |
| --- | ---: | ---: | --- |
| Case contains camera; photographer on left points at camera | 2 | 13,383 ms | Retry reason: missing or contradictory explicit spatial relation. Schematic case, recognizable camera and person; pointing remains an arrow. |
| Pump sends water through hose into bucket; gardener watches | 2 | 23,879 ms | First response not usable JSON. Pump, hose and gardener remain labelled placeholders. Not a finished illustration. |
| Trunk contains book; guide on right points at book (post-fix) | 1 | 15,995 ms | Recognizable book/person, nested content and correct side. Trunk remains a labelled enclosure. |

The original first responses were not saved, so the first live retry's diagnostic
does not establish whether it was missing versus contradictory. The controlled
regression establishes the missing-link fix. One successful post-fix request is
not an A/B latency result and does not establish that the fix caused its one-call
outcome. Live speed is not solved: even that request took about 16 seconds.

## Verification and remaining work

Backend tests include contradiction/uncertainty guards and an intentionally
throwing diagnostic observer. Hosted-evaluation tooling tests passed 25/25;
targeted client compilation/rendering tests passed 66/66. Final full-suite/build
results are recorded in NVIDIA_BUILD_STATUS.md.

No provider, reasoning-mode, timeout, test threshold or validation gate was
relaxed. No APK, device, deployment or universal visual-accuracy claim is made.
Long-tail artwork, human-role resolution, natural poses, and inference latency
remain important gaps.

Final clean runs: 702 client tests passed (three optional smoke tests skipped),
69 backend tests passed and 25 hosted-evaluation tooling tests passed.
Lint, production build, bundle-budget check and Android web sync passed; the
existing advisory 500 kB chunk warning remains.
