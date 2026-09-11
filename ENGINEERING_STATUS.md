# Visual understanding: individual quantities

> Direction correction: feature-specific grammar stops here. The audited path to
> broad visualization is documented in `OPEN_VISUALIZATION_ARCHITECTURE.md`.
> Existing scenarios remain regression fixtures while interpretation is refactored
> through semantic frames, registries and general visualization plans.

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
object ID, and replace its ownership relation. DoodleScript 1.7 now restages only
the three explicit participants and renders a physical two-person handover. Existing
sharing cannot silently become personal ownership.

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
badge while the handover planner restages its three participants. Removing entities can renumber codes consistently.
Undo renders codes from the restored scene. SVG regression checks cover ownership
membership, transfers, sharing, removal and absence of scene mutation.

The quality review found that 10-unit badges shrink to only a few pixels on narrow
screens. Ownership now has responsive detail cards with 14–16 px HTML labels and
the same SVG glyphs used by the scene. These are another view of existing objects,
not additional entities. Multiple ownership relations for one owner are merged
into one card, and shared resources are excluded from personal cards. The scene
overview remains unchanged; its tiny badges are supplementary, not the sole key.

`node scripts/visual-check.mjs` generates eleven fixtures from the actual parser,
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
Detail centering runs in React's post-layout lifecycle so geometry checks and the
visible frame cannot race an animation callback. The complete regression suite
now passes 103 tests.

## Classroom paraphrase normalization

A bounded normalization layer now removes common conversational framing before
the existing interpreter runs. Examples include `Could you please show me…`,
`There are…`, `We have…`, `I want to show…`, `Let's have…` and `Actually…`.
Continuous motion such as `A car is moving toward a person` maps to the same
validated scene as its direct form. `and then` is an explicit command boundary.
Corrections accept conversational lead-ins and `change it to`.

Normalization does not assign confidence or bypass DoodleScript gates. Tests
compare complete resulting scenes rather than merely checking acceptance. Safety
fixtures ensure negation, uncertainty, conditions and trailing unsupported actions
remain rejected atomically. A full App test covers a polite sharing request and
then confirms a polite negated clear leaves its drawing untouched. This raises
authored coverage, not measured arbitrary-speech accuracy; accent, ASR errors and
unseen phrasing still require an independent teacher corpus and device recording.

## CPU ready queue

DoodleScript 1.4.0 adds `process` and `cpu` entities plus an ordered `queuedFor`
relationship. The canonical workflow is supported through the normal input:

1. `Imagine three processes waiting in a CPU queue.`
2. `Make that four processes.`
3. `Move the CPU to the right.`
4. `What if the second process goes first?`

The first statement draws dedicated process characters, a CPU chip, numbered
queue positions and an arrow toward the CPU. Count correction preserves existing
IDs and compacts one to four processes before the CPU. Reordering changes both
the relationship order and positions while preserving IDs. Undo restores the
previous order. Moving the CPU retains the queue relationship.

The schema, semantic and layout gates reject legacy-tagged queues, non-process
members, multiple CPUs, more than four processes, mixed rows and a CPU placed
inside or before its queue. Nine focused tests cover phrasings, count correction,
movement, reordering, rendering, atomic rejection, schema version and malformed
external scripts. A real-form App test covers all four revisions and Undo.
Headless Edge verified the same workflow at 390 px; the static reordered frame
was inspected separately. This models ready-queue order only—not arrival times,
priorities, execution, preemption, scheduling algorithms or CPU utilization.
The complete checkpoint passes 113 tests; lint, production build and Android
asset synchronization pass.

## Open visualization architecture — Milestone 1, slices 1–2

Language input now crosses a typed semantic-frame boundary before the legacy
interpreter sees it. Each clause retains exact source evidence offsets, a normalized
form, explicit negation/condition/uncertainty signals, confidence and typed slots
for entities, relations, quantities and references. The interpreter consumes these
frames for clause boundaries and normalized text; no new domain phrase branch was
added. Five focused tests cover source round-tripping, normalization, discourse
signals, established multi-clause output, punctuation-only safety and the legacy
failed-clause contract.

The second slice moves concept aliases, number words, ordinals and relationship
verbs into reusable grammar data. Simple descriptions plus sharing and ownership
statements now populate entity mentions, quantity constraints, unresolved references
and relation edges before the legacy adapter creates commands. Equivalent sharing
paraphrases are compared at the semantic-frame level. Missing plural quantities stay
explicitly unresolved instead of receiving an invented count, and polite “could you”
requests are distinguished from uncertain “could happen” statements. No domain
scenario matcher was added. The complete checkpoint passes 123 tests; lint and the
production build pass.

This is not yet a claim of general semantic understanding. Scene-aware reference
resolution and most edit/action command planning still live in the legacy adapter
and remain the next Milestone 1 work.

## Articulated visual system — foundation

Human glyphs now use one reusable SVG skeleton with separate upper/lower limbs,
body lean, head tilt, facial marks and prop layers. Deterministic pose selection
provides neutral stance variation, teachers use an explanatory gesture, and people
with an active motion relation use a stepping pose plus a reduced-motion-safe loop.
This replaces the previous single rigid stick figure rather than adding a set of
story-specific drawings.

Entity rendering now goes through an exhaustive typed registry covering every
schema entity kind, including explicit desk and generic fallbacks. The canvas no
longer contains a chain of entity-kind conditionals. Four focused rig/registry
tests and phone browser assertions cover schema coverage, articulated limbs,
deterministic variation and moving/static behavior. The complete checkpoint passes
127 tests; lint and production build pass. A real 390-pixel render was captured and
inspected.

### DoodleScript 1.5 performance protocol

DoodleScript 1.5 can now carry a partial character performance on create or update:
bounded upper/lower limb angles, body lean, head tilt, smile, mouth opening, brow
lift, gaze, motion loop and intensity. Unspecified parameters inherit a stable base
pose. Plans can be replaced or explicitly cleared, so a stopped action cannot leave
stale animation behind. The renderer exposes the chosen pose and loop as inspectable
SVG metadata and supports none, breathe, walk, run, wave, talk and celebrate loops.

The gates reject out-of-range joints, performance fields on pre-1.5 scripts and
human articulation on non-character entities. Six protocol tests cover versioning,
schema bounds, semantic role safety, immutable updates, partial composition, SVG
execution and clearing. The complete checkpoint passes 133 tests; lint, production
build and Android synchronization pass.

This remains a protocol and renderer foundation, not the finished universal system.
Semantic actions do not yet select these performance parameters, and revision-to-
revision interpolation remains unfinished. Those evidence-backed action mappings
are the next visual milestone.

### Evidence-backed semantic actions

A data-driven action registry now maps verb forms to canonical actions and partial
performance plans. The frame layer extracts actor, action and start/stop phase for
wave, celebrate/cheer, explain/present, talk/speak, walk, run and think families.
These are reusable action operators, not complete-sentence or lesson scenarios.

The adapter can create one or more performers or update an existing label, ordinal,
pronoun or plural group without duplicating it. A matching “stops …” statement
clears the plan; stopping the wrong action or applying human performance to a
non-human object preserves the scene and asks for clarification. Generated action
scripts upgrade to DoodleScript 1.5 while unrelated workflows remain 1.4-compatible.

Six action-registry tests cover alias integrity, tense/polite equivalence, grouped
creation, reference updates, action lifecycle and atomic role rejection. The real
phone workflow also starts and stops a wave through the normal form. The complete
checkpoint passes 139 tests; lint, production build and Android synchronization pass.

### Target-aware performance planning

