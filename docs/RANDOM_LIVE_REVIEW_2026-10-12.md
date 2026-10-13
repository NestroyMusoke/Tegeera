# Twelve fresh live statements: short, medium and complex

These are exploratory probes, not a statistically random sample or a product-completion score. Expectations were written before calling the provider and were not sent to it. Three committed corpora contain the exact prompts and expected endpoints. Seed: 121026. Thirteen provider attempts across twelve statements; two subsequent saved-response replays spent no API credits.

| Statement/case | Endpoint checks | Initial render | Main observed limitation |
| --- | --- | --- | --- |
| A purple octopus | Pass | Rejected | Model omitted colour attribute; repaired locally, but fallback emoji remains monochrome |
| Rain | Fail | Yes | Decomposed into cloud/raindrop/ground; literal role scorer misses this alternative, and two objects are placeholders |
| A bicycle | Pass | Yes | Recognizable provisional sketch, not polished final artwork |
| One bee above a flower | Pass | Yes | Recognizable provisional sketches, correct vertical order |
| Violin beside lantern | Pass | Yes | Lantern is a placeholder; violin is an icon |
| Two coloured books below cloud | Pass | Yes | Spatial order correct; static renderer cannot verify CSS-based book colours |
| Magnet attracts nail beside compass | Pass | Yes | Nail is a placeholder |
| Child gives apple to teacher | Pass | Yes | Arrows describe the handover; no physical exchange animation |
| Roof/gutter/barrel/gardener | Pass | Yes | Five placeholders; two attempts and 30.777 seconds |
| Battery/motor/fan/air/flower/bee | Pass | Yes | Motor and air placeholders; endpoint checks do not validate verb accuracy |
| Student/desk/key/book/tree/cloud | Pass | Yes | Book initially beside desk; corrected vertical order, but support and holding are not physical contact |
| Conditional pump/filter/tank/controller | Fail | Yes | Water-level role and conditional stop meaning are not fully represented; five placeholders |

Initial totals: endpoint-complete **10/12 (83.33%)**; compiler-rendered **11/12 (91.67%)**. Neither measures visual accuracy. After the colour replay, all twelve have renderable results, but the octopus is still not an accurate purple doodle. No blanket visual-pass claim is warranted.

Live response times: **4.217–30.777 seconds**, median **6.7145 seconds**. These exclude browser paint, phone performance and speech recognition. The 4–5ms replay timings are local compilation only, not live AI latency.

## General fixes

- Support predicates such as `rests on`, `sits on` and `stands on` now impose vertical order and are positional rather than action arrows. Negative tests distinguish `depends on`, `feeds on` and `switches on`. This does not implement surface contact.
- An explicit standalone colour-qualified noun phrase can recover a missing colour property when the model retained the exact phrase. Existing attributes, questions, complex sentences, multiple objects, low-confidence plans and extensions are not rewritten. Orange is excluded because it is also a noun. No noun-specific asset or scenario was added.
- Compiler integration tests cover both failures; backend tests cover colour normalization and preservation of ambiguous inputs.

## Evidence and remaining work

Local raw reports: `.visual-check/random-{short,medium,complex}-oct12.json`; render folders contain model candidates and actual renderer HTML/PNG. Fixed replays: `.visual-check/random-support-fixed.json` and `.visual-check/random-colour-fixed.json`. These are ignored local artifacts, not hosted pages. Static PNG inspection covered all eleven initially renderable scenes and the support replay. Static preview cropping and CSS/font differences prevent treating these as phone/browser acceptance tests.

Highest-impact remaining gaps are art coverage, physical contact/interaction, preservation of conditional meaning, colour treatment of emoji fallbacks, and multi-second live model latency. No training, deployment, phone verification or completion percentage is claimed by this run. Existing independent local corpus coverage remains 26/60 (43.33%), not overall completion.

## Final verification

- Client: 667 tests passed; 3 optional live smoke tests skipped.
- Backend: 59 passed. Hosted-evaluation tools: 25 passed.
- Performance: 2 passed, 278 probes / 834 samples; local SVG-ready p95 17.02ms, maximum 41.42ms. This excludes provider calls, speech, browser paint and device scheduling.
- Lint, production build, bundle budget, Android web synchronization and whitespace checks passed. Android sync does not mean an APK or phone test passed.
- Replay regression results were obtained from the saved original model responses, not by rewriting them to fit the tests.
