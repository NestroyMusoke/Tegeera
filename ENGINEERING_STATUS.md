# Visual understanding: first increment

The aim is broad natural explanation-to-visual understanding. This increment
introduces composable object descriptions, shared resources, personal ownership,
ordinal references and atomic multi-clause interpretation. It is a small grammar,
not a general language model. Passing its tests is not an estimate of accuracy
on arbitrary speech or classroom explanations.

## Try through the normal input

1. Three students share two books.
2. Another student arrives, but she already has her own book.
3. Highlight the second student.
4. Remove the first book.
5. Undo using the existing button.

Counts, object types and sharing/ownership are composed independently. Teachers,
learners, people, cars, books, houses, trees and related aliases use the same path.
All entities retain their positions when adding others. The current conservative
layout has ten slots. Overflow asks for a smaller scene instead of silently
dropping objects. The scene is still held in React memory, not persisted to disk.

## Correctness boundaries

- Unrecognised clauses roll back the entire proposed input.
- Negation and conditions are not interpreted as positive commands.
- Ambiguous object references ask for an ordinal or existing label.
- Only complete matching phrases generate scripts. Unsupported words are not ignored.
- The layout gate checks the resulting scene, including moves and clear/create.
- Relationships validate references and version requirements; removal cleans references.
- DoodleScript 1.1.0 adds relationships. Version 1.0.0 scripts remain readable
  with their original fields and empty relationships; unknown versions fail.
- Grammar confidence denotes a matched production, not a calibrated probability
  that an arbitrary user's intended meaning was understood.
- The text relationship key states participants explicitly. SVG brackets indicate
  grouping; complex connector routing, poses and academic rendering are still pending.

## Evaluation

Run `npm test`, `npm run lint`, and `npm run build`. The benchmark reports median
and p95 for 250 interpretation/validation/application iterations. It excludes
microphone latency, transcription, React rendering, animation and SVG painting.
The fixture suite checks meaning and continuity, not just object counts.

Measured on this Windows development session: 39 tests passed; the 250-iteration
meaning pipeline had median 0.38 ms and p95 1.03 ms. This is a local synthetic
measurement, not an Android real-time speech benchmark.

Next evaluation needs independent explanations written by teachers, including
unseen phrasing, with accepted scene graphs and explicit unsupported labels.
Track coverage separately from correctness, false confident interpretations,
correction success and latency. Do not advertise a percentage from the authored
grammar fixtures as real-world accuracy.

## Outstanding work

General language planning/retrieval, pronoun context beyond an unambiguous object,
events and causality, CPU semantics, academic renderers, rich poses, connector
routing, calibrated speech confidence and device benchmarks remain unfinished.
Android speech still uses a system recognition service: its prefer-offline flag
does not guarantee local processing. Native speech must be audited and verified
before presenting it as private/offline production recognition.

No commits or pushes are performed by the agent.
