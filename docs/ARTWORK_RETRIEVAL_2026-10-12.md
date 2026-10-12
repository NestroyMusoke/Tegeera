# Offline artwork and mixed spatial placement — 12 October 2026

## What changed

- Added two original-dataset drawings, **bird** and **key**, to the explicitly
  provisional Quick, Draw! tier. The pack now has 17 nouns, previously 15.
  Dataset source IDs and CC BY 4.0 attribution remain attached. Neither drawing
  is recorded as human-approved. No runtime generation or persistence is needed
  to display these previews, including the ordinary plural labels.
  The [dataset licence](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/LICENSE)
  was checked against Google's repository during this run.
- Expanded bounded intake to eight candidates each for clock, key, bridge,
  bus, bird and dog. These are artwork assets, not sentence-specific templates.
- Cross-batch vision screening now reuses identical artwork assessed by the
  same model for the same noun. Stale, failed and mismatched assessments do not
  suppress new screening. Dry runs do not persist reused screening records.
- Pack assembly accepts identical candidates shared across batches, but rejects
  conflicting artwork/provenance and duplicate IDs within a batch. Uncertain
  guesses such as "sun or flower" cannot qualify as matching screening.
- Fixed general lateral placement: explicit "beside", "next to" and "alongside"
  constraints now share a row even when another relation requires a vertical
  correction. "Adjacent to" is not forced horizontal. The rule is independent
  of the nouns and preserves the existing safe-failure behavior if no layout fits.
  Extensions include the existing neighbor's actual row in the bounded candidate
  search; they do not move that existing object to satisfy the new relation.
  Contact-pose staging checks the same lateral relation before accepting a move.
  A nicer pose must not override the stated spatial relationship.

## Actual screening and visual inspection

The first attempt on the old batch made zero calls: all its candidates had
already been assessed. The wider batch reused nine assessments and made twelve
new Nebius vision calls. Five new candidates matched their category: three
birds, one key and one dog. Static inspection selected one bird and the key.
The dog still looked ambiguous, so it was **not shipped** despite its model match.
Clock, bridge and bus remain unresolved by this batch. Model matching is not a
substitute for recognition by users.

Local evidence (ignored, not required at runtime):

- `.visual-check/quickdraw-oct12/candidates.json`
- `.visual-check/quickdraw-oct12/vision-triage.json`
- `.visual-check/quickdraw-oct12/screened.png`

## New live composition and the failure it revealed

Before the live call, `evaluation/artwork-transfer-oct12.json` recorded the
expected roles and directed endpoints for:

> A bird stands beside a key below a tree.

One Nebius interpretation took **5,742 ms** and preserved **3/3 roles and 2/2
directed endpoints**. The rendered scene had **zero labelled placeholders**:
two provisional sketches and the existing tree rig. However, the bird appeared
diagonally above the key, contradicting the intended lateral placement.

After fixing the general spatial constraint, the same saved model response was
replayed with **zero API calls**. Static SVG inspection confirmed a horizontal
bird/key pair with the key below the tree and no visible object overlap. The
local replay reported 6 ms, which is **not** cold-model latency, browser paint
time, or phone performance. The 5.74-second cold call is not real-time speech.

- Before: `.visual-check/artwork-transfer-oct12-render/bird-key-tree.png`
- After: `.visual-check/artwork-transfer-oct12-fixed-render/bird-key-tree.png`

The fixture is now a development regression, not a permanent held-out case.
Tests use unrelated flower/cup/cloud nouns and several lateral predicates to
check that the fix is not specific to the live sentence.

## Progress limits

Local corpus coverage remains **26/60 = 43.33%**, a change of **0.00 percentage
points**. Offline provisional noun count increased **15 → 17 (+13.33%)**; that
is asset coverage growth, not product completion. Overall completion still has
no defensible single percentage. No new APK, physical-phone test, deployment,
or universal visual-quality claim is made by this checkpoint.

## Verification

- Full client suite: **658 passed**, three optional live smoke tests skipped.
- After the final contact-pose safeguard: **75 focused tests passed**, including
  three new contact/lateral regressions. The full suite had loaded the earlier
  contact module; these results are recorded separately, not as a fictitious
  full 661-test run of the final module.
- Backend suite: **51 passed**.
- Artwork pipeline: **26 passed**.
- Isolated performance: **2 passed**; 278 local probes / 834 samples,
  SVG-ready p95 **16.13 ms**, maximum **28.51 ms**. This excludes speech,
  model/network time, browser paint and phone scheduling. Host load differs
  between runs, so it is not evidence that this patch alone caused a speedup.
- Final lint, TypeScript/Vite build, bundle budget and Android web sync passed.
  Main JavaScript: 493.46 kB (148.43 kB gzip); budget measurement 481.90 KiB.
- `git diff --check` passed; line-ending conversion warnings are non-fatal.

An earlier concurrent run loaded the compiler before the off-grid fix and
failed that new regression. The corrected focused test and restarted full
suite passed; the failing intermediate run is not counted as verification.
