# Composed explanations and colour fidelity — 12 October 2026

## Fresh tests before implementation

Four new statements were annotated in `evaluation/composition-probes-oct12.json`
before their live Nebius calls. Expectations were not supplied to the model.

| Case | First live structural result | Model time | Visual finding |
| --- | --- | --- | --- |
| Butterfly above flower; bee beside flower | 3/3 roles, 2/2 endpoints | 7,280 ms | All three provisional drawings visible; spatial arrangement preserved. |
| Red cup beside blue book; flower above cup | 3/3 roles, **0/2 endpoints** | 5,866 ms | Confident plan silently omitted both relations and placed the flower below. Outline cup ignored its colour; qualified book became an emoji. |
| Student holds key; bird beside student | 3/3 roles, 2/2 endpoints | 8,839 ms | Spatial relation preserved, but holding remains an arrow, not a convincing hand/key contact pose. |
| Key below book below cloud | 3/3 roles, 2/2 endpoints | 7,356 ms | Compiler corrected the reversed suggested vertical coordinates. All objects visible. |

This was **3/4 structurally complete on the initial run**, not four visual passes.

## Implemented fixes

- Added a small shared spatial-clause grounding module used by the existing
  backend and browser normalization/validation paths. It binds uniquely named
  objects to explicit spatial predicates; it has no scenario or drawing registry.
- Missing unambiguous ordinary links can be restored locally without another
  model call. An existing contradictory relation is diagnosed, not overwritten.
  Equivalent inverse edges remain valid. The operation is idempotent.
- Questions, uncertainty, negation, pronoun-only references, duplicate/ambiguous
  names, and intervening prose do not license inferred links. Low-confidence
  plans and extensions are not automatically completed. Specialist diagrams
  keep their existing construction rules.
- A regression caught ambiguous "over": "pull a sled over snow" does not imply
  hovering above the snow. Bare "over" is deliberately excluded from automatic
  completion; explicit posture wording may still resolve it.
- A validated outline-only glyph now uses the entity's stated colour for its
  strokes. Filled glyphs retain their detail colours and recolour only the
  primary fill. Saved glyph data is not mutated.
- A declared leading colour can be removed when looking up an exact native
  noun, so "blue book" uses the book rig. Compound meanings such as "blue family
  tree" and "red book cover" are not converted into tree/book rigs.

The failed cup/book response was replayed through these fixes with **zero new
API calls**. Both links were restored; all objects rendered without labelled
placeholders. Browser inspection confirmed red cup strokes, a blue book, the
flower above the cup, and a horizontal cup/book pair.

## Transfer check and inspection limits

A fifth sentence was annotated only after the fix, before its first live call:

> A green umbrella rests next to a yellow ladder, with a cloud above the ladder.

It preserved 3/3 roles and 2/2 directed endpoints on its first call (**8,430 ms**)
and used three provisional sketches, with no labelled placeholders or emoji.
This is one transfer example, not evidence of unlimited language coverage.
Total provider calls for this run: **five**; no paid glyph generation or vision
screening was performed.

The desktop browser-control helper failed to initialize twice. Installed Edge
was then run headlessly with isolated temporary profiles to inspect saved
HTML produced by the real compiler and canvas. These are browser-rendered
static review pages, **not the mounted interactive app or a phone test**.
The narrow screenshot was clipped; it does not establish mobile readiness.
The static rasterizer also does not reliably reproduce browser CSS colours,
so browser evidence, not its black-looking fill, was used for colour inspection.

Ignored local evidence:

- `.visual-check/composition-oct12.json` — original four calls, including failure.
- `.visual-check/composition-oct12-fixed.json` — saved failed plan replay.
- `.visual-check/composition-oct12-fixed-render/browser-colours.png` — corrected browser drawing.
- `.visual-check/composition-oct12-transfer.json` — fifth live call.
- `.visual-check/composition-oct12-transfer-render/browser-narrow.png` — limited narrow-view evidence.

## Verification and remaining gates

- **664 client tests passed**, three optional live smoke tests skipped.
- **57 backend tests passed**, including a mocked single-call repair and isolated
  container import test for the new shared module.
- **25 hosted-evaluation tooling tests passed**.
- **2 isolated performance tests passed**: 278 local probes / 834 samples;
  SVG-ready p95 **10.81 ms**, maximum **23.24 ms**. Excludes speech, model/network
  time, browser paint and physical-device scheduling. Host-load differences
  prevent attributing cross-run speed changes solely to this patch.
- Lint, TypeScript/Vite build, bundle-size check and Android web sync passed.
  Main JS: 496.58 kB (149.47 kB gzip), budget measurement 484.94 KiB.

Local corpus coverage remains **26/60 = 43.33%**, unchanged by this hosted-path
patch. No overall completion percentage is inferred. Cold model calls still
take seconds. Long-tail artwork, physical poses, mounted-app/mobile behavior
and real-phone verification remain open. Server-side changes require a backend
restart/redeployment; a Git push alone does not restart a running service.
