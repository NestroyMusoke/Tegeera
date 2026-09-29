# Unseen-sentence and actual-drawing probe (28 September 2026)

This is a development measurement, not a launch claim. Twelve mixed-topic statements were written and frozen in `evaluation/novel-graph-probes.json`. A seeded shuffle selected statements without sending expected roles or links to Nebius. The graph scorer checks named roles and directed endpoints only. It does **not** check relation predicates, artwork quality, animation, or teacher approval; some natural explanations admit more than one correct graph.

## What failed, and what changed

- The first five selected statements scored **2/5 graph-complete**. On the robot/bridge sentence, the model copied `source` and `destination` from the JSON example rather than representing any teacher noun. Both AI prompts now omit copyable example objects, and a shared source check rejects those unspoken placeholder labels.
- A repaired backend request could previously lose the teacher statement because it kept only the first 6,000 characters of a long prompt. The bounded repair task now explicitly includes the teacher statement and current scene.
- The browser's direct-AI prompt still required exactly two objects for containment, contradicting the updated backend and renderer. It now shares the open graph instruction and allows connected context.
- A sentence with `through X into Y` could stop its arrows at X. When source, passage and recipient are uniquely present, the compiler now adds only missing directed links between those existing roles. This can avoid a second model call. It does not invent a missing object or alter specialist diagrams.
- Ordinary `carries` was misread as a transport-loop-only typed link. A standalone carry action now remains an untyped, labelled relation; closed-loop specialist validation stays strict.

On five *previously untouched* statements after the prompt and repair fixes, the strict role-and-endpoint scorer reported **3/5**. The other two were not automatic successes: one rain/roof/gutter response was rejected for a source-path issue, and one bee/pollen response used a defensible pollen-centered graph that disagreed with the hand-authored edge orientation. A later rain response showed rain→gutter→barrel with roof→rain in one call; the original gold had required roof→gutter, so that gold annotation needs independent adjudication before it can be used as a pass/fail rule. The original report remains unchanged.

The final two untouched statements—battery→motor→fan and magnet→nail—were **2/2 role-and-endpoint complete** and passed the real browser compiler/SVG renderer in one call each. They took roughly **11–12 seconds** each. This is still not real-time. The phone-width still images exposed the larger visual gap: motor, fan and nail were question-mark stickers, not recognizable doodles. The fallback now shows the actual noun instead of `?`, but a labelled placeholder is not the promised artwork.

On 29 September, the rain/roof/gutter/barrel probe was rerun as a targeted regression, not a fresh holdout. The compiler now links an explicitly named origin to its passage as well as the moving material to that passage, and rejects a reversed `originates from` claim. The latest bounded Nebius run produced all four roles and the roof→gutter→barrel path in one attempt (13.5 seconds). Its rendered scene still had **three labelled placeholders out of four objects**. The probe now records `visualAudit.labelledPlaceholders` and `humanVisualReview: pending` so a complete graph cannot be mistaken for a visually approved doodle. This one rerun does not revise the original 3/5 holdout score or prove general accuracy.

The runtime stroke-model probe was worse: motor yielded no valid doodle after two attempts; fan yielded four strokes after about 27 seconds but was not recognizable; the shell split `iron nail` and actually tested `iron`, whose three-stroke result was also not recognizable. Those generated drafts must not be counted as approved art. The local contact sheet is ignored by Git at `.visual-check/glyph-quality-probe/contact-sheet.html`.

## How to reproduce a bounded probe

With a private Nebius key in ignored `server/.env.local`:

```cmd
npm run probe:novel-graphs -- --count 5 --seed 20260928
npm run probe:glyph-quality -- --nouns "motor,fan,iron nail"
```

Each selected item may make two paid model calls. The novel-graph script saves bounded results and actual SVG review pages under ignored `.visual-check/`. Never treat its role/endpoint score as visual approval. Review the rendered page at phone width, including movement and reduced-motion mode in the running app, before claiming a drawing is good.

## The next real bottleneck

The general semantic path can now represent unfamiliar nouns without a canned scenario, but it is not reliably accurate or fast. The runtime stroke generator is not a quality substitute for a curated, licensed, visually reviewed glyph library or a stronger drawing model. Prioritize an art-quality gate with real teacher review, a larger held-out semantic set with independently adjudicated alternative graphs, and Android end-to-end timing. Do not raise the advertised accuracy by counting JSON acceptance or labelled placeholders as successful doodles.
