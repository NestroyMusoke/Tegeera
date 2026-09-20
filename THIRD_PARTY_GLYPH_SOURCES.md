# Candidate glyph sources and licensing gate

Tegeera 2.27 introduces a source-neutral glyph contract and resolver. No Noto Emoji,
Quick, Draw!, Open Peeps, DiceBear, or Open Doodles artwork is currently bundled.
Adding a resolver tier does not authorize importing its data.

Before any third-party asset enters the repository, record:

- the exact upstream repository and revision;
- the license file at that revision;
- the imported files/categories and any modifications;
- required attribution and redistribution notices;
- a provenance field in the generated glyph-pack manifest.

## Candidates

### Noto Emoji

- Upstream: https://github.com/googlefonts/noto-emoji
- SVG directory license: Apache License 2.0
- Intended role: keyword/CLDR-backed long-tail retrieval after Tegeera's own curated pack.
- Status: candidate only; no assets imported.

### Google Quick, Draw!

- Upstream: https://github.com/googlecreativelab/quickdraw-dataset
- Dataset license: CC BY 4.0
- Intended role: selected recognized, low-stroke human drawings converted into the
  Tegeera glyph contract, with attribution and provenance retained.
- Status: candidate only; no strokes imported.

## Structural references only

Open Peeps and DiceBear may inform taxonomy and component architecture. Tegeera does
not copy their paths, proportions, line weight, texture, or art identity. See
`TEGEERA_POSE_EXPRESSION_SPEC.md`.