DoodleScript 1.6 introduces the reusable `actsOn` relationship with an action
predicate and preposition. Targetable action definitions declare whether a target
is optional or required, allowed prepositions, and whether target geometry drives
gaze alone or gaze plus a pointing limb. Point/pointing and look/looking are added
through registry data; waving can optionally target another entity.

The renderer recomputes facing, gaze, head tilt and pointing angle from current
actor/target coordinates on every render. Moving either entity therefore preserves
the semantic gesture without storing stale screen angles. Starting a new targeted
action replaces the actor’s old target; stopping removes both performance and
relationship while preserving the target object. Definite references resolve before
quantity parsing, and ambiguous or multi-object targets trigger clarification.
Legacy decorative teacher props are suppressed while a semantic performance controls
the rig, preventing a fixed prop from floating after a target-driven joint change.

Six focused tests cover frame extraction, DoodleScript 1.6 persistence, live geometry,
existing/ambiguous references, target lifecycle and malformed/legacy validation.
The browser workflow points at an existing book and stops through the normal form.
The complete checkpoint passes 145 tests; lint, production build and Android sync pass.

### Constraint-based spatial staging

Targeted actions now pass through a deterministic two-endpoint staging solver before
their `actsOn` relationship is committed. The solver evaluates the shared placement
lattice for canvas bounds, label-aware collision clearance, vertical alignment,
gesture distance, left-to-right reading order and total movement. This is one reusable
constraint model for every registered targetable action, not a sentence or lesson
preset.

The stability contract is deliberately strict: only entities created by the current
utterance may move. Existing actors, targets and unrelated classroom objects are
anchors. If no valid improvement exists, the planner retains the safe original
placement rather than forcing a bad arrangement. Five focused tests cover deterministic
pair staging, fixed-actor and fixed-target constraints, zero-mutation fallback and a
full interpreter/validator integration case. A dedicated `stagedTarget` browser fixture
starts with a deliberately displaced existing tree and verifies that the newly created
teacher is restaged next to it without moving the tree.
The complete checkpoint passes 150 tests; lint, the production build and Android
synchronization pass.

Target-driven limb interpolation and held/contact props remain unfinished. The next
step is intent-aware contact staging: infer a visual attachment point from renderer
geometry so holding, giving and touching connect hands to props without baking SVG
coordinates into language rules.

### Semantic visual anchors

Every entity renderer now has an exhaustive geometry contract containing an
attention anchor and left/right contact surfaces in glyph-local coordinates. The
registry is keyed by entity kind—not words or lesson scenarios—and converts anchors
to canvas coordinates with the entity's live position and scale. A tree therefore
offers its canopy as the meaningful attention point, a person offers their face, and
a book offers its open pages. Contact surfaces are exposed now as the stable input
for the next inverse-kinematics and held-prop increment.

Targeted performance geometry now starts at the character's actual shoulder after
torso lean, transforms the target into the character's facing coordinate system,
and compensates for the nested torso rotation before setting the arm angle. This
removes the old center-to-center approximation. A forward-kinematics regression test
proves that the rendered pointing ray intersects the semantic anchor to sub-pixel
angular tolerance. Six new tests also cover exhaustive renderer metadata, scaling,
nearest contact surfaces, canopy targeting, both facing directions and immutability.
The complete checkpoint passes 156 tests; the real SVG fixture was inspected at
1200×900 and shows the teacher pointing into the tree canopy. Lint, production
build and Android synchronization pass.

This anchor foundation feeds the bounded contact solver described below.

### Bounded inverse kinematics and contact

The visual system now supports direct-object contact through the same action registry
and semantic-frame path as every other performance. “A teacher touches a book” creates
one teacher, one book and one `actsOn` relationship; it does not draw a decorative copy
of the book. Direct-object syntax is registry metadata, so adding another contact verb
does not require a complete-sentence parser branch.

A dependency-free planar two-bone inverse-kinematics solver computes upper-arm and
elbow angles using the real 22/23-unit renderer segments. It returns an explicit
unreachable result outside the physical interval instead of silently stretching a
limb. Contact geometry selects the nearest registered object surface and transforms
it through entity scale, character facing, shoulder position and torso lean. A
forward-geometry test verifies the rendered hand center lands on that surface.

Contact-aware staging searches bounded half-unit canvas positions, preserves unrelated
objects, minimizes movement and accepts close placement only when visible silhouettes,
labels and arm reach all remain safe. Existing distant entities are not pulled across
an established explanation: validation rejects detached contact with a specific layout
message. Ending contact preserves both identities and releases the object into the
nearest ordinary safe layout slot.

Eight focused tests cover exact IK, unreachable targets, direct semantic extraction,
identity-preserving staging, right- and left-facing contact, visual endpoint accuracy,
reuse across seven target kinds, safe rejection and stop/release lifecycle. The real parser/validator/React fixture was
inspected at 1200×900 and shows the hand meeting the book edge without overlap or a
connector. The complete checkpoint passes 164 tests.
Lint, production build and Android synchronization pass.

### Persistent holding and carrying

`hold` and `carry` are registry-defined direct-object actions built on contact IK.
Both preserve one target entity and expose the carrier ID on its rendered SVG group.
Holding uses a quiet breathing loop; carrying uses a walking performance with a
contact arm, walking legs and motion marks. The attached object's glyph—not its label
or a duplicate—is given the carrier's exact animation timing and travel variables.
Reduced-motion mode disables both animations together.

Directional movement of an attached actor emits equal-delta move commands for the
actor and target, so the physical relationship remains valid after scene edits.
Moving the target away independently is rejected by the contact layout gate. Stopping
an attachment restores ordinary spacing; replacing contact with a non-contact action
also releases the old target before planning the new gesture. These transitions retain
entity IDs and remain atomic through normal DoodleScript validation.

Seven attachment tests cover semantic extraction, identity, holding markup, carrying
motion synchronization, equal-delta movement, detached-target rejection, release and
contact-to-point transition. The complete checkpoint passes 171 tests. Eleven real
component fixtures now include holding and carrying, and the full 430 px browser app
workflow reports PASS after verifying that both carrier and carried-object transforms
change together.

### Identity-preserving person-to-person handover

DoodleScript 1.7 adds a triadic `handover` relationship. `sourceIds` names the giver,
`targetIds` names the recipient, and `objectIds` names the transferred entity. This
avoids overloading a binary ownership edge and makes stored or replayed scripts
unambiguous. The ownership reassignment, participant moves, relationship, and context
are one validated revision, so Undo restores the complete pre-transfer scene.

The generic staging search moves only those three participants, treats every unrelated
entity as a fixed obstacle, and accepts a candidate only when the two people remain
separate and both can safely reach opposite surfaces of the same object. The renderer
then applies the existing exact two-bone solver independently to both characters. No
decorative duplicate is created. A short object lift and directional handover arc
communicate the event; reduced-motion mode keeps the static two-hand pose and disables
the motion.

Seven focused tests cover the versioned role contract, atomic identity preservation,
unrelated-scene stability, cross-vocabulary reuse, sub-pixel hand endpoints, accessible rendering, and legacy
or malformed relation rejection. The complete checkpoint passes 178 tests. The actual
React fixture was inspected at 1280×900: both hands meet the book edges, the giver and
recipient face inward, and the ownership badge reflects the recipient. The full app
workflow at 430 px reports PASS after checking a single object, handover presence, and
Undo cleanup. Animation timing and Android device rendering remain unverified.

### Open-concept temporal and causal graphs

