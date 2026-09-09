# Tegeera

**Speak it. See it. Understand it.**

The path from the current bounded grammar to broad, compositional visualization
is specified in [`OPEN_VISUALIZATION_ARCHITECTURE.md`](OPEN_VISUALIZATION_ARCHITECTURE.md).
New domains should not add sentence-specific parser branches.

The original procedural-character contract is documented in
[`TEGEERA_POSE_EXPRESSION_SPEC.md`](TEGEERA_POSE_EXPRESSION_SPEC.md). Open Peeps is
used only to study coverage and modularity; DiceBear is used only to study typed,
deterministic component architecture. Tegeera imports neither project's artwork,
paths, proportions, nor style definitions.

Tegeera is an offline-first visual teaching instrument that turns explanations into in-session editable, hand-drawn scenes. It began with a simple experience at Uganda Christian University: sometimes words are not enough, and drawing the idea is what finally makes it understandable.

## First working slice

The current foundation includes:

- DoodleScript v1 with schema, semantic, layout and confidence gates;
- deterministic animated SVG people and objects;
- typed natural-language commands;
- in-session scene revisions and undo;
- safe clarification instead of guessed drawings;
- Capacitor configuration for the Android application.
- swappable live-speech engine with Android support, safe confidence handling and typed fallback.

Try commands such as:

- `Draw three students waiting in a queue`
- `Add a teacher`
- `Draw a car`
- `Move the car left`
- `Remove the car`
- `Clear everything`

The original university workflow is now available:

- `Imagine three processes waiting in a CPU queue`
- `Make that four processes`
- `Move the CPU to the right`
- `What if the second process goes first?`

The queue preserves process identities through count and order changes. It models
ready-queue order, not execution timing or a complete scheduling algorithm.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Test and build

```bash
npm test
npm run build
```

Run `node scripts/visual-check.mjs` to generate ignored local visual fixtures.

Open concepts now use a versioned, local visual-symbol ontology. Known labels are
composed from reusable SVG anchors and capability cues (for example, water plus
upward motion for evaporation); unfamiliar or ambiguous labels remain honest
labelled nodes. The resolver uses concept data and token evidence rather than
sentence-specific drawing branches.

DoodleScript 1.9 adds evidence-backed visual phrases. A versioned action registry
extracts open subject and object slots around reusable actions such as absorption,
release, production, transformation, influence, and flow. The planner preserves
existing identities, moves only concepts created by the active utterance, samples
the actual connector curve for glyph collisions, and keeps relation labels clear.
Animated particles reinforce direction, while the static arrow and accessible
relationship text retain the meaning when reduced motion is enabled.

Multi-relation explanations are planned atomically. A clause such as “A plant
absorbs sunlight and water, then produces oxygen” expands coordinated objects into
separate semantic roles, explicitly inherits the one unambiguous prior subject,
and lays out the complete input–process–output graph before persisting any edge.
The topology planner reserves future growth space, protects retained connectors,
and refuses a fourth simultaneous lane rather than merging concepts or overlapping
the drawing.

Interpretation failures now return a structured clarification reason, the exact
clause that triggered it, and bounded response alternatives. Negation, conditions,
uncertainty, missing quantities, unresolved references, ambiguous meanings, layout
limits, conflicts, and unsupported meanings have stable machine-readable codes.
The semantic layer enumerates candidate parser families before choosing one; if
future registry growth makes a clause match more than one meaning, Tegeera pauses
instead of silently relying on parser order.

The separate `evaluation/synthetic-language-holdout.json` corpus measures expected
predicates, valid scripts, safe clarification, and false-confident acceptance. It is
explicitly synthetic regression evidence—not a classroom accuracy percentage. Real
accuracy still requires a frozen, consented corpus from teachers who did not author
the grammar.

Concrete concepts now come from a versioned registry shared by noun parsing,
semantic frames, capability checks, and renderer selection. Every schema entity kind
declares singular/plural forms, aliases, a semantic category, glyph key, countability,
and supported behaviors. Startup validation rejects missing kinds, duplicate IDs,
duplicate aliases, and renderer-key mismatches. Semantic frames retain the resolved
concept ID and category, while rendered SVG exposes the same registry version and
meaning as inspectable metadata. Adding an alias such as `table`/`tables` requires
registry data only; unfamiliar open concepts still use honest labelled nodes.

Relationships now have the same kind of shared contract. A versioned relation
registry owns semantic family, forward/inverse aliases, readable label, minimum
DoodleScript version, source/target/object cardinality, directionality, and layout
capability for every schema relation. Semantic extraction, validation, accessible
labels, relationship keys, and SVG metadata consume that registry. Specialist
geometry remains separate: the registry selects `queue`, `contact`, `event-graph`,
or `visual-flow`; the relevant planner still proves that the actual geometry is safe.

