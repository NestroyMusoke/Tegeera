# Open visualization architecture

## Product target

Tegeera should turn broad, natural explanations into clear, editable educational
visuals. A new topic must not require another sentence-specific branch in the
parser. Known domains may have specialist renderers, but they must be selected
from general meaning, not from one memorized sentence.

“Anything I say is visualized perfectly” is a direction, not an honest release
claim. Some speech is ambiguous, some concepts have no faithful doodle, and speech
recognition can be wrong. The operational promise is:

1. represent understood meaning faithfully;
2. compose a useful visual from reusable primitives;
3. preserve and edit the existing scene;
4. expose uncertainty and ask the smallest useful clarification;
5. never turn unsupported meaning into a confident but incorrect picture.

## Current evidence

The project already has foundations worth preserving:

- versioned DoodleScript and four validation gates;
- immutable scene revisions and Undo;
- typed entities and relationships;
- reusable SVG objects, annotations and accessibility summaries;
- a speech-engine boundary with safe final-transcript handling;
- deterministic browser fixtures and semantic regression tests.

The current scaling limits are structural:

- `interpret.ts` contains a sequential list of phrase-specific regular expressions;
- its noun vocabulary is a closed object literal;
- domain meaning, reference resolution and DoodleScript command generation are
  mixed in one function;
- `DoodleCanvas.tsx` selects glyphs and relationships through type conditionals;
- layout is a fixed ten-slot scan rather than a choice among visual structures;
- there is no general semantic frame, ontology, template retrieval layer or
  constrained planner;
- unfamiliar but visualizable concepts usually produce a blank clarification
  rather than a safe labelled diagram.

The CPU queue remains valuable as a golden acceptance workflow. Its process and
CPU doodles, queue relation and tests should be retained, but its sentence matcher
must eventually be replaced by general extraction plus an ordered-flow template.

## Target pipeline

```text
stable speech / typed text
        ↓
utterance normalization and clause boundaries
        ↓
semantic frames: entities, quantities, actions, relations, tense, references
        ↓
scene resolver: existing IDs, corrections, ambiguity, ontology
        ↓
visual planner: story | spatial | flow | cycle | hierarchy | comparison | chart
        ↓
versioned DoodleScript commands
        ↓
schema → semantic → layout → confidence gates
        ↓
layout strategy + renderer registries
        ↓
editable scene and concise clarification controls
```

No language model or retrieval result writes directly to the canvas. Every route
must produce the same typed semantic frames and validated DoodleScript.

## Core contracts

### Semantic frame

The interpreter should first describe meaning without choosing SVG coordinates:

```ts
interface SemanticFrame {
  intent: "describe" | "add" | "remove" | "update" | "reorder" | "compare";
  entities: EntityMention[];
  relations: RelationMention[];
  quantities: QuantityConstraint[];
  references: ReferenceMention[];
  discourse: { negated: boolean; conditional: boolean; uncertain: boolean };
  evidence: EvidenceSpan[];
  confidence: number;
}
```

Every inferred field must retain the words that support it. Negated, conditional
and uncertain clauses are properties of the frame, not strings discarded during
normalization.

### Data-driven concept registry

Concepts should live in versioned data rather than parser source. Each concept can
declare aliases, semantic category, count forms, default glyph, valid actions and
renderer capabilities. Broad categories include actor, object, place, system,
process, substance, quantity and abstract concept. Unknown concrete nouns may use
a labelled category glyph; unknown abstract nouns should use labelled nodes rather
than pretend to have a literal appearance.

### Relation registry

Relationships should be grouped by reusable visual semantics:

- spatial: left/right, above/below, inside/contains, near/far;
- structural: part-of, owns, shares, connected-to, grouped-with;
- directional: toward/away, flows-to, transfers-to, causes;
- ordered: before/after, queue position, timeline position;
- quantitative: more/less/equal, fraction-of, distributes-across.

Each registered relation supplies semantic constraints, permitted cardinalities,
an annotation renderer and layout hints. A new domain can reuse a relation without
changing the core parser or canvas component.

### Visualization plan

Meaning and presentation must remain separate. A visual planner chooses a layout
family using the semantic graph:

- actors and actions → story scene;
- ordered entities → row, queue or timeline;
- source/transform/destination → flow;
- repeated transition → cycle;
- parent/children → hierarchy;
- two subjects with attributes → comparison;
- numeric series → chart;
- formulas → mathematical renderer;
- unsupported abstraction → labelled concept map.

