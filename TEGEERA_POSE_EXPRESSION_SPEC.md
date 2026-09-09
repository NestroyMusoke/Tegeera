# Tegeera pose and expression specification

Status: design contract for the next procedural character-rig work. No Open Peeps
asset, coordinate, path, proportion, texture, or stylistic treatment is included.

## Reference boundary

Open Peeps is used only to confirm a useful systems pattern: character illustrations
can be assembled from interchangeable body, head, facial-expression, and pose parts.
Its official public page describes vector arms, legs, emotions, standing and sitting
poses, and more than 584,688 possible combinations. The public page does not provide
a reliable count of the underlying standing and sitting pose components. Tegeera will
therefore define its own coverage target rather than claim or reproduce an unverified
external count.

Sources consulted structurally:

- https://www.openpeeps.com/
- https://pablostanley.gumroad.com/l/openpeeps

DiceBear is the closer implementation reference. Its current v10 architecture uses
`@dicebear/core` plus JSON definitions from `@dicebear/styles`; the older
`@dicebear/collection` package has been removed. Official definitions separate a
canvas, named reusable components and variants, palettes, root attributes, metadata,
and validated options. A seeded generator then makes selection deterministic. The
definition schema also restricts SVG elements and blocks event handlers, external URL
references, and CSS-injection patterns.

Tegeera should mirror only these software boundaries:

1. `CharacterRigEngine` — deterministic composition and transforms;
2. `CharacterStyleDefinition` — versioned JSON-like data, never executable markup;
3. `PoseComponentRegistry` — named joint/weight/contact variants;
4. `ExpressionComponentRegistry` — named eye, brow and mouth variants;
5. `CharacterOptions` — schema-validated semantic selections;
6. `seed` — stable identity variation that never changes semantic pose;
7. safe SVG emitter — an allowlisted element/attribute surface.

The Tegeera definition must additionally support semantic joint ownership, target
anchors, motion channels, reduced motion, and classroom accessibility—requirements an
avatar generator does not need. DiceBear styles have creator-specific licenses, so no
style definition or artwork is imported merely because the engine is open source.

Additional structural sources:

- https://github.com/dicebear/dicebear
- https://github.com/dicebear/styles
- https://github.com/dicebear/schema

Prohibited implementation inputs:

- downloaded Open Peeps SVG or raster assets;
- traced or adapted paths;
- copied control points, silhouettes, proportions, line weight, ink texture, wobble,
  clothing, hair, face shapes, or animation timing;
- visual comparison tests that require Tegeera to resemble an Open Peep.
- DiceBear style JSON, component SVG, generated avatar output, or style-specific
  option names copied into Tegeera.

The current Tegeera rig predates this document. Future rig changes must follow this
specification and original Tegeera pose sheets, not the reference artwork.

## Tegeera visual identity

Tegeera characters are classroom marks brought gently to life: clear at phone size,
warm without becoming childish, and diagram-first rather than decorative.

- Stroke: clean rounded monoline with controlled secondary accent strokes; no faux
  ink wobble. Base character stroke is 3.2 SVG units at scale 1.
- Proportion: head diameter is approximately 24% of standing height; shoulder width
  is 22%; hip width is 14%; legs occupy 42%. Hands and feet are slightly enlarged for
  readable gestures.
- Silhouette: every semantic gesture must remain identifiable when facial details and
  color are removed.
- Color: charcoal structure, paper background, and one restrained semantic accent.
  Color cannot be the only carrier of meaning.
- Personality: quick anticipation, soft settling, and tiny breathing motion. Avoid
  rubber-hose exaggeration, noisy perpetual motion, and decorative movement unrelated
  to the lesson.

## Modular SVG rig

Every character renderer must expose these independent groups in this order:

1. `shadow` — optional grounding mark;
2. `lower-body` — pelvis, left leg, right leg and feet;
3. `torso` — spine/torso and shoulder frame;
4. `left-arm` and `right-arm` — upper limb, elbow, forearm and hand;
5. `head` — head outline and optional semantic headwear owned by Tegeera;
6. `expression` — eyes, brows and mouth as separate subgroups;
7. `prop-contact` — computed attachment/reach markers, never decorative props;
8. `focus-accent` — highlight or instructional emphasis.

Pose controls contain joint angles, body lean, head tilt, hip offset, planted-foot
weights and contact intent. Expression controls contain eye aperture, pupil/gaze,
brow lift/slant, mouth curve/opening and optional cheek marks. Identity styling,
pose, expression and motion are orthogonal inputs.

