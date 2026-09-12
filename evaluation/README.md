# Language evaluation

`synthetic-language-holdout.json` is a versioned conformance corpus kept outside the production grammar. It checks accepted meanings, expected predicates, valid DoodleScript output, safe clarification, and false-confident acceptance.

It is deliberately labelled **synthetic**. Passing it proves regression behavior for its declared examples; it does not estimate accuracy for real classrooms. A credible accuracy number requires consented, de-identified utterances from teachers who did not author the grammar, frozen before scoring.

Run it with the normal test suite. When real data becomes available, add a separate corpus with provenance, consent scope, language/locale, collection date, and a frozen annotation protocol. Never tune against the final test split.

## Independent semantic-scene gold annotations

`independent-teacher-corpus.md` contains 60 independently written statements and
plain-language intended visuals. `independent-scene-gold-v1.json` is the first
structured development-conformance annotation layer over that frozen corpus. It is
evaluation data only and must never be imported by production language or rendering
code.

The first batch deliberately spans Biology, Physics, Computer Science, Mathematics,
Geography, ambiguity, unresolved reference, and non-visual classroom speech. A draw
expectation declares independently identifiable concepts, directed semantic relations,
a visual grammar, and required visual cues. Clarification expectations declare accepted
reason codes. A hold expectation requires the scene to remain unchanged rather than
treating clarification as success.

The scorer uses exact concept identities: a compound fallback label such as `water
through its roots` cannot satisfy separate `water` and `roots` requirements. Valid
DoodleScript is necessary but insufficient. Missing meaning after validation is counted
as false-confident acceptance. Visual-cue claims cannot hide missing concepts or
relations, and unobserved cues keep drawing cases from passing.

Even complete automated evidence produces only `automatedReady`. Every drawing case
sets `requiresHumanVisualReview`; it passes strictly only when the observation records
an explicit `approved` review. A pending review is not false confidence, while missing
semantic or rendered evidence still is. Tests may exercise the approval transition to
prove the gate, but they do not record a real reviewer decision in the corpus.

These gold annotations make their cases development tests, not a hidden accuracy split.
Add new frozen, independently collected utterances before publishing generalization
figures.

Current automated evidence covers cases 1 (`part-whole-flow`), 2 (`circulation-loop`),
11 (`force-diagram`), 12 (`changing-speed-motion`), 13 (`reflection-ray`), 21 (`labelled-container`), 22
(`call-return-flow`), 23 (`lifo-stack`), 31 (`geometric-construction`), 32
(`fraction-subtraction`), 33 (`triangle-angle-sum`), 41 (`landscape-flow`), 42
(`water-cycle-loop`), 44 (`convergent-plates`), and 51 (`ordered-routine`). All remain human-review
pending, so the strict drawing pass count is still zero. This separation is intentional:
implementation and cue presence can be tested, but visual quality cannot be
self-certified by the code that produced it.

Safety cases 53 and 56 now pass strictly with their expected clarification codes, and
case 60 passes strictly with a validated no-op scene hold. Therefore the complete frozen
batch is 3/19 strict, 19/19 automated-ready, and zero false-confident. All sixteen implemented
drawings remain behind the explicit human-review gate. No visual approval has
been fabricated.

The second development batch froze cases 2, 12, 22, 32, and 42 before their production
grammars were implemented. They specify circulation-loop, changing-speed-motion,
call-return-flow, fraction-subtraction, and water-cycle-loop semantics respectively.
Each declaration names independently scoreable concepts, directed relations, and
visible cues. Until those capabilities exist, safe clarification is recorded as a
failure without being mislabeled false confidence.

