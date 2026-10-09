# Calculated progress, not an invented completion percentage

Run `npm run report:readiness` from the project directory. It executes the current
local interpreter, validator and SVG renderer against all 60 independent teacher
statements, then checks the detailed development annotations. No API key or paid
request is needed. Results and per-case failures are saved under
`.visual-check/readiness/report.json` and `report.md`.

## Baseline: October 9, 2026

| Metric | Calculation | Result | Meaning |
| --- | --- | --- | --- |
| Local drawing coverage | 25 / 60 × 100 | 41.67% | Can construct and render a validator-safe local drawing; not proof of visual accuracy |
| Detailed annotation coverage | 29 / 60 × 100 | 48.33% | Cases with machine-checkable expected results |
| Annotated drawing checks | 25 / 26 × 100 | 96.15% | Expected entities, relations, rendering family and emitted visual markers match |
| Annotated control checks | 3 / 3 × 100 | 100.00% | Two expected clarifications and one hold behave correctly |
| All annotated automated checks | 28 / 29 × 100 | 96.55% | Includes the three controls; not 28 verified pictures |

The existing strict evaluator reports 3/29 (10.34%) without visual approvals;
those three are control cases. **That is not a product completion rate.** Pending
review records do not mean the developer or other people have never tested the
product. This reporting command deliberately does not fabricate or import human
approval records.

These are development-conformance cases, not a blind held-out test. Local results
do not measure the hosted Nebius path. Missing evidence for visual quality, device
readiness or representative hosted latency remains unknown, not a pass or a zero.

The first measurable remaining local failure in the annotated set is case 15:
linear heat propagation is clarified as unsupported. That should be improved
through a reusable propagation grammar, not a sentence-specific exception.

## How future updates should be stated

Use numerator, denominator, percentage and percentage-point change. Keep the same
test set and annotation definitions. A changed denominator is explicitly marked
non-comparable. A SHA-256 fingerprint also detects changed case/annotation contents
even if the count stays unchanged. Percentage-point differences use original
fractions before rounding, not differences between rounded display values.
Scoring-rule changes require a new benchmark version. Never equate more unit
tests with more completed product.

For a defensible overall release score we still need a fixed acceptance contract
covering visual correctness, unseen inputs, real-time latency, speech, repeated
edits, failure recovery, accessibility and phone behavior. Until those criteria
and their evidence are defined, overallCompletionPercent is null. Arbitrarily
weighting incomplete evidence would create a precise-looking but misleading score.