The plan contains constraints and priorities, not fixed pixels. Layout strategies
score candidates for overlap, label readability, connector crossings, grouping,
focus preservation and movement from the previous revision.

### Renderer registries

`EntityRendererRegistry` maps a semantic category or glyph key to an SVG rig.
`RelationRendererRegistry` maps relation semantics to arrows, brackets, lanes or
connectors. `AcademicRendererRegistry` owns specialist deterministic renderers.
The main canvas renders registry results and must not grow a new conditional for
every object or school subject.

### Visual performance system

Characters are articulated rigs, not a catalogue of complete stickman images.
A performance plan controls bounded joint angles, body lean, head tilt, gaze,
expression, held props and an optional motion loop. Semantic actions select or
compose performances; the renderer only executes the plan. This lets walking,
pointing, explaining, celebrating, listening and carrying reuse the same body
without adding sentence-specific SVG.

Ambient pose variation may make repeated characters feel hand-drawn, but it must
remain deterministic by entity ID and semantically neutral. Emotion, gesture and
props that imply meaning must come from evidence-backed frames. Motion must honor
`prefers-reduced-motion`, and the static frame must still communicate the action.

DoodleScript 1.5 establishes the bounded partial-performance contract and supports
explicit clearing. The remaining work is evidence-backed semantic selection and
interpolation between rig states across scene revisions. The layer must not generate
video frames or rasterize the canvas; SVG joints remain editable, inspectable and
cheap enough for Android classroom devices.

DoodleScript 1.6 adds a general `actsOn` relationship containing a canonical action
predicate and preposition. Target-aware render planning derives facing, gaze, head
tilt and pointing angle from live actor/target coordinates, so moving the target
does not leave a stale baked pose. The relationship is shared infrastructure for
registered targetable actions rather than a new relation kind per verb.

Targeted creation also uses a deterministic spatial staging pass. It scores candidate
actor/target placements against canvas bounds, label-aware overlap, shared baseline,
gesture reach, reading direction and movement cost. The pass is semantic-agnostic:
all targetable registry actions use the same constraints. Only entities created by
the current utterance are movable, so a new performance cannot unexpectedly rearrange
an established explanation. Failure to find an improvement preserves the validated
layout; it never licenses overlap or hidden scene mutation.

Renderer geometry exposes semantic anchors independently of language interpretation.
Each entity kind defines an attention point and contact surfaces in its own local
coordinate system; shared projection functions apply scene position and scale.
Target-aware poses aim from the character's transformed shoulder to the target's
attention anchor and compensate for torso nesting. This keeps visual facts beside
the glyphs they describe while allowing any registered action to consume them.

Contact actions will build on the same contract through bounded two-bone inverse
kinematics. The solver must report unreachable targets, never lengthen limbs silently,
and may restage only entities created by the active utterance. Holding or transfer
must preserve object identity—rendering a second decorative copy is not acceptable.

The first contact action implements that contract for direct-object “touch” semantics.
The generic two-bone solver uses the renderer's actual segment lengths and is verified
by forward geometry. A contact staging pass searches sub-grid horizontal positions,
admits close pairs only when silhouettes and labels remain clear, and validates reach
after projection. Contact removal has its own release transition so removing the
relationship cannot strand two entities inside the ordinary collision boundary.

Persistent attachments extend contact without changing object identity. `hold` and
`carry` relationships mark their target as attached; carrier movement propagates the
same scene delta to that target, while the renderer synchronizes only the target glyph
with the carrier's breathing or walking loop. Stopping or changing to a non-contact
action releases the target through ordinary safe layout. Independent target movement
that would break reach is rejected atomically.

DoodleScript 1.7 represents a person-to-person transfer as a triadic `handover`
relationship with distinct giver, recipient, and object roles. A deterministic
three-participant planner searches safe shared placements while holding unrelated
entities fixed. Both characters reuse the same contact solver against opposite
surfaces of the one transferred entity. Ownership, staging, and the event relation
land in one revision, preventing a persisted half-transfer and allowing Undo to
restore the exact prior scene.

DoodleScript 1.8 introduces canonical temporal and causal edges over reusable concept
nodes. Open vocabulary is permitted only inside these evidence-backed relationship
slots, keeping unsupported predicates outside the mutation boundary. `after` reverses
into `before`; causal paraphrases converge on `causes`. The validator enforces arity,
reference integrity, unique edges, acyclic graphs, readable left-to-right geometry,
and version compatibility before any revision is applied.