DoodleScript 1.8 adds canonical `before` and `causes` relationships. The semantic
frame recognizes reusable relation aliases: happens/occurs/comes before or after,
and causes/leads to/results in. `after` is stored as a reversed `before` edge, so
rendering and cycle checks consume one temporal meaning instead of parallel cases.

Within those registered slots, concise phrases outside the fixed noun ontology become
generic labeled concept nodes. This supports examples such as evaporation,
condensation, rainfall, heavy rain, and soil erosion without adding scenario nouns.
The opening is deliberately bounded: labels are validated for length and characters,
while unknown predicates, negation, conditions, and uncertainty still preserve the
scene and request clarification.

Connectors derive their endpoints from the registered glyph silhouettes. Temporal
edges are dashed and causal edges are solid with distinct color and marks; both retain
an accessible text key and static meaning when reduced motion is enabled. Exact label
reuse extends a chain without duplicating a concept. Validation rejects self-edges,
duplicate claims, malformed arity, old-version extensions, unreadable geometry, and
directed cycles. Removing an endpoint cleans its edges.

Eleven focused tests cover semantic aliases, open concept construction, article-led
phrases, canonical `after`, chain reuse, paraphrase equivalence, cycles, duplicates,
schema attacks, negation, cleanup, and DoodleScript 1.7/1.8 composition. The complete
checkpoint passes 189 tests. Thirteen actual-component fixtures include timeline and
causality scenes. Desktop captures were inspected, and the 430 px real-app workflow
reports PASS for chain construction, cycle rollback, Undo, causality, accessibility,
and layout. Physical Android rendering and speech-to-event latency remain unverified.

### Topology-aware event graph layout

The DoodleScript 1.8 event representation now feeds a deterministic graph planner.
It gathers only the connected component touched by the proposed edge, topologically
ranks the nodes, and places branches or convergences in up to three readable rows per
rank. Unrelated entities remain fixed obstacles. Already-readable linear timelines
return no move commands, preserving their exact positions; graph restaging is atomic
with the relationship revision.

Layer spacing derives from live label bounds rather than fixed sentence coordinates.
The planner tries multiple vertical bands, rejects canvas clipping and pair overlap,
and selects the valid candidate with the lowest total movement. A combined temporal
and causal cycle is rejected before a script is emitted. A fourth branch is rejected
without mutation when the bounded three-row layout is full.

Connector geometry now supports straight, curved, and outer-lane routes. Adjacent
cross-row edges use smooth curves; an edge that skips occupied ranks travels through a
stable upper lane and cannot cut through the intermediate glyphs. Renderer markup
exposes the selected route for visual and browser verification.

Seven additional tests cover branching, convergence without cloning, deterministic
restaging, compact linear preservation, unrelated-object stability, outer routing,
bounded branch overflow, and mixed temporal/causal cycles. The complete checkpoint
passes 196 tests. Fourteen real-component fixtures include a five-edge diamond graph;
its desktop capture was inspected. The expanded 430 px app workflow reports PASS for
branching, convergence, outer routing, cycle rollback, Undo, accessibility, and page
containment. The current planner remains intentionally bounded to three nodes per
rank and the finite canvas; arbitrary large graphs need semantic zoom or pagination.

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

## Compositional visual symbols

Generic event concepts no longer depend only on an initial-letter bubble. A
versioned local ontology resolves supported labels into a `VisualSymbolPlan` with a
semantic category, anchor primitive, visual capabilities, supporting terms, and a
confidence value. Reusable SVG primitives compose content and overlay roles; generic
capability cues communicate falling, rising, flowing, cycling, compression,
spreading, radiance, and breakage without adding sentence branches to the canvas.

Retrieval is deterministic and conservative. Exact aliases dominate, multiple
descriptive signals can retrieve a concept, equal candidates are rejected, and a
single weak contextual tag cannot make a pictorial claim. Unsupported or ambiguous
concepts retain their visible label and initial-letter node. Registry validation runs
at module startup, while TypeScript's exhaustive primitive registry prevents an
ontology primitive from silently lacking a renderer.

The actual-component atlas covers sunlight, evaporation, rainfall, plants,
electricity, pressure, expansion, damage, and an unknown abstract concept. The
430-pixel end-to-end event workflow verifies composition inside temporal and causal
graphs, identity reuse, safe cycle rollback, outer routing, accessibility text, and
page containment. This remains a deliberately small ontology, not a claim of broad
real-world concept coverage; physical Android appearance and animation remain to be
verified on devices.

The complete checkpoint passes 206 tests across 23 files and generates 16
actual-component fixtures. The final meaning-pipeline run measures 0.73 ms median and 7.74 ms
p95 over 250 iterations, excluding speech recognition, DOM work, and SVG painting.
The production JavaScript is 374.22 kB (115.41 kB gzip), an increase of 9.20 kB raw
and 3.03 kB gzip from the topology-layout checkpoint; CSS is 11.13 kB (3.38 kB gzip).
Lint, production build, Android asset synchronization, and narrow-browser workflow
checks pass. Rollup still prints its pre-existing third-party Zod annotation notices;
project lint itself is warning-free.

## Evidence-backed visual phrases

DoodleScript 1.9 introduces a `visualAction` relation with one subject, one object,
a canonical predicate, and optional registered preposition. A data-driven registry
currently covers absorption, release/emission, production, influence, transformation,
evaporation, and flow. Aliases produce the same semantic frame; no entry contains a
complete teacher sentence or SVG coordinates.

The interpreter resolves both roles through the existing open concept-node boundary,
so later phrases reuse an exact existing identity. The visual direction is independent
of graph roles: absorption draws from object to subject, while output and transformation
draw from subject to object. The planner moves only entities created in the current
utterance, preserves unrelated objects, and rejects an unsafe scene atomically.

Layout validation samples the connector's actual cubic Bézier path against unrelated
glyph bounds, checks action-label bounds against entity labels, and uses a bounded
third narrative row when a continued phrase cannot safely cross an established node.
The renderer adds directional particles and action-specific color while retaining a
static arrow, visible text, relationship-key entry, accessible name, and reduced-motion
behavior. Unknown subjects or objects stay as labelled nodes rather than acquiring an
invented literal symbol.

The complete checkpoint passes 221 tests across 24 files and generates 18
actual-component fixtures. The final meaning-pipeline run measures 1.02 ms median and
10.10 ms p95 over 250 iterations, excluding speech recognition, DOM work, and SVG
painting. Production JavaScript is 382.68 kB (117.35 kB gzip), an increase of 8.46 kB
raw and 1.94 kB gzip from the symbol-ontology checkpoint; CSS is 11.49 kB (3.46 kB
gzip). Lint, production build, Android synchronization, desktop inspection, and the
430-pixel real-app phrase workflow pass. The action vocabulary is deliberately small;
independent teacher-language coverage and physical Android rendering remain unverified.

## Coordinated multi-relation explanation graphs

Visual phrases can now express two or three coordinated objects and a following
subject-elided clause in one atomic revision. The semantic layer expands each object
into its own evidenced mention. Subject inheritance occurs only across an explicit
clause boundary when the preceding frame has exactly one unique subject, and the
derived action records that source frame ID. Negated, conditional, uncertain,
isolated, or ambiguous elisions do not inherit.

The interpreter resolves all identities before planning, reuses a shared subject,
rejects repeated edges, and submits every relation only after the complete layout is
safe. New acyclic components use rendered action direction for topological ranks, so
sunlight and water converge from separate input lanes on one plant and oxygen leaves
through an output rank. Two-node layouts remain centered to reserve expansion space.
Continued explanations preserve every existing identity and validate all retained
curves and labels while searching positions for only the newly introduced concepts.

