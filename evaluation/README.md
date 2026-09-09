# Language evaluation

`synthetic-language-holdout.json` is a versioned conformance corpus kept outside the production grammar. It checks accepted meanings, expected predicates, valid DoodleScript output, safe clarification, and false-confident acceptance.

It is deliberately labelled **synthetic**. Passing it proves regression behavior for its declared examples; it does not estimate accuracy for real classrooms. A credible accuracy number requires consented, de-identified utterances from teachers who did not author the grammar, frozen before scoring.

Run it with the normal test suite. When real data becomes available, add a separate corpus with provenance, consent scope, language/locale, collection date, and a frozen annotation protocol. Never tune against the final test split.