## Base pose taxonomy

The first complete Tegeera set contains ten standing/moving poses and four seated
poses. These are semantic coverage targets, not one-off drawings.

### Standing and moving

1. `stand-neutral` — balanced feet, relaxed arms; default unmarked state.
2. `stand-attentive` — weight slightly forward, open hands; listening or observing.
3. `explain-open` — one open palm toward content, one relaxed arm; presenting.
4. `point-target` — directed arm with solver-controlled elbow and gaze; exact target.
5. `wave-greeting` — raised hand with an asymmetric readable wave arc.
6. `celebrate-open` — lifted arms, raised center of mass; success or discovery.
7. `think-contact` — hand near chin, head tilt, upward or lateral gaze.
8. `hold-carry` — stable contact hand and protected prop space near the torso.
9. `walk-stride` — opposing arm/leg phase, one planted foot and forward lean.
10. `run-stride` — stronger lean, airborne/readable stride and higher limb amplitude.

### Seated

11. `sit-attentive` — upright pelvis, grounded feet, hands relaxed or on lap.
12. `sit-reading` — two-handed book contact with downward gaze.
13. `sit-writing` — desk-relative hand contact and forward focus.
14. `sit-discussion` — turned torso and open conversational hand.

Sitting requires an explicit support/contact anchor. If the scene has no compatible
seat or desk, the planner must clarify or retain a standing equivalent rather than
float the character at a hardcoded height.

## Expression vocabulary

Expressions are parameter sets assembled from reusable parts:

1. `neutral` — level brows, open eyes, flat-soft mouth.
2. `warm` — gentle mouth curve, relaxed brows, direct gaze.
3. `joy` — high smile, slight eye compression, raised brows.
4. `speaking` — bounded mouth opening layered over the current affect.
5. `focused` — narrowed aperture, centered gaze, slightly lowered inner brows.
6. `thinking` — lateral/up gaze, asymmetric brow lift, closed mouth.
7. `concern` — raised inner brows and shallow downturned mouth.
8. `surprise` — widened eyes, raised brows and small open mouth.
9. `determined` — lowered brows, forward gaze and firm mouth.
10. `confused` — asymmetric brows, small head tilt and uncertain mouth curve.

`speaking` is an overlay, not a separate emotional identity. Gaze is also an overlay:
target-driven gaze overrides an expression's default gaze without replacing its brows
or mouth.

## Combination rules

- Any standing pose can combine with any base expression unless a semantic action
  supplies a stronger expression overlay.
- Targeted point, look, touch, hold and carry actions own gaze direction.
- Contact actions own the contacting limb; expressive overlays may use only the free
  limb unless both contacts are explicitly planned.
- Hold/carry and seated-reading poses require a visible object identity and exact
  attachment anchors.
- Walking/running owns leg phase and opposing arm swing; a held object may replace one
  arm channel while the free arm continues the gait.
- Head tilt is additive but clamped to ±12 degrees. Body lean is clamped to a range
  that keeps both the silhouette and declared support physically credible.
- Competing ownership of the same joint or prop is a planner conflict and must not be
  silently resolved by render order.

## Motion character

- State transitions use 160–240 ms ease-out settling.
- Walk cycles use 700–900 ms; run cycles use 430–600 ms.
- Wave and celebration loops pause between gestures so the canvas does not flicker.
- Breathing amplitude stays below 1.5% of body height.
- Target attachment points are recomputed every frame from the semantic anchor; props
  never trail behind through an unrelated CSS transform.
- Reduced-motion mode removes looping displacement and particles while preserving the
  final semantic pose and all relationship labels.

## Acceptance gates

Before a pose or expression becomes production data, it must pass:

- recognizable silhouette at a 40-pixel displayed character height;
- no self-intersection or disconnected limb at supported joint limits;
- correct target reach/contact where applicable;
- stable identity and prop attachment during scene movement and Undo;
- expression readability in monochrome and without motion;
- desktop and 390-pixel phone fixture inspection;
- accessible text that states the action or affect without relying on appearance;
- reduced-motion verification;
- an originality review against this specification, not against third-party paths.

The first original Tegeera pose sheet should show all fourteen poses with `neutral`,
`warm`, `focused`, and `joy` expressions, plus a matrix proving that pose and face
parts can recombine. Only after that sheet is accepted should new SVG rig generation
or seated-pose implementation begin.
