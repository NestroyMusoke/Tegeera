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
11 (`force-diagram`), 12 (`changing-speed-motion`), 21 (`labelled-container`), 22
(`call-return-flow`), 31 (`geometric-construction`), 32 (`fraction-subtraction`), and 41
(`landscape-flow`). All remain human-review
pending, so the strict drawing pass count is still zero. This separation is intentional:
implementation and cue presence can be tested, but visual quality cannot be
self-certified by the code that produced it.

Safety cases 53 and 56 now pass strictly with their expected clarification codes, and
case 60 passes strictly with a validated no-op scene hold. Therefore the first batch is
3/8 strict, 8/8 automated-ready, and zero false-confident. The remaining five failures
are only the explicit human-review gate on the drawing cases; no visual approval has
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
remainder. The batch is now 3/13 strict and 12/13 automated-ready; only case 42 remains
safely unsupported.
