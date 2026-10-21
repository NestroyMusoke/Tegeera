# Private startup and release check — 20 October 2026

This is not a completed-product claim. Fresh pictures still fall short of the
intended expressive, accurate doodle experience.

## Delivered

- `npm run dev:local` starts the existing private backend and Vite together.
  The backend chooses an unused port; Vite receives its URL automatically.
- Backend credentials are loaded only in the backend process from the existing
  ignored `server/.env.local`. Inherited key/token/secret/password variables are
  removed from the frontend child's environment. Never put secrets in VITE_ vars.
- Both services bind to loopback. CORS permits only the two local development
  origins. Port 5173 is strict: an occupied port does not silently change the URL.
- Ctrl+C or a child exit stops the owned processes. The backend also exits when
  its launcher disconnects. No deploy, Android architecture or approval gate changed.
- `npm run dev:local -- --check` confirms the configured backend and that the
  frontend module receives its actual URL, then shuts down. No inference is made.
- Novel probes accept `--thinking default|low|off`, recording the setting without
  changing production defaults. Invalid settings fail before any provider call.

## Fresh live evidence (local artifacts, not approved artwork)

| Probe | Observation |
| --- | --- |
| Scarf | Valid three-stroke JSON in 6,415 ms; inspected PNG resembles a loop, not a sufficiently clear scarf. |
| Oxygen cylinder | Valid three-stroke JSON in 10,236 ms; inspected PNG is an ambiguous container lacking identifying detail. |
| Watering can pours water into flowerpot | 22,054 ms, one attempt; all 3 roles, 1/2 expected directed edges. Uses can→pot “pours water into” rather than water→pot. Two labelled placeholders. |
| Shelf/toolbox/bucket/mechanic/lantern/doorway | Default reasoning timed out at 42,018 ms after a malformed first response. |
| Same long statement, reasoning off | 7,369 ms, two attempts; 6/6 roles, 3/4 expected edges. Lantern rather than mechanic points toward doorway; an additional above relation appears. Three placeholders. |

The two scene PNGs were inspected: these remain mostly schematic relationships,
not finished illustrated scenes. The strict expectations were not weakened.
The faster configuration is **not** promoted from this one comparison.
No runtime images from this run were approved or added to the shipped pack.

Local evidence: `.visual-check/release-glyphs-oct20/`,
`.visual-check/release-oct20-scenes.json`, `.visual-check/release-oct20-off.json`
and the corresponding `-render` directories. Reproducible source statements live
in `evaluation/release-oct20-probes.json`; they are evaluation data, not noun dispatch.

## Remaining release blockers

Verification this run: 748 client tests passed, 3 optional smoke tests skipped;
74 backend, 31 evaluation-tool and 3 local-launcher tests passed. The real configured
startup check passed. Lint, TypeScript/build, bundle budget, Android web sync and
`git diff --check` passed. No native APK or phone run was performed.

The first performance run overlapped other work and failed the maximum-time gate:
p95 70.61 ms, max 650.18 ms. An isolated rerun passed both tests with 834 samples,
p95 22.80 ms and max 48.30 ms. Thresholds were not changed. These measurements omit
model inference, speech and browser painting; they are not end-to-end phone latency.
The 511.37 kB main bundle still produces Vite's advisory chunk-size warning.

1. Recognizable unseen-object artwork, not merely valid stroke JSON.
2. Reliable preservation of meaning in compound statements; graph acceptance is
   not proof of correctness or absence of invented relationships.
3. Live-model latency and bounded repair failures. Fast local SVG preparation
   does not mean a new model-generated illustration arrives in real time.
4. Real browser, Android-device, microphone and deployment verification.

Do not report a completion percentage from unit-test counts. Phone access is
deliberately not enabled by this loopback-only development command.