The planner supports at most three nodes per rank. A fourth coordinated lane is
rejected instead of becoming one misleading compound label. Curve sampling, label
collision checks, canvas bounds, deterministic replay, unknown-symbol fallback,
accessibility text, reduced motion, and atomic rollback remain enforced.

The complete checkpoint passes 225 tests across 24 files and generates 18
actual-component fixtures. The final 250-iteration meaning-pipeline run measures
0.64 ms median and 3.35 ms p95, excluding speech recognition, DOM work, and SVG
painting. Production JavaScript is 387.26 kB (118.76 kB gzip), an increase of 4.58 kB
raw and 1.41 kB gzip from the pairwise-phrase checkpoint; CSS remains 11.49 kB
(3.46 kB gzip). Lint, production build, Android synchronization, desktop inspection,
and the 430-pixel real-app workflow pass. Independent teacher-language evaluation,
physical Android rendering, and cyclic visual-action layout remain unverified.

## Structured clarification and synthetic language evaluation

The interpreter now returns a typed clarification object alongside its legacy
message and failed-clause fields. Stable reason codes distinguish empty input,
negation, conditions, uncertainty, competing meanings, unresolved references,
missing quantities, layout limits, scene conflicts, and unsupported meaning.
Evidence text and bounded alternatives let the UI explain why the scene was
preserved without inventing a drawing. The real App exposes the reason in testable
markup and displays alternatives beneath the clarification message.

Semantic frames now enumerate every matching human-action, relationship, and
visual-action candidate before extraction. More than one distinct candidate marks
the frame unresolved and requests clarification; registry insertion order is no
longer an implicit semantic tie-breaker. Explicit correction, rename, and CPU
scenario commands keep their established meaning while safety words in semantic
positions remain protected.

An 18-case JSON corpus lives outside the production grammar and checks supported
predicates, script validity, expected clarification codes, and false-confident
acceptance. It passes 18/18 with zero false-confident acceptances. This corpus is
developer-authored and synthetic: it is a conformance/regression gate, not an
estimate of performance on real teachers or speech-recognition errors.

The complete checkpoint passes 227 tests across 25 files. The final 250-iteration
local meaning pipeline measures 0.88 ms median and 5.17 ms p95, excluding speech, DOM,
SVG painting, and device work. Production JavaScript is 389.70 kB (119.53 kB gzip)
and CSS is 11.59 kB (3.49 kB gzip). Lint, production build, Android asset sync,
desktop-width graph rendering, phone-width live input, structured negation,
scene rollback, and revision preservation pass. Physical Android and independent
teacher-language validation remain unverified.

## Versioned structural concept registry

The transitional noun table is replaced by a versioned structural concept registry
shared across language extraction, semantic frames, behavioral constraints, and
rendering. Every schema entity kind declares canonical singular and plural forms,
aliases, a semantic category, glyph key, countability, and reusable capabilities.
Human performance, walking, driving, and queue membership now query capabilities
instead of repeating entity-kind lists inside the interpreter.

Noun parsing carries the registry concept ID and category into each semantic entity
mention. The renderer resolves the same concept definition and exposes its ID,
category, glyph key, and registry version in SVG metadata. Startup validation derives
required coverage from the schema and rejects duplicate IDs, kinds, aliases, missing
kinds, or mismatched glyph keys. Adding `table` and `tables` therefore required only
registry data; the production app resolved “Two tables” into two desk glyphs without
a new sentence branch.

The complete checkpoint passes 233 tests across 26 files and generates 19
actual-component fixtures. The final 250-iteration meaning pipeline measures
0.76 ms median and 4.25 ms p95, excluding speech, DOM, SVG painting, and device work.
Production JavaScript is 391.93 kB (120.47 kB gzip); CSS remains 11.59 kB
(3.49 kB gzip). Lint, production build, Android asset synchronization, registry
startup validation, static renderer metadata, and the phone-width live alias workflow
pass. Adding an entirely new structural entity kind still requires a schema entry and
renderer; open event and visual-action concepts continue to use honest generic nodes.
Physical Android rendering remains unverified.

## Versioned relation registry

All ten schema relationship kinds now share one versioned registry contract. Each
definition declares its semantic family, forward aliases, inverse aliases where
applicable, readable label, minimum DoodleScript version, source/target/object
cardinality, directionality, and layout capability. The former relationship word
table is removed from the noun lexicon. `after` remains an explicit inverse alias
of `before`, so extraction reverses its endpoints without adding a schema-only kind.

The validator queries registry version and cardinality rules before running
specialist semantic and geometry gates. Accessible summaries and relationship keys
use registry labels, including predicate-aware labels for targeted performances and
visual actions. Each rendered relation group exposes its kind, family, layout, and
registry version, allowing the browser workflow to prove that the same semantic
contract reached the SVG.

This separation is deliberate: registry layout values select capabilities such as
group, ownership, arrow, queue, contact, event graph, and visual flow, while the
existing specialist planners still prove reach, ordering, cycles, connector space,
and collision safety. Centralizing relation meaning does not weaken those checks or
claim a universal geometry engine.

The complete checkpoint passes 238 tests across 27 files and generates 19
actual-component fixtures. The final 250-iteration meaning pipeline measures
0.82 ms median and 10.26 ms p95, excluding speech, DOM, SVG painting, and device
work. Production JavaScript is 394.76 kB (120.73 kB gzip); CSS remains 11.59 kB
(3.49 kB gzip). Lint, production build, Android asset synchronization, startup
registry validation, legacy scene equality, and the 390-pixel coordinated-phrase
browser workflow pass. The browser fixture also verifies `visual`, `visual-flow`,
and relation-registry version metadata before reporting PASS. Physical Android
rendering and speech latency remain unverified.

## Registered ordered-container language

The CPU ready-queue workflow no longer depends on a CPU-specific sentence regular
expression in the interpreter. The relation registry now owns reusable
ordered-container language templates with two semantic shapes:
`source-verb-target-container` and `target-container-verb-source`. The templates
register lexical components rather than complete lesson sentences, and
`matchRegisteredRelation` binds their source and target text before semantic-frame
population.

The interpreter consumes the resulting `queuedFor` relation and validates its
participants through the reusable `queue-member` and `queue-target` concept
capabilities. Existing correction, reordering, Undo, and queue geometry behavior is
preserved. Consequently, “Three processes wait in a CPU queue” and “A CPU queue has
three processes” extract the same semantic roles and generate the same scene graph.
This removes one brittle sentence parser; it does not claim that every possible
ordered-container concept or spoken paraphrase is supported yet.

The complete checkpoint passes 242 tests across 27 files and generates 19
actual-component fixtures. The final 250-iteration meaning pipeline measures
1.41 ms median and 6.05 ms p95, excluding speech, DOM, SVG painting, and device work.
Production JavaScript is 395.93 kB (121.12 kB gzip); CSS remains 11.59 kB
(3.49 kB gzip). Lint, production build, Android asset synchronization, and the
390-pixel browser workflow pass. The browser fixture verifies registered ordered
relation metadata, queue creation, count correction, CPU movement, reordering,
Undo, and layout before reporting PASS. Physical Android rendering and speech
latency remain unverified.

## Shared constraint-based layout kernel

Milestone 3 now has a reusable deterministic candidate evaluator rather than
separate copies of basic layout safety logic. Every participating family receives
the same hard rejection for canvas clipping, collision with fixed scene objects,
candidate-to-candidate overlap, unknown or duplicate entity identities, and a
family-supplied geometry failure. Accepted candidates are scored for movement from
the current scene and proper connector crossings, then resolved with a stable
coordinate signature so equivalent runs cannot depend on iteration order.

