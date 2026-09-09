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

Current automated evidence covers case 1 (`part-whole-flow`) and case 11
(`force-diagram`). Both remain human-review pending, so the strict pass count is still
zero. This separation is intentional: implementation and cue presence can be tested,
but visual quality cannot be self-certified by the code that produced it.
