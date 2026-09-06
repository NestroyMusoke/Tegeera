# Visual understanding: individual quantities

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

## Contextual corrections

The second increment adds `Make that four students`, `Change that to three books`,
`They share two books`, and `She gives her book to the first student`.
Conversation focus records subject and object IDs in each scene revision, so Undo
restores context as well as geometry and ownership. Explicit highlights, renames
and moves focus their targets. A singular pronoun requires one recent subject;
gender is not inferred from a name or drawing. This is bounded conversational
reference resolution, not unrestricted discourse understanding.

Count changes apply to the discussed group, preserve retained IDs and positions,
and update its relationship membership. Multiple roles or personal owners require
clarification. Transfers require an existing sole owner and recipient, retain the
object ID and position, and replace its ownership relation. They currently express
the ownership change in the relationship key; physical handover animation remains
unfinished. Existing sharing cannot silently become personal ownership.

DoodleScript 1.2.0 adds explicit context and `unrelate`; 1.0.0 and 1.1.0 continue
to be accepted under their original feature boundaries. Older scenes need no
rewriting: absent context means no remembered subject, and absent relationships
means an empty relation list. Version-specific extensions are rejected when tagged
with an older version. Unknown versions are rejected.

Browser verification covered count correction, arrival, transfer and Undo. The
screen-reader summary also reports ownership changes when object counts stay fixed.

Counts, object types and sharing/ownership are composed independently. Teachers,
learners, people, cars, books, houses, trees and related aliases use the same path.
All entities retain their positions when adding others. The current conservative
layout has ten slots. Overflow asks for a smaller scene instead of silently
dropping objects. The scene is still held in React memory, not persisted to disk.

## Directed motion

DoodleScript 1.3.0 adds single-actor `toward` and `away` relationships.
Try `A car approaches a person`, `Make it go the other way`, and `Stop it`.
Walking is restricted to human figures and driving to cars. The renderer uses
directional arrows, matching facing direction and a walking stance for people.
Reverse replaces the previous direction without recreating either object. Stop
removes the arrow and preserves facing; previous revisions remain available to Undo.
Explicit turns replace motion. Ambiguous actors and self-targets require clarification.

This is a directional illustration, not physical displacement, collision simulation
or continuous movement. Same-row placement and sufficient arrow space are required;
unsupported geometry is rejected. Arrow dashes respect reduced-motion preferences.
Complex connector routing and unrestricted action language remain unfinished.

The motion increment passed tests, lint and production build. Automated SVG checks
cover arrow paths, relationship labels, Stop and rendering a previous revision.
Browser visual inspection was blocked by the local automation runtime; Android
appearance and live speech-to-motion latency have not been verified on a device.

## Individual quantities

`Three students each have two books` and `Three students have two books each`
create three sole-ownership relationships with two distinct books apiece. This
uses existing DoodleScript 1.3.0 ownership semantics; no schema extension is needed.
`They each have a book` uses the recent homogeneous subject group. `The students
each have a book` explicitly selects all existing students, preserving their IDs
and positions. Each command adds new items, not a redistribution of existing ones.

The ten-object limit is checked before allocating individual possessions. Missing
or mixed subject groups, unsupported objects and unspecified collective ownership
still require clarification. Changing a distributed group's total count does not
silently reassign possessions. Explicit transfers continue to preserve item IDs.
These authored grammar tests measure supported cases, not arbitrary-speech accuracy.
Individual-quantities checkpoint: 85 tests passed, including 11 distribution tests.
The local meaning benchmark reported median 0.48 ms and p95 1.23 ms over 250
iterations, excluding speech and rendering. Device verification remains outstanding.

## Visible ownership

Personal ownership now uses matching O-codes beneath the owner and each item,
with the same code in the relationship key. Text and color are redundant cues;
color alone is not required to identify a group. Unlike the old spanning bracket,
these badges also work across rows and do not imply that intervening objects belong
to an owner. Shared-resource brackets and motion arrows remain separate.

Codes derive from entity order and are display annotations, not permanent IDs.
Transfers preserve codes for remaining owners and update the transferred item's
badge without moving objects. Removing entities can renumber codes consistently.
Undo renders codes from the restored scene. SVG regression checks cover ownership
membership, transfers, sharing, removal and absence of scene mutation. Browser
inspection remains blocked by the automation runtime; small-screen readability
still requires a device check. No automatic rearrangement or connector routing
is implemented in this increment.

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

At the first checkpoint: 39 tests passed; the 250-iteration
meaning pipeline had median 0.38 ms and p95 1.03 ms. This is a local synthetic
measurement, not an Android real-time speech benchmark.

Contextual-corrections checkpoint: 55 tests passed. The same local benchmark
reported median 0.44 ms and p95 1.14 ms over 250 iterations; speech and screen
rendering remain excluded. Lint, build and browser interaction checks were run.

Next evaluation needs independent explanations written by teachers, including
unseen phrasing, with accepted scene graphs and explicit unsupported labels.
Track coverage separately from correctness, false confident interpretations,
correction success and latency. Do not advertise a percentage from the authored
grammar fixtures as real-world accuracy.

## Outstanding work

General language planning/retrieval, references beyond the recent explicit focus,
events and causality, CPU semantics, academic renderers, rich poses, connector
routing, calibrated speech confidence and device benchmarks remain unfinished.
Android speech still uses a system recognition service: its prefer-offline flag
does not guarantee local processing. Native speech must be audited and verified
before presenting it as private/offline production recognition.

No commits or pushes are performed by the agent.