Event graphs and open visual-flow graphs now use the shared evaluator for topology
candidates. Visual-action pairs and ordinary actor-target staging use it for bounded
pair searches with family-specific reading-direction, distance, label, corridor,
and geometry preferences. Connector crossings carry a dominant penalty while
movement remains independently weighted per layout family. Contact, handover,
queue, and motion planners remain specialized because reach, attachment, ordering,
and directional contracts must not be weakened merely to centralize code.

The complete checkpoint passes 245 tests across 28 files and generates 19
actual-component fixtures. The final 250-iteration meaning pipeline measures
2.86 ms median and 20.71 ms p95, excluding speech, DOM, SVG painting, and device
work. Production JavaScript is 396.61 kB (121.40 kB gzip); CSS remains 11.59 kB
(3.49 kB gzip). Lint, production build, Android asset synchronization, diff
integrity, and the real browser teaching workflow pass. The build reports only the
existing third-party Zod annotation notices. Physical Android rendering, speech
latency, and projector inspection remain unverified.

## Versioned layout-family registry

The shared layout kernel no longer receives hidden movement weights from individual
call sites. A versioned registry now defines seven active visual grammars: group,
ownership, arrow, queue, contact, event graph, and visual flow. Each definition owns
its topology, compatible semantic relation families, reading direction, visible-node
capacity, optional rank limit, movement weight, and connector-crossing penalty.
These are reusable visual contracts rather than stored lesson sentences or fixed
scene coordinates.

Relation-registry startup validation rejects an incompatible semantic-family and
layout-family pairing. The event, visual-flow, and actor-target planners identify
their layout family when entering the shared evaluator, so tuning is centralized and
observable. Rendered relationship groups now expose the layout topology and registry
version alongside their existing relation metadata. The browser gate checks those
attributes after building a coordinated plant input/output explanation and then a
water-to-cloud transformation.

The complete checkpoint passes 248 tests across 29 files and generates 19
actual-component fixtures. The final 250-iteration meaning pipeline measures
1.28 ms median and 6.91 ms p95, excluding speech, DOM, SVG painting, and device work.
Production JavaScript is 398.88 kB (122.01 kB gzip); CSS remains 11.59 kB
(3.49 kB gzip). Lint, production build, Android asset synchronization, registry
validation, diff integrity, and the real browser visual-flow workflow pass. The
build reports only the existing third-party Zod annotation notices. Physical Android
rendering, speech latency, and projector inspection remain unverified.

## Capability-based ordered-row planning

The ordered-row path no longer tests for literal `process` and `cpu` kinds in its
semantic validator or renderer geometry. Structural concepts can register queue-member
or queue-target capabilities together with compatible ordered-domain identifiers.
The registry currently proves two independent domains: processes targeting a CPU for
CPU scheduling, and people, students, or teachers targeting a building for a service
queue. Cross-domain combinations are rejected rather than drawn confidently.

`planOrderedRow` receives only the relation roles and current scene. It derives its
columns from the general layout grid, tries bounded rows through the shared `queue`
family evaluator, preserves a valid existing arrangement, treats unrelated entities
as fixed obstacles, and refuses any candidate that fails capability-aware ordered
geometry. Creation, count correction, destination movement, and “goes first” now call
this same planner. The DoodleScript `queuedFor` name remains unchanged for 1.x schema
compatibility, but visible and accessible labels are destination-neutral.

The complete checkpoint passes 250 tests across 29 files and generates 19
actual-component fixtures. The final 250-iteration meaning pipeline measures
1.07 ms median and 8.53 ms p95, excluding speech, DOM, SVG painting, and device work.
Production JavaScript is 400.85 kB (122.55 kB gzip); CSS remains 11.59 kB
(3.49 kB gzip). Lint, production build, Android asset synchronization, registry
validation, diff integrity, and the real browser ordered-row workflow pass. That
browser workflow creates and edits both CPU-scheduling and school-service queues.
The build reports only the existing third-party Zod annotation notices. Physical
Android rendering, speech latency, and projector inspection remain unverified.

## Original character contract and independent language baseline

`TEGEERA_POSE_EXPRESSION_SPEC.md` now freezes the design boundary before further
procedural-rig code. It defines an original rounded-monoline Tegeera identity,
14 semantic poses, 10 combinable expressions, speaking and gaze overlays, separated
SVG layers, contact ownership, deterministic variation, animation channels, reduced
motion, and acceptance gates. Open Peeps informs only pose/expression coverage and
modularity. DiceBear informs only the software pattern of schema-validated named
components and deterministic generation. No external artwork, paths, proportions,
style definitions, or option names are implementation inputs.

The 60-statement independent teacher corpus is stored under `evaluation/` and parsed
only from the test module through a raw text import. Production language registries
cannot read it. Structural tests freeze all 60 unique cases, their six ten-case
subject groups, difficulty distribution, and intended-visual notes. The observational
baseline currently accepts 1/60 and safely clarifies 59/60; every accepted script
passes all DoodleScript gates. This is accepted coverage, not semantic accuracy.
Human review still has to compare accepted graphs with the independent intended
visuals before reporting correctness or false-confident acceptance.

Directional motion has moved from an interpreter-specific sentence regular
expression into the relation registry. Each alias rule owns surface forms, canonical
motion mode, readable label, and optional actor capability. The semantic frame binds
source and target roles, DoodleScript persists the canonical mode, and the validator
independently rejects unknown modes and capability-forged scripts. The same mechanism
supports `move`, `walk`, `drive`, `toward`, and `away` without storing complete lesson
sentences. Geometry remains specialist and continues to reject mixed-row arrows.

The complete checkpoint passes 256 tests across 30 files and generates 19
actual-component fixtures plus the full-app phone workflows. The final 250-iteration
meaning pipeline measures 1.20 ms median and 6.58 ms p95, excluding speech, DOM, SVG
painting, and device work. Production JavaScript is 403.25 kB (123.02 kB gzip); CSS
is 11.59 kB (3.49 kB gzip). Lint, production build, Android asset synchronization,
and the 390-pixel registry-driven motion browser workflow pass. That workflow checks
persisted mode metadata, contextual direction replacement, capability rejection,
atomic rollback, accessibility, and overflow. The build reports only the existing
third-party Zod annotation notices. Human semantic scoring, physical Android
rendering, speech latency, projector inspection, and original pose-sheet visual QA
remain unverified.

## Strict independent semantic-scene scoring

The independent corpus now has a versioned, schema-validated gold layer instead of
only an accepted-versus-clarified counter. Its first eight annotations span Biology,
Physics, Computer Science, Mathematics, Geography, ambiguous meaning, unresolved
reference, and non-visual classroom speech. Expected outcomes distinguish `draw`,
`clarify`, and `hold`; a future correction batch can extend the same contract with
scene setup and `modify` expectations.

Drawing cases declare distinct concepts, directed relations, a visual-grammar ID,
and observable cue IDs. Exact identity matching prevents a compound fallback label
from satisfying multiple concepts. Relation endpoints must name declared concepts,
case IDs must be unique, and forged cue observations cannot hide missing semantics.
A validated script that omits required meaning is explicitly false-confident rather
than partially correct. Clarification receives credit only for an allowed reason;
non-visual speech must preserve the scene rather than merely fail parsing.

The deliberately honest starting result is 0/8 strict passes and one false-confident
acceptance: case 1. The broader observational counter remains 1/60 accepted and 59/60
clarified. Neither number is classroom accuracy, and the annotated eight are now a
development conformance set rather than a hidden generalization set.

