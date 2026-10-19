# Enclosure labels and honest artwork counts — 18 October 2026

## Fresh live results — not a clean pass

Three fresh statements were submitted with expectations withheld from the model.

| Statement | Result |
| --- | --- |
| A refrigerator contains a strawberry. | 4,170 ms; graph and annotated containment passed. Schematic enclosure with strawberry emoji, not a refrigerator drawing. |
| A transparent specimen chamber contains a crystalline mineral sample. A researcher stands to the left of the chamber and looks at the sample. | 10,535 ms; model shortened labels to specimen chamber and crystalline sample, losing transparent/mineral. Strict role/meaning checks failed. |
| An emergency medical cabinet contains a portable oxygen cylinder. | Timed out at 42,011 ms; no usable response. Attempt count unavailable. No paid retry was made by the probe after timeout. |

The live graph result remains **1/3**. The successful responses each reported one
provider attempt; the timed-out request's attempt count is unknown. No claim of
real-time interpretation or full modifier preservation.

## Reproduced renderer defect and general fix

Because the medical request timed out, a clearly synthetic offline blueprint was
used to test the renderer independently. It is not a captured model response or
a successful live case. Its long heading and content names visibly overflowed
their plaques in the before PNG.

A shared bounded SVG label component now wraps text inside the existing plaques,
limits line width/height, and retains the full label in accessible metadata and a
title. It reuses the existing bounded word-wrapping helper. Both heading and
text-only contained value use it. Geometry, object locations, arrow routing,
model prompts and noun handling are unchanged. Excessively long labels may still
be abbreviated visually; full labels remain available in metadata.

Before/after synthetic PNGs and the live refrigerator/specimen PNGs were inspected.
The corrected fixture fits both labels. A refrigerator replay retained the nested
strawberry artwork. All replays used zero model calls.

## Audit correction

The prior audit counted ordinary objects only, missing the separately painted
enclosure and contained content. A text-only contained value could report zero
placeholders. Counts now include enclosure/content roles, distinguish schematic
enclosures, and count text-only contents as placeholders. Nested emoji remains a
preview, not approved art. This fixes reporting, not artwork coverage.

The specimen replay now correctly reports one placeholder; the synthetic medical
fixture also reports one. The refrigerator reports two rendered roles, one
schematic enclosure and one emoji, not two approved object illustrations.

Tests cover six short/long/Unicode labels, full accessibility text, bounded SVG
line widths/heights, real-canvas integration without scene mutation, text-only
contained values, and nested emoji counting. Missing modifiers and the provider
timeout remain unresolved. No browser, APK or physical-phone verification.

Final verification: 748 client tests passed, three optional smoke tests skipped;
69 backend and 30 evaluation-tool tests passed. Both performance tests passed:
834 samples, local SVG-ready p95 17.38 ms, maximum 32.88 ms; cold unseen noun
31.09 ms. Model latency and screen painting are excluded. Lint, TypeScript,
production build, bundle budget and Android web sync passed. Main chunk 509.79 kB
retains the existing advisory warning. No deployment was performed.
