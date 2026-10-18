# Vocabulary lookup and fresh live probes — 18 October 2026

## Reproduced failure and shared fix

An ordinary noun, `constructor`, accidentally retrieved an inherited JavaScript
Object property from the emoji indexes. That function reached rendering as if it
were artwork: React warned and the entity was blank apart from its caption.
Own-property and string-value checks now protect both emoji catalogs and interim
preview extraction. Unknown vocabulary falls back to a visible labeled sticker;
declared people retain their character rig. This is not a noun-specific exception.

Plural retrieval also stopped too early on words ending in `ies`. It now tries
the existing bounded singular candidates against real catalog entries, recovering
words such as `cookies` and `zombies` without adding aliases or artwork.

## Fresh live evidence

The expectations in `evaluation/vocabulary-safety-oct18.json` were withheld from
the planner. Three statements used three provider attempts in total.

| Statement | Model latency | Observed rendering |
| --- | --- | --- |
| A constructor creates an object. | 4,416 ms | Before: blank constructor; after saved-response replay: two visible labeled stickers and a creates arrow. |
| A compiler reads a program and produces an executable file. | 6,135 ms | All three concepts and their relationships represented, but all three use stickers. |
| A basket contains a shell. An otter sits beside the basket and a heron stands to its right. | 11,158 ms | Shell nested in schematic basket, otter emoji alongside it, heron sticker on the right. Sitting/standing animal poses are not depicted. |

All three passed graph completeness checks. That is not a visual-accuracy score.
Static PNGs were inspected; the constructor was replayed after the fix without
another model request. Its placeholder count increased from one to two because
the previously invisible entity now has an honest fallback. Labels inside some
stickers are truncated, with full captions underneath.

## Regression coverage

Six lookup regressions cover plural alternatives, inherited properties, articles,
and modified noun phrases. Two renderer regressions cover unknown vocabulary
and preserving a declared person's rig. The initial unsafe-property tests failed
before the fix; all ten focused emoji lookup tests passed afterward.

Final verification: 731 client tests passed, three optional smoke tests skipped;
both isolated performance tests passed (834 samples, SVG-ready p95 17.09 ms,
maximum 35.88 ms). The cold unseen-noun test completed in 57.76 ms. These timings
exclude model calls, browser painting and phone scheduling. Lint, TypeScript,
production build, bundle budget and Android web sync passed. The 508.43 kB main
chunk retains the existing advisory warning. Backend code was not changed or
retested; no APK, interactive browser, phone or deployment verification occurred.

This patch does not add artwork, accelerate inference, or establish phone/browser
readiness. Programming concepts still need richer visual representations. No
universal drawing success or product-completion percentage is claimed.