Ordered-container language is also registered. Reusable templates bind either
`sources → verb → target container` or the inverse `target container → verb →
sources` before scene planning. The old CPU-specific sentence regular expression
has been removed from the interpreter. Queue-member and queue-target capabilities
plus registered domain compatibility validate the extracted concepts. CPU processes
and students waiting at a school therefore use the same ordered-row planner, while
cross-domain combinations such as students in a CPU scheduling queue are rejected.

Milestone 3 includes a shared constraint-based layout kernel and a versioned registry
for seven active visual grammars. Event graphs, open visual flows, and ordinary
actor-target staging submit candidates through the same deterministic bounds,
collision, movement-stability, and connector-crossing evaluation. Each registered
family owns its topology, capacity, reading direction and scoring policy while still
supplying its own semantic geometry check, so sharing safety machinery does not erase
the visual meaning of a flow, event, queue, ownership group, or gesture.
Open `.visual-check/app-phone.html` or `.visual-check/app-small-phone.html` in a
browser for the real typed-input workflow check. Each ends with PASS or FAIL.
These checks do not substitute for Android touch, keyboard and speech testing.

On a populated scene, **Read details** enlarges the unchanged SVG inside a
scrollable canvas so labels remain readable on narrow screens. **Overview** returns
to the complete scene and resets the scroll position. Switching view does not add
a revision or consume Undo.

## Android

The native Android project is added after installing dependencies:

```bash
npx cap add android
npm run android:sync
npm run android:open
```

The Android speech bridge requests microphone permission only when the user taps
**Speak**. It asks Android to prefer an offline recognizer. Availability still
depends on the recognition service and offline language pack installed on the
device; when neither is available, Tegeera preserves the current scene and keeps
typed input enabled.

## Safety contract

The first visual-understanding increment supports composable sharing and ownership
scenes. Try `Three students share two books`, followed by
`Another student arrives with her own book` and `Highlight the second student`.
Unsupported or ambiguous clauses preserve the previous scene and show a specific
clarification. This is currently a bounded grammar, not arbitrary language understanding.
Follow-up corrections include `Make that four students` and, after the arrival,
`She gives her book to the first student`. Undo restores ownership and conversation
context. Count changes and transfers keep the surviving objects' identities.
Common classroom framing is accepted too, including `Could you please show me
three students sharing two books?`, `There are three students sharing two books`,
and `A car is moving toward a person`. Meaning-bearing words are preserved:
negation, uncertainty and unsupported trailing actions still request clarification.
See `ENGINEERING_STATUS.md` for evaluation methods, limitations and the next work.

Individual quantities are distinct from sharing: `Three students each have two
books` creates six books with two assigned to each student. `Three students share
two books` creates only two shared books. Existing groups support `They each have
a book` or `The students have a book each`. These add new possessions; they do not
distribute existing books. The ten-object layout limit still applies.
Matching O-codes beneath owners and items show personal ownership across rows;
readable “Who owns what” cards group the same doodles with their owner. Transfers
restage only the giver, recipient, and original object into a two-person handover;
the same object ID then appears under its new owner. Shared resources keep their
separate shared relationship.

Directed motion examples: `A car approaches a person`, `Make it go the other way`,
and `Stop it`. Human figures also support `A student walks toward a school`.
These show direction with arrows and facing/pose changes, not physical movement
or collision simulation. Objects must share a row with room for an arrow.
Directional phrasing is registered as semantic relation data. Canonical modes such
as `move`, `walk`, and `drive`, their aliases, readable labels, and required actor
capabilities share one registry; the interpreter no longer owns a sentence-specific
motion regular expression. This remains a bounded verb vocabulary, not arbitrary
motion understanding.

An independent 60-statement teacher corpus lives at
[`evaluation/independent-teacher-corpus.md`](evaluation/independent-teacher-corpus.md).
It is parsed only by evaluation code and is deliberately invisible to the production
grammar. The present baseline safely accepts 1/60 and asks for clarification on
59/60. That number is coverage, not semantic accuracy: each accepted graph still
requires comparison with the separately written intended visual.

Temporal and causal concept diagrams accept open, readable labels inside registered
relationship structures. Try `Evaporation happens before condensation`, followed by
`Condensation comes before rainfall`, or `Heavy rain causes soil erosion`. `After`
is normalized into the same earlier-to-later graph; `leads to` and `results in` use
the same causal relation. Matching concepts are reused, cycles and duplicate claims
are rejected atomically, and unknown verbs outside these structures still require
clarification.
Connected event graphs are laid out by topological rank. A cause can branch into
multiple results, several causes can converge on one result, and long edges use an
outer routing lane instead of crossing intermediate nodes. Existing readable linear
timelines and unrelated scene objects retain their positions.

No language model draws directly onto the canvas. Every parser or model must produce DoodleScript, and every script must pass four gates before it changes a lesson:

1. schema validity;
2. semantic reference validity;
3. safe, readable layout;
4. minimum interpretation confidence.

## Licence

Tegeera is available under the MIT License.
