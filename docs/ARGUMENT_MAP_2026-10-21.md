# Source-preserving concept / argument view — 21 October 2026

## What changed

Tegeera can now present an explanation as linked, readable panels rather than
forcing abstract ideas into the existing positive-only object scene grammar.
This first version maps the **source text**, not an inferred logical argument.
It is not a legal-analysis engine, fact-check, or completed illustrated explainer.

- Original wording and punctuation are retained, with source offsets for each panel.
- English wording cues identify definitions, comparisons, conditions and questions.
  These headings are explicitly described as cues, not authoritative classifications.
- Negative words are highlighted without turning them into positive assertions.
- Every link means **reading order**, never evidence, causation or agreement.
- A question stays open. A claim stays attributed to the user's explanation.
- Processing is local; creating this map needs no provider, key, or model credits.
- Explicit concept mode suppresses speculative speech glyph generation; auto mode
  suppresses it once the interim transcript qualifies for the map path.
- Normal object drawings keep their existing safety gates. This does not enable
  negated physical relationships in the SVG object grammar.

## Try it

Use **Visual format → Automatic**, then paste the law paragraph. It maps to four
panels, including an open final question even though it ends with a full stop.
Use **Concept / argument map** to map a single statement explicitly. Use **Object
drawing** to retain the object-planner route. Working local object instructions
take priority over automatic map routing.

Maps share the existing Undo history. Submitting a map cancels any older model
request. A new object drawing can replace a map, and Undo restores the map.
The existing 500-character bound stays in place; at most eight panels are drawn.
Longer sequences within that input bound are grouped, never silently truncated.

## Verification and limits

The computer-use browser check submitted the user's exact law paragraph through
the real form and inspected it at a roughly 319 px viewport. All four panels were
readable, with the negative wording and final open question visible. A fresh
business argument then replaced it; an ordinary car drawing worked afterward;
Undo restored the business map and then the law map without refreshing.

Automated tests cover multiple domains, exact source reconstruction, bounds,
negative wording, safe HTML escaping, repeated drawings, Undo, and a late model
reply after a map replaces its pending request. No law-specific production rule
or bundled law diagram was added. The law paragraph appears only in tests.

The first full client run recorded 764 passed, 3 optional skipped, and one failed
timing check: an unseen-object cold render took 126.01 ms against a 100 ms limit.
Other build/test work overlapped that run; this is not evidence that the latency
guarantee is met under load. The timing threshold was not changed.

After the final changes, a separate targeted run passed all 40 tests: 20 map and
workflow tests plus 20 glyph-resolver tests. Its unseen-object cold render measured
73.81 ms. This resolves that check on the rerun, not the general risk of slower
devices or concurrent load. Both observations are retained here.

TypeScript, lint, production build, the unchanged bundle budget and Android web
sync passed. The new presentation code initially exceeded the main-chunk budget;
splitting the visual presentation layer resolved that without raising the limit.
This reorganizes loading; it does not claim to reduce total transferred bytes.

Remaining work: semantically inferred concept relationships, attributed evidence
and counterclaims, illustrated abstractions, richer editing, broader language
coverage, and native phone/microphone verification. Source preservation alone is
not proof that a sentence's logical role has been understood.
