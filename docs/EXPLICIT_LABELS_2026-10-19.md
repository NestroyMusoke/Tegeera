# Preserving explicit descriptive words — 19 October 2026

## Reproduced failure and shared recovery

The saved specimen-chamber response from 18 October shortened `transparent
specimen chamber` to `specimen chamber` and `crystalline mineral sample` to
`crystalline sample`. The shared source-normalization path now recovers omitted
words from a complete explicit contains/holds/stores sentence when each existing
object matches uniquely, in word order, with the same final noun.

Recovery copies the teacher's phrase; it does not infer new attributes, add
objects, alter IDs/relations, or draw the named material/texture. It applies to
confident replacement plans only. Compound/uncertain/pronominal descriptions,
competing matches, contradictory label words, unsupported relationships and
phrases beyond the 32-character blueprint limit are left unchanged. This is
deliberately narrower than general language understanding and has no noun list.

Both server and client already use this shared normalization path. The original
saved response now passes its role and annotated relation checks (3/3) without a
new provider call. The PNG shows full descriptive labels, not a newly transparent
chamber or a recognizable mineral drawing. One content placeholder remains.

## New live probes

Two fresh statements used one provider attempt each. Expectations were withheld.

| Statement | Latency | Evidence |
| --- | --- | --- |
| A wicker basket holds a striped scarf. | 10,988 ms | Full labels and holds relationship retained; two stickers, no wicker/stripe artwork or nested depiction. |
| A sealed equipment locker contains a portable measuring instrument. A technician stands to the right of the locker. | 13,384 ms | Full labels, nested content and person on the right. One content placeholder. Strict relation score 1/2 because `to the right of` was not among the annotation's exact alternatives. |

Graph coverage: 2/2. Complete annotated meaning: 1/2; the unlisted valid spatial
paraphrase remains flagged rather than retrospectively counted as a pass. Actual
visual quality is not inferred from either score. Both static PNGs were inspected.
The model latencies do not meet the real-time target. No additional paid retries.

## Regression found during development

The first full client run caught an over-broad phrase match: a sentence containing
`holds a cover as a source releases droplets onto the cover` was absorbed into
one label, exceeding the client schema limit. That run had 747 passed, one failed,
and three skipped tests. Added clause-boundary exclusions and the 32-character
cap, plus a regression test. The 54-test compiler suite then passed, and the
original specimen replay still recovered the intended words.

The backend tests also check no input mutation, stable IDs/relations, idempotence,
unseen nouns, uncertain input, ambiguity and competing descriptions. Missing
artwork, unsupported sentence forms, visual material properties and the prior
provider timeout are not solved by this patch. No phone, browser interaction,
APK or deployment verification is claimed.

Final verification after the fix: 748 client tests passed (three optional smoke
tests skipped), 74 backend tests and 30 evaluation-tool tests passed. Both
performance tests passed: 834 samples, local SVG-ready p95 16.44 ms, maximum
28.98 ms. Final cold unseen-noun check: 35.63 ms. These exclude model calls and
screen painting. Lint, TypeScript, production build, bundle budget and Android
web sync passed. Main chunk 511.37 kB retains the advisory warning.