The bounded topology planner operates on the connected event component, assigns
topological ranks, preserves valid linear layouts, and restages only when a branch or
convergence requires it. Label-aware layer spacing and alternate vertical bands avoid
fixed scene coordinates. Straight, curved, and upper-lane connector strategies keep
long edges out of intermediate nodes. The planner refuses more than three nodes in a
rank until a larger-canvas navigation model exists.

DoodleScript 1.9 adds an evidence-backed `visualAction` relationship with distinct
subject and object roles. A versioned action registry owns canonical predicates,
aliases, direct or prepositional syntax, semantic direction, labels, and connector
cues. Nouns remain open slots; neither the registry nor renderer stores complete
lesson sentences. Incoming actions such as absorption reverse only the rendered
flow while preserving subject/object identity in the scene graph.

The visual-phrase planner searches bounded candidate positions and can use a third
narrative row for continued explanations. Only entities introduced by the active
utterance may move. Connector validation samples the actual cubic curve against
unrelated glyph bounds and separately checks the relationship label against entity
labels. Static arrows, action text, and the relationship key carry the meaning;
motion particles are supplementary and stop under `prefers-reduced-motion`.

The coordinated visual-phrase planner expands two or three conjunction-separated
objects into separate roles and can inherit an omitted subject after a clause boundary
only when the preceding frame exposes exactly one subject. The inherited action stores
the source frame ID explicitly; it is not treated as utterance evidence. Consecutive
visual-action frames resolve every identity first, reject repeated semantic edges, and
produce one graph plan and one revision.

For a fully new acyclic component, rendered action direction determines topological
rank. Inputs occupy up to three vertical lanes, a shared subject occupies the middle
rank, and outputs retain right-side expansion space. Continued explanations use bounded
pair search, but every candidate must preserve all previously accepted connector and
label geometry. A fourth lane, cyclic component, ambiguous inherited subject, or unsafe
path is clarified without partial scene mutation.

## Broad-language strategy

The system needs layered interpretation rather than one increasingly permissive
regular expression:

1. deterministic edit commands for Undo, move, remove, rename and count changes;
2. tokenization, quantities, noun phrases, verbs, prepositions and references;
3. semantic frame rules reusable across nouns and domains;
4. local retrieval of visual patterns from a versioned template library;
5. an optional small local structured planner for uncovered language;
6. clarification whenever competing frames remain plausible.

Actions use a versioned registry of verb aliases and bounded performance plans.
The grammar extracts actor, canonical action and start/stop phase into a semantic
frame; it does not match complete lesson sentences. The scene resolver then binds
the actor to a new mention, label, ordinal, pronoun or homogeneous group before
the planner emits DoodleScript 1.5. Adding an action should require registry data
and tests, not another branch in the main interpreter.

Retrieval templates describe visual structures such as ordered flow or resource
distribution. They must not contain judge-only responses or exact-sentence checks.
An optional planner receives the ontology and scene summary, returns constrained
JSON, and is independently validated. It is never required for direct edits or
prepared offline lessons.

## Safe universal fallback

Broad coverage does not mean inventing a picture. When exact pictorial rendering
is unavailable but the words are understood, Tegeera can still show:

- labelled actors and concepts;
- explicit arrows using detected verbs;
- ordered steps using clause order;
- quantities using repeated marks or counters;
- a title containing the teacher's own wording;
- an uncertainty badge on the specific unresolved relation.

If even that would imply unsupported meaning, preserve the scene and ask one
targeted question such as “Does X cause Y, or only happen before it?”

## Delivery sequence

### Milestone 0 — freeze scenario branches

- Add no new domain-specific regular-expression branch.
- Keep current behavior as golden regression fixtures.
- Record coverage and known unsupported language without inflating an accuracy
  percentage from authored tests.

Exit: current 113-test baseline remains green and every current workflow has a
semantic expected-scene fixture.

### Milestone 1 — semantic-frame boundary

- Introduce the typed frame, evidence spans and discourse flags.
- Split normalization, frame extraction, reference resolution and command planning.
- Adapt current meanings through the new boundary without changing visible output.
- Move phrase variants into reusable grammar tables.

Exit: the old interpreter becomes an adapter; equivalent paraphrases create equal
frames; negation and conditions cannot disappear; all current scenes remain equal.

### Milestone 2 — registries and ontology

- Replace the noun object literal with a versioned concept registry.
- Replace entity and relation renderer conditionals with registries.
- Express CPU queue, ownership and motion through reusable relation capabilities.
- Add startup validation for duplicate aliases and missing renderers.

