# Fresh statements, observed failures and verified fixes — 13 October 2026

This run used ten fresh exploratory statements, not a representative random sample.
Expected roles/endpoints were written before the calls and never entered model prompts.
Eight initial statements were followed by two unseen post-fix holdouts. Total: twelve
provider attempts. Saved-response replays made zero further API calls.

## Results, including failures

| Case | Live endpoint score | Final observed result |
| --- | --- | --- |
| A green snail | Complete | Temporary emoji, not original doodle art; initial preview was monochrome |
| Robot holds hammer beside bicycle | Complete | Two emoji and a provisional bicycle; holding is still an arrow, and “beside” attachment is ambiguous |
| Cup sits on book | Complete | Correct vertical order, but no physical surface contact |
| Pink jellyfish above blue crab | Complete | Browser-confirmed pink/blue previews after tint fix; still emoji |
| Blue vase/shelf/red suitcase/cat/butterfly | Complete | Initially rejected for omitted colour. Replay now renders four vertical levels, but vase, shelf and suitcase remain placeholders |
| Water/mountain/river/lake/bridge/cyclist/umbrella | Rejected | Model mixed a specialist propagation link into an ordinary scene; both attempts failed specialist validation |
| Dog does not chase cat; bird above both | Safely refused | Positive endpoints were present, but negative meaning cannot be safely represented by the current path |
| Smoke sensor/controller/conditional door | Rejected | Mixed specialist topology failed twice; conditional meaning remains unresolved |
| Cloud above butterfly above flower above cup | Complete | New four-level holdout rendered with four provisional drawings; connectors still take long detours |
| Yellow submarine below purple satellite | Complete | Initially two placeholders. Generic colour-aware retrieval recovered the satellite; submarine remains a placeholder |

Directed-endpoint acceptance: **7/10 = 70%**. Initial renderer acceptance: **6/10 = 60%**.
After replaying the repaired shelf case: **7/10 = 70% renderable**. These are not visual
accuracy or product-completion percentages. No rejected input was counted as a drawing.

Live elapsed times: **5.707–28.406 seconds**, median **7.0615 seconds**. Provider time
is still nowhere near real-time speech. Replay timings are not live model latency.

## General system changes

1. Palette tinting for temporary emoji preserves luminance details and alpha. A colour
   floor also tints monochrome font fallbacks. Separate local filter IDs prevent one
   entity's colour from leaking into another. No remote assets or SVG strings are accepted.
2. Exact, unique colour-qualified labels present in positive source text can recover
   omitted colour fields in longer scenes. Existing colours, ambiguous duplicate labels,
   uncertain/negative text and unsupported orange noun ambiguity are not rewritten.
3. Vertical relationship chains determine layout depth, rather than model coordinates.
   Longest-path bounds prune slot search. Four rows reserve a smaller, validated body/label
   envelope. Cycles remain rejected; more than four levels explicitly require smaller views.
4. Emoji retrieval can remove a validated colour prefix before exact noun lookup.
   It does not strip arbitrary adjectives or reduce compound nouns to a misleading icon.
   Physical-contact eligibility uses the same retrieval rule, avoiding false contact with
   platform-dependent font outlines.
5. Saved review HTML now freezes completed strokes and visible labels. Browser inspection
   found that zero-duration animations alone could capture delayed strokes partway through.
   This changes review artifacts only, not the application's write-on animation.

## Verification

- Clean full client run: **673 passed**, three optional live smoke tests skipped.
- Backend: **60 passed**. Hosted evaluation: **25 passed**; the amended snapshot regression
  was then rerun separately and passed.
- Performance envelope: **2 passed**, 278 probes / 834 samples, local SVG-ready p95
  **14.76ms**, maximum **33.44ms**. Excludes AI calls, speech, browser paint and phone timing.
- Additional synthetic eight-object/four-level layouts: **12/12 validated**, median
  local compile+SSR **24.00ms**, maximum/p95 **158.66ms**, including the first invocation.
  This small stress sample is not evidence of a universal sub-100ms guarantee.
- Lint, production build, bundle budget and Android web synchronization passed.
- Actual static images were inspected for the renderable cases. Browser screenshots
  checked tinting, satellite retrieval and the completed four-level scene. These are
  saved renderer pages, not an interactive phone or APK test.

The first full test attempt reported two failures: the contradiction message changed,
and a test encountered an older module while files were still changing. The established
error contract was restored, and the complete suite was rerun against stable files.
The four-level layout also initially failed its new overlap regression; its spacing/scale
were corrected before the clean run. Failures were not suppressed or thresholds loosened.

## Reproducible local evidence

Committed prompts: `evaluation/fresh-short-oct13.json`, `evaluation/fresh-complex-oct13.json`,
and `evaluation/holdout-oct13.json`. Local ignored reports use matching names under
`.visual-check/`; final replays include `shelf-oct13-final.json`,
`colour-preview-oct13-final.json`, `retrieval-oct13-final.json`, `four-level-final-oct13.json`.
Final browser images: `final-colours.png`, `final-retrieval.png`, `final-levels-complete.png`.

No new artwork was approved, no service was deployed, and no phone test was performed.
Offline independent corpus coverage remains **26/60 = 43.33%**, not overall completion.
The next substantial gaps are mixed specialist/ordinary explanations, negation and
conditional meaning, long-tail artwork, physical interactions, and model response time.
