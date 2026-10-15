# Artwork activation and live quality review — 15 October 2026

This is a reliability patch and an unsuccessful artwork-quality experiment, not a finished-product claim.

## Implemented fixes

- When an AI generator becomes available, the resolver now invalidates subscribers. A scene resolved before the connection was ready can enqueue its existing unknown nouns without a new explanation or refresh. Setting the same generator again does not create a notification loop or duplicate work.
- The application disables its generator during effect cleanup, cancelling active generation when the provider changes or the app unmounts. The resolver's existing restart mechanism preserves interrupted work when a replacement provider arrives.
- Stream readers now cancel and release on failure/abort, including when a transport ignores AbortSignal. A 512,000-byte total traffic cap complements the existing line and content caps, preventing unlimited short comment frames. Completed validated strokes remain drafts; no automatic artwork approval was introduced.
- Regression tests exercise late activation, duplicate prevention, oversized open responses, endless short comment frames and abort during a stalled read.

## Live tests, not just mocks

Three fresh statements were sent to the configured Nebius service, one provider attempt each. Input expectations were fixed before the calls and never supplied to the model. Actual static DoodleCanvas PNGs were inspected.

| Statement | Result |
| --- | --- |
| A purple telescope. | 4.529 seconds. Complete object contract; existing emoji retrieval produces a recognizable purple telescope. This is a preview, not newly generated original artwork. |
| A gardener holds a watering can beside a sunflower. | 8.571 seconds. All three objects, but the model attaches `beside` to the can rather than the gardener expected by the probe. The wording admits this attachment ambiguity, so this is not conclusive evidence of a wrong interpretation. The drawing uses a person, a labelled can and a flower preview; holding is an arrow, not convincing physical contact. |
| A sensor measures water in a river. The sensor sends a reading to a computer, and a scientist watches the computer. | 9.599 seconds. Four of six expected nodes; river is omitted, reading remains an edge caption. The resulting four-node drawing is renderable, not a complete mechanism illustration. Sensor and computer remain labelled placeholders. |

All three rendered; only 1/3 met this literal role/endpoint contract. This is neither a general success rate nor product completion. Static scene probes do not execute the mounted app's asynchronous artwork review workflow; its behavior is separately covered by application/resolver tests.

## Direct glyph experiment

Five separate glyph evaluations used seven provider attempts. All returned structurally valid strokes, but that did not establish recognizable artwork:

| Mode / noun | Time | Attempts | Visual inspection |
| --- | --- | --- | --- |
| Current non-thinking / telescope | 2.567 s | 1 | Rectangle with small attachments; not an acceptable recognizable telescope. |
| Current non-thinking / watering can | 1.554 s | 1 | Rough rounded container with handle and short spout; recognizable cues, not polished artwork. |
| Low-effort reasoning / telescope | 4.498 s | 2 | Rectangle with side loops; still unacceptable. |
| Low-effort reasoning / watering can | 1.953 s | 1 | Distorted vessel, ambiguous spout/handle placement; no demonstrated improvement. |
| Low-effort reasoning / seahorse | 7.686 s | 2 | Sparse outline and detached-looking loops; insufficient recognizable anatomy. |

No production reasoning setting was changed, and none of these generated drawings was added to the approved pack. In particular, the existing telescope preview is better than the generated telescope: enabling more generation indiscriminately is not a demonstrated quality improvement.

Local ignored evidence: `.visual-check/artwork-flow-oct15.json`, its saved candidates and HTML, the three `artwork-flow-oct15-*.png` images, and `artwork-oct15/` plus `artwork-low-oct15/` reports/PNGs. The reproducible statement corpus is `evaluation/artwork-flow-oct15.json`.

## Verification caveat and remaining work

The first targeted test run passed 22 tests but failed the existing under-100 ms local-render check at 135.33 ms while other work was running. The isolated rerun passed all 23 tests with the original threshold unchanged. The full-suite run subsequently hit the same threshold at 105.24 ms. The timing failure remains evidence, not something erased by the isolated pass. This is not a guarantee of sub-100 ms on every machine or load level.

The full regression/build result is recorded in `NVIDIA_BUILD_STATUS.md`. No phone, deployment or APK verification is implied. The important remaining blockers are artwork recognition and coverage, complete semantic representations, physical interaction staging and multi-second end-to-end response times. Passing lifecycle tests does not close those gaps.
