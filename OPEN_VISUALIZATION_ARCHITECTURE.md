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

## Broad-language strategy

The system needs layered interpretation rather than one increasingly permissive
regular expression:

1. deterministic edit commands for Undo, move, remove, rename and count changes;
2. tokenization, quantities, noun phrases, verbs, prepositions and references;
3. semantic frame rules reusable across nouns and domains;
4. local retrieval of visual patterns from a versioned template library;
5. an optional small local structured planner for uncovered language;
6. clarification whenever competing frames remain plausible.

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

Build Milestone 1 only. Do not add another scenario. Introduce semantic frames and
route the existing general object, ownership, motion and ordered-queue meanings
through them while preserving every current result. This creates the seam where
retrieval and a future local planner can contribute without touching rendering or
bypassing validation.
