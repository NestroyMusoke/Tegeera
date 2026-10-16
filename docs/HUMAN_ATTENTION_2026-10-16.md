# Human roles and visible attention

## Implemented changes

- Shared planner guidance explicitly separates human occupations/social roles
  from unknown nonhuman objects. Human job labels can use the existing person
  rig without adding those jobs to a noun registry. Actions alone are not
  evidence of humanity. This guidance is shared by hosted and direct AI paths.
- Exact registered non-contact action/preposition pairs now become targeted
  performances in AI-produced plans. Pointing uses an arm pose; looking uses
  gaze/head orientation. Existing action data is reused, not new scenario art.
- Attention grounding does not move objects or restage specialist layouts.
  It applies only to newly created, declared human performers without a special
  visual role. Known nature previews and nonhuman/generic actors are excluded.
- Competing action targets remain ordinary relationships rather than choosing
  an arbitrary target. Modified phrases such as “almost points at”, “points
  away from”, and “looks after” are not silently normalized into attention.
- The renderer and connector system share the projected position of contained
  artwork. A pose aims at the painted item, not its hidden logical layout slot.
  Scene entities are not mutated. Relation identity and target remain intact;
  the accessible relationship key still states the normalized action.

No noun-specific production branches, external dependencies, or additional
runtime provider requests were introduced. A model that still declares a human
as generic is not locally guessed into a person; the prompt improvement is not
a deterministic classification guarantee.

## Reproduction and live checks

Two new tests first failed because “points at” and “looks toward” stayed generic
arrows. The targeted suite subsequently passed 50 tests, including contained
target aiming, nonhuman exclusion, conflicting targets and existing contact poses.
The former literal “points at” assertion now accepts the normalized “point at”
wording; the relationship has not been dropped.

Fresh statements from `evaluation/attention-roles-oct16.json` were not in the
planner prompt. Three requests used three provider attempts total:

| Case | Elapsed | Inspected result |
| --- | ---: | --- |
| Archivist points at globe | 8,294 ms | Archivist is a person with an aimed arm; globe remains a labelled placeholder. |
| Cabinet contains violin; curator on left points at violin | 24,183 ms | Violin nested in schematic enclosure; curator on left with arm aimed toward visible violin. |
| Security camera points at gate; gardener looks at fountain | 5,742 ms | Gardener classified as person with directed gaze; camera stays nonhuman. Camera and gate remain labelled placeholders. |

All three saved SVG PNGs were inspected. Gaze is subtle at overview size and is
not proof that viewers understand the intended action. The cabinet remains a
labelled box. Role/endpoint completeness is not visual approval. Live inference
is still seconds, not real-time, and these measurements do not establish a speedup.

Ignored local evidence: `.visual-check/attention-roles-oct16.json`, its render
folder, and `attention-archivist.png`, `attention-curator.png`, `attention-camera.png`.
Final verification is recorded in NVIDIA_BUILD_STATUS.md. No APK, live browser,
phone, public deployment, or completion percentage is claimed by this checkpoint.

## Final verification

- Client: 709 passed; three optional live smoke tests skipped.
- Backend: 69 passed. Focused pose/edge tests: 50 passed.
- Isolated performance: two passed; 278 probes / 834 samples, SVG-ready
  p95 31.86 ms, maximum 56.78 ms (not inference or browser paint).
- Delayed-provider unseen noun: local SVG ready in 94.26 ms.
- Lint, TypeScript, production build, bundle budget and Android web sync passed.
  Main chunk 505.61 kB; existing advisory size warning remains.
