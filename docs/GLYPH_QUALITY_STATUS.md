# Glyph quality and live-priority findings (29 September 2026)

This is a development record, not a launch claim. Tegeera's approved offline glyph pack is still empty. Runtime unknown nouns are labelled, emoji-previewed when an exact CLDR match exists, or shown as unapproved generated drafts. A validated SVG or stroke sequence is **not** proof that a person can recognize the object.

## Measured experiments

- On `motor`, `fan`, and `iron nail`, Nemotron's previous thinking-mode stroke path took roughly 18–27 seconds per noun and yielded no usable motor and unrecognizable fan/iron drafts (see `NOVEL_SCENE_PROBE.md`).
- The same stroke path with Nebius thinking disabled and JSON output returned structurally valid fan and iron-nail drafts in about 1–2 seconds, while motor still failed. Visual inspection still rejected both drafts. A later prompt experiment also failed all three; it was rolled back.
- A more expressive curve-path JSON experiment produced three structurally valid drafts in about 2–4 seconds, but the motor looked like a generic box, the fan like a clip, and the nail had the wrong orientation. This path was **not** integrated into the product.
- The Nebius image-generation endpoint returned HTTP 404 for the tested Flux Schnell request, and the account's model listing exposed no image models. The image-generation route is not assumed available for this account.
- A free Quick, Draw! fan sample produced a review sheet with several legible and several misleading human strokes. None was imported into the shipped pack. The review UI now presents a true 64 px preview and asks for a blind guess before revealing the target. [Google's source dataset](https://github.com/googlecreativelab/quickdraw-dataset) is CC BY 4.0 and must retain attribution.

## What changed in product code

Nebius glyph requests now use non-thinking JSON mode by default, while **scene understanding keeps its existing reasoning mode**. This reduces the time to a draft; it does not make the draft good. Generated strokes still require approval before becoming reusable cached artwork. Two-point line details are valid, but zero-length strokes are rejected.

Visible scene nouns now outrank queued lesson-preparation and interim-speech prefetch jobs. If all generation slots are occupied by speculative work, one speculative job is cancelled and rescheduled after the visible noun. The scene render path still never waits for glyph generation. This is a scheduling guarantee, not a guarantee of provider latency or artistic quality.

The Quick, Draw! intake now orders candidates by a blend of stroke economy and similarity to other human sketches of the same category, then prioritizes visually different examples before filling the review sheet. This is a mechanical shortlist, **not** a recognition score. A fresh bounded fan sample put several clearer fan silhouettes near the top, but none was added to the shipped pack. The blind-review form locks the guess before revealing the noun and import refuses an approval without the recorded guess, a match attestation, and all four visual checks. A reviewer can still be mistaken; this does not replace testing with teachers or students.

## Practical next quality gate

Build a small licensed/offline pack through blind 64 px review, starting with nouns from real lessons rather than a hardcoded diagram list. Import only artwork a human can name without its label and that survives the existing four checks. Measure recognition with teachers and students, then use those failures to refine style, retrieval, or model choice. The 345-category Quick, Draw! collection is useful candidate material, not a universal vocabulary and not automatically safe artwork.

Reproduce the bounded runtime-art probe with `npm run probe:glyph-quality -- --fast`. Review ignored `.visual-check/glyph-quality-probe/contact-sheet-fast.html` and PNG previews. Candidate sheets and model experiments do not change the approved pack. For Quick, Draw! candidates, run `npm run glyph-pack:quickdraw -- --noun fan`, review `.visual-check/quickdraw/contact-sheet.html`, and import only explicit decisions with a named human reviewer through the existing CLI.
