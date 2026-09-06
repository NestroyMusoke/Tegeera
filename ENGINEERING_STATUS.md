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
with the same code in the ownership detail cards. Text and color are redundant cues;
color alone is not required to identify a group. Unlike the old spanning bracket,
these badges also work across rows and do not imply that intervening objects belong
to an owner. Shared-resource brackets and motion arrows remain separate.

Codes derive from entity order and are display annotations, not permanent IDs.
Transfers preserve codes for remaining owners and update the transferred item's
badge without moving objects. Removing entities can renumber codes consistently.
Undo renders codes from the restored scene. SVG regression checks cover ownership
membership, transfers, sharing, removal and absence of scene mutation.

The quality review found that 10-unit badges shrink to only a few pixels on narrow
screens. Ownership now has responsive detail cards with 14–16 px HTML labels and
the same SVG glyphs used by the scene. These are another view of existing objects,
not additional entities. Multiple ownership relations for one owner are merged
into one card, and shared resources are excluded from personal cards. The scene
overview remains unchanged; its tiny badges are supplementary, not the sole key.

`node scripts/visual-check.mjs` generates four fixtures from the actual parser,
validator, React renderer and stylesheet in the ignored `.visual-check` folder.
It includes a 390 px iframe for narrow-viewport inspection. The fixtures cover
individual ownership, transfer, sharing and mixed ownership. Static browser
screenshots can be captured with an isolated headless Edge profile when the
interactive automation runtime is unavailable. The quality review inspected
individual ownership at a 390 px embedded viewport and transfers at 1280 px.
It caught and corrected mobile horizontal overflow during a spacing refinement.
Fixtures disable animations to inspect the settled frame; animation playback is
not verified by these screenshots. This does not verify app controls,
Android WebView or speech latency. No automatic rearrangement or connector routing
is implemented in this increment. The quality-review suite passes 92 tests.

## Full teaching-screen verification

The input, speech status, clarification and Undo controls now appear between the
scene overview and ownership details, rather than below every ownership card.
Undo and example commands have a minimum 44 px tap height. Two App-level tests
exercise real form submission, transfer, Undo, unsupported-input preservation,
clear and restoration; the complete suite now passes 94 tests.

The visual-check script also bundles the real App into `app-check.html` and runs
the same typed workflow in a browser. `app-phone.html` and
`app-small-phone.html` embed it at 390 and 320 px respectively. Both viewport
checks passed in headless Edge. The fixture asserts control/detail ordering,
no page-wide horizontal overflow and Undo height, and displays PASS or FAIL.
This supplements the static renderer fixtures; it still uses scripted input,
not real touch, a software keyboard, microphone or Android WebView. Settled-frame
CSS disables animation in fixtures only. Device and animation checks remain open.

## Readable scene inspection

The scene now has explicit `Overview` and `Read details` modes. Overview always
fits the complete 1000×620 scene into the canvas. Read details renders that exact
SVG at 1200×744 and contains scrolling inside the canvas, keeping the teaching
controls and page width stable. It opens on the most recent subject (or the first
object) with a complete label visible. Returning to Overview resets both scroll
axes. Changing view is presentation-only: it does not mutate the scene, increment
its revision or consume Undo.

Buttons use `aria-pressed`; the detail viewport is a labelled, keyboard-focusable
region. The browser fixture checks an effective label size of at least 15 px,
internal horizontal and vertical scrolling, initial label visibility, overview
reset, scene equality and absence of page-wide overflow. A 390 px settled-frame
screenshot was inspected. This is a deliberate inspection mode, not automatic
semantic zoom; pinch gestures and Android screen-reader behavior remain unverified.
The complete regression suite now passes 95 tests.

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