Exit: adding a noun alias needs data only; adding a glyph needs one registered
renderer; CPU queue parsing no longer contains a CPU-specific sentence matcher.

### Milestone 3 — constraint-based visual planner

- Add story, ordered, flow, hierarchy, comparison and concept-map layout families.
- Score multiple layouts deterministically.
- Preserve stable positions unless a correction requires movement.
- Include label bounds and connector crossings in layout validation.

Exit: the same relation works across different nouns; representative desktop,
phone and projector snapshots pass readability checks without manual coordinates.

Status: in progress. A shared deterministic candidate evaluator now provides canvas
bounds, fixed-obstacle and pair-collision rejection, movement-stability scoring,
connector-crossing accounting, family validation callbacks, and deterministic
tie-breaking. A versioned layout-family registry owns topology, capacity, reading
direction, movement weight, crossing policy, and compatible relation families for
the seven active visual grammars. Event graphs, open visual-flow graphs,
visual-action pairs, and ordinary actor-target staging use this kernel. Contact,
handover, and motion retain specialist geometry until they can migrate
without weakening reach, attachment, ordering, or directional guarantees.

The ordered-row family has migrated. Queue membership and destination compatibility
come from concept-registry domains; its planner receives semantic roles and places
them through the shared candidate evaluator. CPU scheduling and school-service
queues exercise the same code, including count correction and reordering. The
`queuedFor` schema name remains for DoodleScript 1.x compatibility.

Directional motion has also crossed the registry boundary. `toward` and `away`
definitions own their surface aliases, canonical motion mode, readable label, and
optional source capability. Semantic frames retain those roles, the interpreter
plans from the frame rather than re-matching the sentence, DoodleScript persists the
canonical mode, and the independent validator rejects forged modes or incapable
actors. Motion geometry remains a specialist planner because directional spacing
and facing are part of its visual truth contract.

### Milestone 4 — local template retrieval

- Store templates as versioned semantic graphs with examples and capabilities.
- Implement lightweight local lexical retrieval first.
- Retrieve candidates, bind extracted entities, then validate the result.
- Cache prepared lesson interpretations for instant offline replay.

Exit: unseen paraphrases can select structures without exact text equality; an
irrelevant template never changes the scene; retrieval latency is benchmarked.

### Milestone 5 — constrained local planner

- Define a swappable planner interface and JSON-only output contract.
- Benchmark candidate small models on the actual i7 CPU and target Android tier.
- Compare planner frames against rules/retrieval and require agreement or clarify.
- Keep direct commands and prepared lessons independent of the model.

Exit: a measured independent corpus shows useful coverage improvement without an
unacceptable false-confident rate, memory cost or latency regression.

### Milestone 6 — real speech and teacher evaluation

- Collect consented recordings and typed explanations from people who did not
  author the grammar.
- Include Ugandan English, varied accents, classroom noise and ASR substitutions.
- Store transcripts and expected semantic graphs separately from implementation.
- Test multi-turn corrections, ambiguity, cancellation and recovery on devices.

Exit: publish separate measurements for transcription, semantic correctness,
coverage, clarification quality, correction success, visual readability, latency
and memory. Do not combine them into a misleading single “accuracy” number.

## Quality gates for every future build

Every milestone must provide:

- semantic fixtures written before or independently of implementation;
- adversarial cases for negation, ambiguity and unsupported meaning;
- identity-preservation and atomic-rollback checks;
- rendered desktop and narrow-screen inspection where visuals change;
- accessibility names and reduced-motion behavior where applicable;
- measured latency and bundle-size change;
- full tests, zero-warning lint, production build and Android asset sync;
- an explicit list of what remains unverified on physical devices.

No feature is “accurate” because a regex matched it, “beautiful” because an SVG
exists, or “real time” because the meaning-only benchmark is fast.

## Immediate next implementation

The independent 60-statement teacher corpus is stored separately from production
grammar and its observational harness distinguishes accepted coverage from safe
clarification. A first versioned gold batch now spans all five academic domains plus
ambiguity, reference failure, and scene-hold behavior. Its scorer requires distinct
concept identities, semantic relations, valid DoodleScript, and observed visual cues;
case 1 is therefore recorded as false-confident instead of receiving credit for merely
passing schema validation.

Next, introduce semantic-frame v2 primitives for part-whole structure, containment,
source/path/destination, force, measurement, and non-visual intent. Implement them as
typed roles consumed by registries and planners, then make case 1 correct through the
general part-whole-flow grammar. Do not add a branch for its sentence or import gold
annotations into production code.
