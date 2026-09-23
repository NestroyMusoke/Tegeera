# No-cost doodle candidate intake

The [Quick, Draw! dataset](https://github.com/googlecreativelab/quickdraw-dataset) contains human vector strokes in 345 categories. Its simplified files are published under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The dataset itself warns that moderation may not catch unsuitable drawings. Recognition by Google's game is **not** a Tegeera visual-quality pass. This source covers some common nouns; it cannot make arbitrary speech visual or replace a capable scene planner.

`scripts/quickdraw-candidates.mjs` fetches only a bounded byte range of a category file, filters recognized drawings with safe geometry, normalizes the strokes into Tegeera's 100×100 marker format, and creates a visual review sheet. It does **not** change `src/glyphs/offline-pack.json` during candidate generation. The first dragon sheet was inspected and none was approved automatically: most candidates were too crude or ambiguous. Sun, tree, and book candidates are also available for review in the ignored `.visual-check/quickdraw` folder on this machine.

From Command Prompt in the repository:

```bat
cd /d "C:\Users\X1 Yoga\Desktop\Tegeera_build_1"
npm run glyph-pack:quickdraw -- --noun "leaf" --range-bytes 500000 --limit 16
```

Open `.visual-check\quickdraw\contact-sheet.html` in a browser. The `contact-sheet.png` overview is useful for a quick visual pass; judge candidates at 64 px in the interactive sheet. Four checks are required for each approval: recognizable without a label, readable at 64 px, no inappropriate/misleading content, and Tegeera style fit. Export `quickdraw-decisions.json` from the sheet. Approve **at most one** candidate per noun. If none is good, approve none.

After a genuine visual review, import the downloaded decisions file with your own name:

```bat
npm run glyph-pack:quickdraw -- --import-approved "C:\Users\X1 Yoga\Downloads\quickdraw-decisions.json" --reviewer "Nestroy Musoke"
npm run test:glyph-pack
npm test
npm run build
```

The importer reparses the approved SVG through a strict allowlist, rejects duplicate noun approvals, preserves the dataset URL and drawing ID, updates the offline pack, and writes `GLYPH_CREDITS.md`. The app shows credited third-party sources under “Artwork credits” when such drawings ship. Do not claim the selected strokes are wholly original Tegeera art; the palette and rendering are Tegeera adaptations of licensed contributed strokes. Do not check unreviewed candidates into Git.

The downloaded decisions file is tied to the current `candidates.json` manifest. Generate new candidates and export fresh decisions if you change that manifest. To regenerate the preview without downloading again, run `npm run glyph-pack:quickdraw -- --refresh-sheet`.
