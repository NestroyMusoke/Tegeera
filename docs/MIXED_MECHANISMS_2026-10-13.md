# Mixed mechanisms: live failures, repairs and remaining limits

This checkpoint improves interpretation, not the claim that Tegeera can draw anything beautifully. Six new statements were exercised in eleven live evaluations, including retries after fixes. Expectations were written before calls and were not included in the model prompt. Replays used saved candidates and made no provider calls.

## What changed

- A complete four-role propagation mechanism can now retain connected ordinary context, such as an observer or a downstream reading. The old validator required exactly four objects and three links, rejecting otherwise useful explanations. The new bounded contract preserves the complete core and rejects ambiguous origins, incomplete mechanisms, disconnected context and conflicting specialist edges.
- The four-role-only scene still uses its specialized schematic. Mixed scenes use the ordinary layout without discarding their objects or predicates. They remain subject to normal geometry and source checks.
- Physical nouns incorrectly declared as computer `process` or `cpu` symbols no longer acquire those misleading icons. Unknown subjects become honest placeholders; known computer nouns retain their symbols.
- A narrowly source-grounded check rejects the active/passive error in `data → screen: receives` when the source explicitly says data is sent to the screen. It does not rewrite arbitrary verbs or infer vague pronouns. The provider receives repair feedback.
- Shared planning instructions distinguish propagation's typed core from ordinary downstream relationships. No sentence-specific output templates were added.

## Fresh statements and results

| Statement | Evidence and latest outcome |
| --- | --- |
| A laser sends light through glass to a detector. | Baseline control: one call, 7.675 seconds; complete endpoint contract and renderable specialized schematic. This is a schematic, not a realistic laser/glass drawing. |
| A transmitter sends light through an optical fibre to a detector. A technician watches the detector. | Initially rejected. After repair: one attempt, 20.609 seconds; all expected roles/links retained and renderable. Four labelled placeholders plus a person remain. |
| A speaker sends sound through air to a microphone, while a student stands beside the speaker. | Initially rejected. After repair: one attempt, 12.624 seconds; complete graph and renderable. Visual inspection found a computer-process icon for sound. Zero-call replay after the grounding fix replaces it with an honest placeholder. Speaker is drawn as a person; the human/device ambiguity is unresolved. |
| An oscillator sends vibration through a membrane to a sensor. The sensor sends a reading to a display. | Initial six-role scene missed one direct expected link. A later plan was rejected for extra typed core edges. Final retry: one attempt, 15.781 seconds; renderable four-object graph, with vibration/reading in edge captions rather than separate nodes. This does not meet the literal six-role contract; it is not proof those words were omitted from the explanation. Four placeholders remain. |
| A heater sends heat through a metal plate to a thermometer. An engineer watches the thermometer. | New holdout: timed out at 42.007 seconds. No usable drawing was obtained. Provider-attempt count was unavailable. |
| An antenna sends radio waves through air to a receiver. The receiver sends data to a screen. | New holdout initially passed endpoint scoring at 16.049 seconds, but inspection found the wrong `receives` predicate. The new check rejects that saved candidate. A live retest repaired the relation in two attempts, 25.908 seconds; complete graph, renderable, but six labelled placeholders. |

The original four-case baseline had 1/4 complete directed endpoint contracts and 2/4 renderable outputs. Endpoint checks alone missed the radio predicate error. Do not convert these numbers into visual accuracy or an overall completion percentage. Repeated attempts are not independent holdouts.

## Visual review

Actual DoodleCanvas SVGs were rendered to PNG and inspected: the baseline propagation schematic, initial vibration scene, light scene, sound before/after grounding, final vibration scene and final radio scene. This is static renderer inspection, not interactive browser or phone verification. Long connector detours and extensive placeholder coverage remain visible. No new artwork is certified as polished by this review.

Ignored local evidence is under `.visual-check/`: `mixed-baseline-oct13.json`, `mixed-after-oct13.json`, `mixed-downstream-oct13.json`, `mixed-holdouts-oct13.json`, `mixed-radio-retest-oct13.json`, saved candidate JSON, review HTML and `mixed-*.png`. Fresh reproducible input corpora are committed under `evaluation/mixed-explanations-oct13.json` and `evaluation/mixed-holdouts-oct13.json`. Live responses are nondeterministic and use provider credits.

## Remaining product gates

1. Recognizable, consistently styled art for unresolved nouns; generic labelled boxes are not the desired finished experience.
2. Broader meaning verification, including predicates, conditional explanations and alternative valid representations—not merely object/endpoint counts.
3. Lower and measured end-to-end latency. These live calls still took seconds and one timed out; fast local SVG construction does not make the AI path real time.
4. Interactive and phone verification, including successive edits, speech and recovery from slow or failed requests.

Regression/build results are recorded in `NVIDIA_BUILD_STATUS.md` after the final checks complete. No deployment, APK build or phone test is claimed here.
