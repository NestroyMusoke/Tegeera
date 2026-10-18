# Readable fallbacks and fresh statement testing — 18 October 2026

## Fix

Fresh live input exposed premature truncation: `Thermostat` became `Thermost…`.
Fallback text now wraps at word boundaries into at most three lines, with bounded
font size and SVG width adjustment for long lines. Ordinary labels such as
`temperature sensor`, `microcontroller`, and `constitutional legitimacy` are
preserved. Long unbroken labels are split without splitting Unicode surrogate
pairs; excessive content receives an ellipsis. Full titles/captions remain.

The sticker dimensions and scene geometry are unchanged. This is a shared text
layout rule, not a noun-specific drawing. It does not provide missing artwork.

## Three fresh live probes

Expectations from `evaluation/label-readability-oct18.json` were withheld from
the provider. Each statement used one provider attempt; replays used none.

| Probe | Latency | Result |
| --- | --- | --- |
| Thermostat controls a heater | 4,343 ms | Both objects and directed relationship retained; both still stickers. Complete thermostat label verified after fix. |
| Temperature sensor sends a measurement to a microcontroller, which sends a command to a ventilation fan | 5,740 ms | Three devices and two directed arrows; measurement/command appear as arrow labels, not separate objects. Strict object-role check remains 3/5, not a clean pass. |
| Greenhouse contains a seedling, rainwater tank on its left, weather station on its right, tank supplies water to seedling | 10,560 ms | Graph roles/links complete; static PNG shows nested seedling and correct left/right context. Tank and station remain stickers. Spatial connector takes a detour. |

Static PNGs inspected: initial greenhouse and thermostat, fixed thermostat and
sensor scene. These are not interactive browser or phone screenshots. All three
model calls are much slower than real time. The graph score is 2/3, not a score
for beautiful drawings. The sensor mismatch has not been hidden by weakening the
expectations.

## Tests and remaining gaps

Eight new label-layout tests cover ordinary names, multiword labels, whitespace,
empty values, and bounded long Unicode input. The renderer regression now checks
complete visible words instead of expecting truncation. The first focused run
failed that old truncation assertion; it was updated to the intended behavior.

Browser automation initialization failed (`failed to write kernel assets`,
Windows path error 3). No browser interaction or phone testing is claimed.
Artwork coverage, inference latency, long-label readability on a physical phone,
and richer representation of information moving between objects remain open.

Final checks: 739 client tests passed (three optional smoke tests skipped), 69
backend tests, 25 evaluation-tool tests, and 26 glyph-pack tests passed. Both
performance tests passed: 834 samples, local SVG-ready p95 14.49 ms, maximum
55.53 ms. Cold unseen-noun rendering was 51.57 ms. Timings exclude inference,
browser paint and phone scheduling; they do not establish a causal speedup.
Lint, TypeScript, production build, bundle budget and Android web sync passed.
Main chunk 508.85 kB retains the existing advisory warning. No APK was built.