The complete checkpoint passes 261 tests across 31 files. A separate 250-iteration
meaning-pipeline run measures 1.76 ms median and 4.76 ms p95, excluding speech, DOM,
SVG painting, and device work. Production JavaScript remains 403.25 kB (123.02 kB
gzip); CSS remains 11.59 kB (3.49 kB gzip). Lint, TypeScript, production build, and
Android asset synchronization pass. No production rendering changed, so the prior
390-pixel visual workflow evidence remains applicable; a new browser snapshot was not
claimed for this evaluation-only build. The build reports only the existing
third-party Zod annotation notices. The remaining 52 gold annotations, human visual
cue observations, physical Android rendering, speech latency, and independent hidden
generalization corpus remain unfinished.

## DoodleScript 2 part-whole-flow construction

Case 1 no longer collapses routed inputs and anatomical parts into compound labels.
The semantic frame now has a registered `part-whole-flow` construction with open slots
for one whole and one to three input/part channels. The action registry, rather than a
lesson sentence, declares which intake actions support part routing. Visual-symbol
capabilities select `flowsInto` for flowing material and `illuminates` for radiating
energy. An unrelated fixture using a machine, fuel, inlet, air, and vent proves the
grammar is not tied to plants.

DoodleScript 2.0 adds `partOf`, `flowsInto`, and `illuminates` relations. The relation
and layout registries move to 2.0.0 and declare a compositional semantic family plus a
left-to-right `part-whole-flow` topology. The symbol ontology moves to 1.1.0 with
original plant and roots primitives, independent leaf meaning, and inspectable visual
cues. A shared candidate search places five distinct concepts, rejects overlap and
invalid connector geometry, preserves pre-existing fixed identities, and clarifies if
the construction cannot fit.

Case 1 now creates `plant`, `roots`, `leaves`, `water`, and `sunlight` as separate
identities. Its four typed relations preserve part ownership and route water to roots
and sunlight to leaves. The renderer exposes visible roots, soil boundary, water-entry
arrow, sun symbol, and leaf-targeted-ray cues. Its gold result is 0/8 strict passes,
one automated-ready case, and zero false-confident acceptances because human visual
approval is mandatory and has not been recorded. Tests exercise—but do not fabricate—
the explicit approval transition.

The complete checkpoint passes 267 tests across 32 files and generates 20
actual-component fixtures plus the full-app phone workflows. A standalone 250-iteration
meaning-pipeline run measures 0.51 ms median and 1.23 ms p95, excluding speech, DOM,
SVG painting, and device work. Production JavaScript is 410.24 kB (124.94 kB gzip);
CSS remains 11.59 kB (3.49 kB gzip). Lint, TypeScript, production build, Android asset
synchronization, registry validation, diff integrity, and the 390-pixel real browser
case-1 workflow pass. The workflow verifies five identities, four relations, all five
cues, accessibility meaning, versioned metadata, and layout. The build reports only
the existing third-party Zod annotation notices. Human visual approval, physical
Android rendering, speech latency, and projector inspection remain unverified.

At the first checkpoint: 39 tests passed; the 250-iteration
meaning pipeline had median 0.38 ms and p95 1.03 ms. This is a local synthetic
measurement, not an Android real-time speech benchmark.

Contextual-corrections checkpoint: 55 tests passed. The same local benchmark
reported median 0.44 ms and p95 1.14 ms over 250 iterations; speech and screen
rendering remain excluded. Lint, build and browser interaction checks were run.

Next evaluation work must annotate the remaining independent statements without
loosening the first batch, then obtain a second frozen corpus from teachers for hidden
generalization measurement. Track coverage separately from correctness, false-confident
interpretations, correction success, visual review, and latency. Do not advertise a
percentage from authored grammar fixtures or development gold cases as real-world
accuracy.

## Outstanding work

General language planning/retrieval, references beyond the recent explicit focus,
large-graph navigation, advanced CPU scheduling semantics, academic renderers, rich
poses, calibrated speech confidence and device benchmarks remain unfinished.
Android speech still uses a system recognition service: its prefer-offline flag
does not guarantee local processing. Native speech must be audited and verified
before presenting it as private/offline production recognition.

No commits or pushes are performed by the agent.

## DoodleScript 2.1 force-diagram construction

Case 11 now uses an open mechanical-role grammar rather than a stored classroom
sentence. The semantic frame binds a body, contact surface, applied force, opposing
force, and direction from reusable push/pull, surface, resistance, and slowing roles.
An unrelated sled/packed-snow/drag fixture exercises the same construction and a
crate/concrete/resistance fixture exercises its validation path.

DoodleScript 2.1 adds `appliedTo`, `opposes`, and `contacts`. The relation and layout
registries move to 2.1.0 with a mechanical family and `force-body` topology. Semantic
force and surface identities stay available to validation and accessibility while the
renderer presents them as physical arrows and a textured contact line rather than
disconnected concept bubbles. The original box primitive, forward push arrow, shorter
opposing friction arrow, surface texture, and motion-loss marks are inspectable cues.

The independent baseline now accepts 2/60 and safely clarifies 58/60. In the strict
first batch, cases 1 and 11 are automated-ready, zero are false-confident, and the
strict pass count remains 0/8 until a human explicitly approves each rendered visual.
This is expanded verified coverage, not a claim of real-classroom accuracy.

The complete checkpoint passes 273 tests across 33 files. The 250-iteration
meaning-only benchmark measured 1.54 ms median and 13.68 ms p95 in the full concurrent
test run; speech, DOM, SVG painting, and device work are excluded. Production
JavaScript is 418.63 kB (127.20 kB gzip); CSS is 11.59 kB (3.49 kB gzip). Lint,
TypeScript, production build, Android asset synchronization, registry validation, and
strict-gold scoring pass. Twenty-one real-component fixtures are generated, and the
390-pixel full-app force workflow passes after visual inspection corrected floor
contact and label hierarchy. The build reports only the existing third-party Zod
annotation notices. Physical Android rendering, speech latency, projector inspection,
and independent hidden generalization remain unverified.

## DoodleScript 2.2 labelled-container construction

Case 21 now resolves through a reusable labelled-containment construction. Open slots
bind the container identity, contained identity, and surface shape vocabulary; the
production grammar contains no complete corpus sentence. A specimen-jar/sample fixture
proves the same path outside programming, while incomplete “box holds value” language
continues to clarify instead of silently assuming a labelled-container lesson.

DoodleScript 2.2 adds a typed `contains` relation and `container`/`contained` visual
roles. The relation and layout registries move to 2.2.0 with a containment family and
`nested-container` topology. The renderer preserves both semantic identities while
showing one closed, original container outline, a prominent container label, and the
content visibly nested inside. Hidden semantic anchors do not leak as duplicate concept
bubbles. The validator independently rejects wrong roles, old schema claims, missing
endpoints, and unsafe nesting geometry.

The independent baseline now accepts 3/60 and safely clarifies 57/60. In the strict
first batch, cases 1, 11, and 21 are automated-ready, zero are false-confident, and
strict passes remain 0/8 pending explicit human visual approval. The 390-pixel real-app
workflow passes identity, relation, cue, accessibility, duplication, and overflow
checks. Visual inspection caught and corrected an initially truncated long SVG outline
before this milestone was accepted.

The complete checkpoint passes 279 tests across 34 files. The concurrent 250-iteration
meaning-only benchmark measured 2.82 ms median and 16.73 ms p95; it excludes speech,
DOM, SVG painting, and device work. Twenty-two real-component fixtures are generated.
Production JavaScript is 423.50 kB (128.39 kB gzip); CSS is 11.59 kB (3.49 kB
gzip). Lint, TypeScript, production build, and Android asset synchronization pass; the
only build notices are the existing third-party Zod annotation notices. Physical
Android rendering, speech latency, projector inspection, and independent hidden
generalization remain unverified.