Case 2 is automated-ready through the `circulation-loop` grammar. Its four concepts,
three relations, closed-loop topology, anatomy cues, direction cues, and accessibility
meaning are observed from the real component output. It remains human-review pending.
Case 12 is now automated-ready through the `changing-speed-motion` grammar. Its single
moving identity, shared apex, gravity relation, continuous flight path, changing velocity
cues, and accessibility meaning are observed from the real component output. It also
remains human-review pending. The batch currently measures 3/13 strict, 10/13
automated-ready, and zero false-confident. Case 22 is now automated-ready through the
`call-return-flow` grammar, including the main flow, separate function, both directed
arrows, and the exact shared return point. The batch is therefore 3/13 strict and 11/13
automated-ready. Case 32 is now automated-ready through typed numerator/denominator
values, visible initial and removed portions, and a mathematically validated simplified
remainder. Case 42 is now automated-ready through five distinct hydrology identities,
three typed relations, precipitation and infiltration cues, visible underground water,
and an evaporation return that visibly closes the loop. The frozen batch is therefore
3/19 strict, 19/19 automated-ready, and zero false-confident; all sixteen implemented
drawing cases still require real human visual approval.

The third development batch freezes cases 3, 13, 23, 33, 44, and 51 across lifecycle,
reflection, stack, geometry, plate-motion, and routine-sequence meanings. Freezing their concepts, relations, grammar
IDs, and cues before implementation prevents production code from redefining success.
Case 3 is automated-ready through the `lifecycle-sequence` grammar. Case 13 is
automated-ready through computed `reflection-ray` geometry with incident, impact, normal,
surface, and outgoing-ray evidence. Cases 23, 33, 44, and 51 are now automated-ready
through `lifo-stack`, `triangle-angle-sum`, `convergent-plates`, and `ordered-routine`
respectively. Together they preserve all required identities, typed semantic endpoints,
topology metadata, and independently frozen visual cues.

`visual-review-protocol.md` defines the human-only approval criteria. Running
`node scripts/visual-check.mjs` now generates `human-visual-review.html`, a sixteen-scene,
390-pixel review station with explicit approve/reject decisions, required rejection
notes, device metadata, reduced-motion confirmation, and downloadable JSON evidence.
Every export carries a content-derived fixture revision; it never changes gold results
automatically.

## Generated construction-generalization probe

`src/evaluation/constructionGeneralization.test.tsx` generates 66 accepted paraphrase
combinations from independent structural slots rather than copying the frozen corpus
sentences. It spans six reusable construction families: LIFO stack, triangle angle sum,
convergent plates, ordered routine, reflected light, and lifecycle sequence. For every
probe it requires deterministic interpretation, valid DoodleScript, typed relations whose
registry selects the expected specialist layout, and real rendered markup with no generic
object fallback.

Twelve paired near-misses cover missing semantic roles, wrong domains, negation,
uncertainty, duplicate routine stages, and incomplete sequences. They must all clarify.
The resulting 66/66 accepted and 12/12 safely clarified checkpoint is a broad development
regression test. It is not a hidden, independent, or real-teacher accuracy measurement and
does not change the frozen gold result of 3/19 strict, 19/19 automated-ready, and zero
false-confident. Human visual approval remains outstanding for all sixteen drawings.

## Foundational construction-generalization probe

`foundationalGeneralization.test.tsx` adds 136 unique variations across part/whole intake,
circulation, force diagrams, changing-speed trajectories, labelled containers, call/return,
angle measurement, fraction subtraction, landscape flow, and the water cycle. Its 19 near-
misses require clarification for missing roles, uncertainty, negation, wrong domains,
invalid arithmetic, unresolved self-reference, or incomplete loops. The matrix found and
fixed two real defects: self-referential container content and collapsed identities when a
removed fraction and remainder have the same numeric value.

This remains generated development conformance, not a hidden classroom split. Combined
with the newer-family matrix, the checkpoint covers 202 supported variations and 31 safe
near-misses across all sixteen specialist layouts.

## Local render-time evidence

The combined generated 202-input workload drives `runtimeEnvelope.test.tsx`, so performance
cannot be measured against easier phrases than semantic conformance. After warming all
paths, it records 606 samples and separates interpretation, validation, immutable scene
application, SVG serialization, and total local-ready time. The suite fails at coarse
anti-regression limits: 75 ms decision p95, 100 ms SVG-serialization p95, 150 ms local-
ready p95, or 500 ms for any single local-ready sample.

This is serialized-SVG evidence, not browser paint or physical Android proof. The app's
device panel measures commit and paint separately and exports a versioned 50-sample report
containing timing, input source, outcome, and device capability only. Teacher statements,
scene content, partial speech, and final transcripts are not exported.
