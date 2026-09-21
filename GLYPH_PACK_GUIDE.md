# Curating Tegeera's offline noun glyph pack

The offline pack lives in `src/glyphs/offline-pack.json`. It is intentionally empty
until drawings have passed visual review. This is content, not a list of classroom
sentences or a parser branch: a reviewed noun glyph can be reused in any relation,
layout, or lesson.

## Candidate-to-pack workflow

1. Add concrete nouns to `nouns.txt` (optional synonyms after `|`). Run
   `npm run glyph-pack` to see the dry-run count. To generate candidates, install
   the `vtracer` CLI, set `OPENROUTER_API_KEY` in your shell, then run
   `npm run glyph-pack -- --execute --model YOUR_IMAGE_MODEL --max-images 10`.
   This makes image API calls that may cost money. Concurrency is four, failed
   candidates retry, and `.visual-check/manifest.json` resumes completed work.
   `--mode binary` is the default; `--mode color` quantizes into Tegeera's six
   palette colors. VTracer uses speckle filter 4 and path precision 2.
   Complexity failures remain failed candidates, not silently broken glyphs.
2. Check that its silhouette is recognizable **without its label** at both 64px and
   classroom/projector size. Review the static frame and reduced-motion mode.
3. Check the signature features, attachment anchors, color-independent meaning,
   style consistency, and whether the image implies anything the noun does not.
4. Record provenance. Third-party sources require an exact source URL, author,
   license, revision, and any redistribution notices in
   `THIRD_PARTY_GLYPH_SOURCES.md`.
5. Open `.visual-check/glyph-contact-sheet.html` in a browser, inspect at 64px,
   approve/reject each candidate, and download `approved.json`. Import it with
   `npm run glyph-pack -- --import-approved PATH_TO_APPROVED_JSON --reviewer "Your Name" --rights-note "VERIFIED MODEL OUTPUT TERMS"`.
   This writes only approved candidates to `src/glyphs/offline-pack.json`.
   The approval record is an attestation by the named reviewer, not automated
   proof of visual quality.
6. Run `npm test`, `npm run build`, and `node scripts/visual-check.mjs`. Visually
   inspect the resulting scenes on a narrow screen and a projector-class display.

The pack parser rejects unsafe paths, duplicate noun/alias keys, unlicensed
third-party entries without a source URL, and entries missing review evidence.
It supports up to 2,000 entries but no minimum is claimed. A machine-readable
approval record is a gate, not proof by itself that the art is good: the actual
visual inspection remains essential.

Runtime model glyphs are separate from the shipped pack. The non-blocking
resolver returns a sticker immediately, generates at most two glyphs in parallel,
times out after 12 seconds, and caches only schema-validated glyphs in IndexedDB.
Those cached glyphs are **not** human-approved or shipped as part of the offline
pack. Partial speech can speculatively prefetch nouns; Prepare a lesson asks a
planner for up to 30 likely nouns, then queues them. Both can incur API usage.
No API key, transcript, or raw model response is stored in the glyph cache.