## DoodleScript 2.3 geometric-construction capability

Case 31 now resolves through an open geometric-construction grammar. It binds an angle
subject and a numeric or word-form degree measure, while analogy text remains optional
context rather than a required sentence fragment. Forty-five-degree and
one-hundred-and-twenty-degree fixtures prove that the construction is not hardcoded to
a right angle; non-angle measurements remain outside this specialist grammar.

DoodleScript 2.3 adds typed `measures` relations and `geometry`/`measurement` visual
roles. The relation and layout registries move to 2.3.0 with a measurement family and
an `angular-construction` topology. The renderer computes the second ray from the
parsed measure. It emits a square marker only when the measure is exactly 90 degrees
and an arc for other angles, while preserving the subject and measure as separate
semantic identities without duplicate concept bubbles. The validator independently
checks roles, endpoints, version support, and finite in-bounds construction geometry.

The independent baseline now accepts 4/60 and safely clarifies 56/60. Cases 1, 11, 21,
and 31 are automated-ready, zero are false-confident, and strict passes remain 0/8
pending explicit human visual approval. The 390-pixel real-app workflow passes true
perpendicular geometry, right-angle marker, degree identity, typed measurement,
accessibility, duplication, and overflow checks.

The complete checkpoint passes 285 tests across 35 files. The final concurrent
250-iteration meaning-only benchmark measured 2.38 ms median and 16.79 ms p95; it
excludes speech, DOM, SVG painting, and device work. Twenty-three real-component
fixtures are generated. Production JavaScript is 428.99 kB (129.77 kB gzip); CSS is
11.59 kB (3.49 kB gzip). Lint, TypeScript, production build, Android asset
synchronization, and browser inspection pass. Physical Android rendering, speech
latency, projector inspection, human visual review, and independent hidden
generalization remain unverified.

## DoodleScript 2.4 landscape-flow capability

Case 41 now resolves through a reusable landscape-flow grammar with independent
watercourse, elevated-source, and water-destination slots. River, stream, creek, and
watercourse vocabulary can combine with registered elevated terrain and receiving
water bodies. A stream/mountain/lake fixture and a water/upland-slope/reservoir fixture
exercise the same construction, while traffic flow and tank-to-bucket flow remain
outside it rather than borrowing misleading geography.

DoodleScript 2.4 adds typed `flowsFrom` and `flowsTo` relations plus `watercourse`,
`elevated-source`, and `water-destination` visual roles. The relation and layout
registries move to 2.4.0 with a landscape family and an `elevation-cross-section`
topology. A shared candidate search places three semantic identities at strictly
descending elevations. The renderer combines the relation pair into one original
cross-section with hill, continuous river, downhill arrow, and receiving-water shape;
the second relation does not duplicate the landscape. Validation rejects incomplete
pairs, shared identities, wrong roles, inverted elevation, and pre-2.4 claims.

The independent baseline now accepts 5/60 and safely clarifies 55/60. Cases 1, 11, 21,
31, and 41 are automated-ready, zero are false-confident, and strict passes remain 0/8
pending explicit human visual approval. The real narrow-browser workflow passes both
typed meanings, all four required cues, accessibility, no-duplication, and overflow
checks; visual inspection confirms the source, descending path, direction, and sea are
readable as one scene.

The complete checkpoint passes 291 tests across 36 files. The concurrent
250-iteration meaning-only benchmark measured 1.30 ms median and 7.55 ms p95; speech,
DOM, SVG painting, and device work are excluded. Twenty-four real-component fixtures
are generated. Production JavaScript is 436.91 kB (131.78 kB gzip); CSS is 11.59 kB
(3.49 kB gzip). Lint, TypeScript, production build, Android asset synchronization,
registry validation, and browser inspection pass. Physical Android rendering, speech
latency, projector inspection, human visual review, and independent hidden
generalization remain unverified.

## DoodleScript 2.5 safety intents and scene hold

Cases 53, 56, and 60 now pass through a reusable safety-intent boundary before
drawable meaning is planned. Anonymous simultaneous comparisons with an undefined
relative rate produce `ambiguous-meaning`; references dependent on an unavailable
earlier lesson produce `ambiguous-reference`; collaborative break-and-resume speech
produces an explicit non-visual scene hold. These are structural patterns with negative
and paraphrase fixtures, not stored corpus sentences.

DoodleScript 2.5 adds a typed `hold` command whose only permitted reason is
`non-visual-speech`. Validation requires it to be the sole command and forbids context
replacement. Applying a valid hold returns the exact prior scene object, preserving
entities, relations, context, scene ID, and revision. The App displays a calm
`Scene held` status and deliberately does not add history, so the existing Undo still
reverts the last actual drawing. Forged mixed commands and pre-2.5 holds are rejected.

The observational corpus now records 5/60 drawn, 1/60 held, and 54/60 clarified. In
the strict first batch, all three safety cases pass; all eight cases are automated-ready;
zero are false-confident; and the total is 3/8 because the five drawing cases remain
pending explicit human visual approval. This is an evaluation improvement, not a
claim of 60-statement visual coverage.

The complete checkpoint passes 298 tests across 37 files. The final 250-iteration
meaning-only benchmark measured 2.28 ms median and 7.73 ms p95; speech, DOM, SVG
painting, and device work are excluded. Twenty-four real-component static fixtures
plus the full-App safety workflow are generated. Production JavaScript is 439.61 kB
(132.56 kB gzip); CSS is 11.83 kB (3.56 kB gzip). Lint, TypeScript, production build,
and Android asset synchronization pass. The App-level test verifies the real form,
status, unchanged SVG, unchanged revision, and unchanged Undo depth. A separate live
browser opening of the local fixture was blocked by the browser's `file://` security
policy, so this milestone does not claim that browser inspection. Physical Android
rendering, live speech behavior, projector inspection, human visual review, and
independent hidden generalization remain unverified.

## DoodleScript 2.6 circulation-loop capability

The second independent gold batch is frozen before its production implementations.
Cases 2, 12, 22, 32, and 42 now declare immutable concept, relation, visual-grammar,
cue, and human-review expectations for circulation, changing-speed motion, call/return,
fraction subtraction, and the water cycle. Their safe clarifications remain visible
failures until each corresponding kernel is implemented.

Case 2 now resolves through an open circulation-loop construction with four roles:
source, destination, transported payload, and return enrichment. The same grammar and
planner accept a pump/filter/water/minerals loop, reject a mismatched return source and
incomplete one-way transport, and contain no complete corpus sentence.

DoodleScript 2.6 adds `pumpsTo`, `returnsTo`, and `carries` relations plus four
circulation visual roles. Both transport paths reference the same payload identity.
The relation and layout registries move to 2.6.0 with a `circulation` family and
`closed-loop` topology. A bounded candidate layout separates the two endpoints, payload
label, and enrichment label. The renderer combines the relation triple into one original
heart/lung scene with blue outbound flow and red oxygenated return flow; generic sources
and destinations use neutral shapes rather than pretending to be anatomy.

Validation independently requires exactly one outbound edge, one reverse edge, a shared
payload, a payload-to-enrichment relation, correct roles, distinct identities, safe
geometry, and DoodleScript 2.6. Forged incomplete, wrong-role, missing-payload, and old
version scripts fail. Reduced-motion styling disables circulation animation.

