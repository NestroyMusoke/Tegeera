# Tegeera human visual-review protocol

Automated checks prove that required identities, relations, cues, and accessibility text
exist. They do not prove that a doodle communicates well to a person. A drawing receives
human approval only after a reviewer inspects the rendered output at the target viewport.

## Approval criteria

Approve only when every criterion passes:

1. **Meaning fidelity:** the drawing communicates the teacher statement without relying
   on hidden metadata or the reviewer already knowing the expected answer.
2. **Identity completeness:** every expected concept is visibly distinguishable; nothing
   important is merged, duplicated, or replaced with a label-only bubble.
3. **Relationship clarity:** direction, order, containment, magnitude, and return paths
   are visually unambiguous.
4. **Legibility:** labels, lines, and symbols are readable at a 390-pixel phone viewport
   and do not overlap or clip.
5. **Motion discipline:** animation helps explain change or flow, does not distract, and
   the reduced-motion rendering retains the same meaning.
6. **Teaching usefulness:** a teacher could point at the drawing while explaining it and
   a learner could retell the central relationship from the picture.

## Review procedure

Run `node scripts/visual-check.mjs`, then open
`.visual-check/human-visual-review.html`. Inspect every scene at its embedded 390-pixel
viewport, select Approve or Reject, and write a concrete note for every rejection. Export
the JSON evidence when complete. Record the reviewer, date, device/display, viewport,
and whether reduced motion was also checked.

An exported decision is evidence, not an automatic gold mutation. A separate deliberate
review must verify its case ID and fixture revision before setting `humanVisualReview` in
an evaluation observation. Never approve from source code or automated cue presence alone.
