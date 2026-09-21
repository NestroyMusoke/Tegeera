# Curating Tegeera's offline noun glyph pack

The offline pack lives in `src/glyphs/offline-pack.json`. It is intentionally empty
until drawings have passed visual review. This is content, not a list of classroom
sentences or a parser branch: a reviewed noun glyph can be reused in any relation,
layout, or lesson.

## Candidate-to-pack workflow

1. Add concrete nouns to `nouns.txt` (optional synonyms after `|`). Run
   `npm run glyph-pack` to see the dry-run count. VTracer's Node/WASM tracer is
   bundled as a development dependency. To generate candidates, set
   `OPENROUTER_API_KEY` in your shell, then run
   `npm run glyph-pack -- --execute --model YOUR_IMAGE_MODEL --max-images 10`.
   This makes image API calls that may cost money. Concurrency is four, failed
   candidates retry, and `.visual-check/manifest.json` resumes completed work.
   `--mode binary` is the default; `--mode color` quantizes into Tegeera's six
   palette colors. The bundled Node/WASM VTracer uses speckle filter 4,
   path precision 2, and curve simplification. The image-model request is
   billable unless your selected provider explicitly offers a free endpoint;
   verify current pricing before using `--execute`.
   Complexity failures remain failed candidates, not silently broken glyphs.
   If image API credits are unavailable, use `npm run glyph-pack -- --local-images
   PATH_TO_PNG_FOLDER --max-images 10`. Name each PNG after its noun slug (for
   example `plant.png`). This runs the same tracer, sanitizer, contact sheet and
   approval path with no image API calls. It does not support automatic revision;
   review and redraw failed local artwork yourself.
   Optional `--vision-review --vision-model YOUR_VISION_MODEL` renders the
   normalized SVG back to a 64px PNG and sends that actual candidate to a
   vision model for a silhouette check. A failed first check triggers one
   revised image, re-tracing, and one second check, then rejects it if it still
   fails. This can add several paid requests per noun, including retries. It is
   off by default; neither check replaces human contact-sheet approval.
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
times out after 12 seconds, streams complete validated point-strokes as they
arrive, and caches only compiled schema-validated glyphs in IndexedDB. A short
edit sends the current in-memory stroke list and returns bounded add/replace/
remove operations; it never accepts executable code or unrestricted SVG.
Those cached glyphs are **not** human-approved or shipped as part of the offline
pack. Partial speech can speculatively prefetch nouns; Prepare a lesson asks a
planner for up to 30 likely nouns, then queues them. Both can incur API usage.
No API key, transcript, or raw model response is stored in the glyph cache.

## Testing with a personal OpenRouter key

For local development and developer smoke tests, put `OPENROUTER_API_KEY=...`
in the root `.env.local` file (gitignored), then run `npm run dev` or
`npm run test:live:glyph`. Vite reads it server-side and enables the local
AI bridge automatically; the Node smoke-test runner reads it separately.
Neither path bundles the key into the website or Android app. On the public
static site, the optional manual **AI understanding** field remains until a
private backend is deployed; it holds each visitor's key in browser memory
for that session only.
Never put a private key in `VITE_` variables, GitHub Actions variables, or a
public Pages deployment.

The scene request uses OpenRouter's free-model router. Stroke, edit, and lesson
requests currently target `google/gemma-4-31b-it:free`; free availability can
change or be rate-limited. The app keeps a labelled placeholder and reports a
429 instead of presenting that placeholder as a completed doodle. The live
smoke test is opt-in and may consume free quotas. Image and vision checks in
the pack builder are separate, potentially billable requests and are never
part of the default test command.