The observational corpus now records 6/60 drawn, 1/60 held, and 53/60 clarified. The
expanded gold set is 3/13 strict, 9/13 automated-ready, and zero false-confident. Case 2
has complete automated semantic and rendered-cue evidence but remains correctly pending
human visual approval, as do the other five drawing capabilities.

The complete checkpoint passes 304 tests across 38 files. The 250-iteration
meaning-only benchmark measured 1.36 ms median and 11.45 ms p95; it excludes speech,
DOM, SVG painting, and device work. Twenty-five real-component static fixtures and a
full-App circulation workflow are generated. Production JavaScript is 448.82 kB
(134.38 kB gzip); CSS is 11.99 kB (3.61 kB gzip). Lint, TypeScript, production build,
and Android asset synchronization pass. Live browser inspection remains unclaimed
because the browser security policy blocks the local fixture URL. Physical Android
rendering, live speech latency, projector inspection, human visual review, and hidden
generalization remain unverified.

## DoodleScript 2.7 changing-speed motion capability

Case 12 now resolves through an open changing-speed trajectory construction with three
semantic roles: one moving object, one shared apex, and one force. The recognizer treats
the complete ascent, pause, and descent as one atomic frame even though the teacher says
“then”; this prevents a partial ascent from being accepted as a complete explanation.
The same construction accepts different moving nouns and controlled paraphrases such as
`tossed straight up`, `decelerates`, `pauses briefly`, and `increasingly fast`. It rejects
anonymous objects and incomplete trajectories, and contains no stored corpus sentence.

DoodleScript 2.7 adds `risesTo`, `fallsFrom`, and `accelerates` relations plus trajectory
object, apex, and force roles. The relation and layout registries move to 2.7.0 with a
`kinematics` family and `trajectory-profile` topology. A bounded layout keeps the apex
above the same object identity and gravity to its side. The renderer combines all three
relations into one continuous flight path, shrinking upward velocity arrows, an explicit
apex pause, growing downward velocity arrows, and a gravity arrow. It does not create
multiple semantic balls to fake motion samples, and reduced-motion styling disables the
trajectory animation.

Validation independently requires exactly one rise, one fall, and one acceleration;
the rise and fall must share the same object and apex, gravity must target that object,
all roles must be correct, geometry must remain legible, and the script must be 2.7 or
later. Forged old-version, incomplete, wrong-role, and split-apex graphs fail atomically.

The observational corpus now records 7/60 drawn, 1/60 held, and 52/60 clarified. The
expanded gold set is 3/13 strict, 10/13 automated-ready, and zero false-confident. Case
12 has complete automated semantic and rendered-cue evidence but remains correctly
pending human visual approval.

The complete checkpoint passes 310 tests across 39 files. The 250-iteration
meaning-only benchmark measured 1.29 ms median and 10.76 ms p95; it excludes speech,
DOM, SVG painting, and device work. Twenty-six real-component static fixtures and a
full-App changing-speed workflow are generated. Production JavaScript is 457.02 kB
(136.25 kB gzip); CSS is 12.17 kB (3.65 kB gzip). Lint, TypeScript, production build,
and Android asset synchronization pass. Live browser inspection remains unclaimed
because the browser security policy blocks the local fixture URL. Physical Android
rendering, live speech latency, projector inspection, human visual review, and hidden
generalization remain unverified. The next frozen construction is case 22’s reusable
call/return flow.

## DoodleScript 2.8 call-and-return capability

Case 22 now resolves through an open control-flow construction with three independent
roles: caller, function, and call site. The whole call, execution, and return statement
is parsed as one atomic frame despite its conditional “when” opening and “then” boundary.
Reusable variants substitute application/service or program/subroutine nouns, while
mismatched repeated callees and incomplete return descriptions remain unsupported.

DoodleScript 2.8 adds `calls` and `returnsControlTo` relation kinds, with the latter’s
public semantic predicate remaining `returnsTo` for the gold contract. The relation and
layout registries move to 2.8.0 with a `control-flow` family and `control-transfer`
topology. The renderer draws a persistent main execution line, a marked call site, a
separate function block, a downward call arrow, and a curved return arrow landing on the
same marked point. It preserves three semantic identities rather than duplicating the
program or treating the function as a generic speech bubble.

Validation requires exactly one call and one return, a shared function endpoint, three
distinct correctly typed roles, readable vertical separation, and DoodleScript 2.8 or
later. Old-version, incomplete, wrong-role, wrong-return-point, and mismatched-language
fixtures fail without changing the scene. Reduced-motion styling disables both control
flow animations.

The observational corpus now records 8/60 drawn, 1/60 held, and 51/60 clarified. The
gold set is 3/13 strict, 11/13 automated-ready, and zero false-confident. Case 22 has
complete automated semantic and rendered-cue evidence but remains pending real human
visual approval.

The complete checkpoint passes 316 tests across 40 files. The 250-iteration
meaning-only benchmark measured 1.61 ms median and 7.13 ms p95, excluding speech, DOM,
SVG painting, and device work. Twenty-seven real-component static fixtures and a full-App
call-return workflow are generated. Production JavaScript is 464.62 kB (137.85 kB gzip);
CSS is 12.30 kB (3.67 kB gzip). Lint, TypeScript, production build, and Android asset
synchronization pass. Live browser inspection, APK compilation, physical Android
rendering, speech/device latency, projector inspection, human visual review, and hidden
generalization remain unverified. The next frozen construction is case 32’s fraction
subtraction model.

## DoodleScript 2.9 fraction-subtraction capability

Case 32 now resolves through an open fraction-subtraction construction with four
independent roles: whole, starting fraction, removed fraction, and remainder. Fractions
are stored as typed numerator/denominator data rather than inferred again from display
labels. Word forms, hyphenated forms, numeric forms, different wholes, and “slice” as a
same-denominator unit use the same parser. Invalid fractions, over-removal, zero
remainders, and denominator mismatches remain safely unsupported.

DoodleScript 2.9 adds `subtracts` and `resultsIn` relations, fraction metadata, and four
fraction visual roles. The registries move to 2.9.0 with an `arithmetic` family and
`part-removal` topology. The renderer shows the starting divided circle, the removed
portion, and the remaining divided circle as a left-to-right operation. For the corpus
case, three quarters are visibly shaded, one quarter is crossed out, and two quarter
sectors remain while the result label is simplified to one half.

Validation requires a whole relationship, one subtraction, one result, distinct typed
identities, matching denominators, a positive removable amount, and a mathematically
equivalent remainder. Old-version, incomplete, wrong-role, forged-result, mismatched-
denominator, and over-removal fixtures fail atomically.

The observational corpus now records 9/60 drawn, 1/60 held, and 50/60 clarified. The
gold set is 3/13 strict, 12/13 automated-ready, and zero false-confident. Case 32 has
complete automated semantic and rendered-cue evidence but remains pending real human
visual approval. Only case 42 remains without its expected production grammar in this
frozen gold batch.

The complete checkpoint passes 322 tests across 41 files. The 250-iteration
meaning-only benchmark measured 1.70 ms median and 5.08 ms p95, excluding speech, DOM,
SVG painting, and device work. Twenty-eight real-component static fixtures and a full-App
fraction workflow are generated. Production JavaScript is 474.12 kB (140.34 kB gzip);
CSS is 12.30 kB (3.67 kB gzip). Lint, TypeScript, production build, and Android asset
synchronization pass. Live browser inspection, APK compilation, physical Android
rendering, speech/device latency, projector inspection, human visual review, and hidden
generalization remain unverified. The next frozen construction is case 42’s water-cycle
loop.
