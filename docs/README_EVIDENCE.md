# README evidence and editorial record

Updated 26 October 2026. This index separates current observations, historical measurements, and future targets. It is not a completion score.

## Evidence ledger

| Evidence | Date and scope | What it establishes | What it does not establish |
| --- | --- | --- | --- |
| [Speech, landing, and mobile regression sources](../src/speech/browserEngine.test.ts), [film regression](../src/GeeraFilm.test.tsx), [app speech tests](../src/App.continuousSpeech.test.tsx) | 26 Oct: 44 tests across seven focused files passed; TypeScript, lint, production bundle and budget checks passed | Simulated recognition lifecycle, ordered phrases, cancellation, recovery, and frame direction | Physical microphone operation, a phone frame-rate measurement, or a full-suite result |
| [Reliability checkpoint](RELIABILITY_2026-10-23.md) | 23 Oct: recorded 807 client passes, three optional provider tests skipped; 77 backend passes at that revision | Historical automated regression coverage | Current totals, unseen-language accuracy, or classroom approval |
| [Readiness baseline](MEASURED_READINESS.md) | 9 Oct: local parser rendered 25/60 independent teacher statements; 28/29 annotated checks passed | Local coverage and annotated structural conformance at that revision | Hosted-model coverage, visual quality, or 96.55% product completion |
| [Real-time investigation](REALTIME_INFERENCE.md) | Dated, small provider experiments with timings and failed semantic checks | Why reasoning settings, repairs, and source grounding affect latency and quality | A representative latency percentile or a provider leaderboard |
| [Glyph investigation](GLYPH_QUALITY_STATUS.md) | Dated small noun and dataset probes | Structurally valid strokes can still be unrecognizable | Universal noun coverage or independent visual approval |
| README classroom and reflection screenshots | 26 Oct: captured from the local production-build browser UI; saved files reopened and inspected | Two actual rendered examples | Screenshots of a new live Nebius response, arbitrary-input accuracy, or proof that every example works |
| Public Render site | 26 Oct: landing and canvas loaded after the free instance woke; canvas reported backend readiness | Reachability and the frontend's readiness signal at that time | A live speech test, guaranteed uptime, or successful inference on every request |

The 26 October screenshot session also attempted a fresh browser/server/database explanation through the local hosted bridge. It returned a model-connection error and preserved the existing scene. It is not included among the successful images. A screenshot export initially captured blank background; both replacement files were reopened from disk and checked before inclusion here.

## Reproduce rather than inherit a number

```bash
npm test
npm test --prefix server
npm run lint
npm run build:web
npm run report:readiness
```

`report:readiness` evaluates the local interpreter and renderer without a paid model call. Its report includes a corpus/annotation fingerprint. A rerun attempted during this documentation update was blocked by the execution sandbox's parent-directory access restriction in esbuild; no fresh corpus score is claimed. Historical numbers above remain explicitly dated.

The focused 26 October tests used Vite's `--configLoader runner` to avoid the same config-bundling restriction. This is an execution-environment workaround, not a change to the application's normal build commands.

Live provider tests are separate and consume credits. See [hosted evaluation](../HOSTED_EVALUATION.md). Preserve the statement, expected relationships, actual output, attempts, latency and device context when reporting a failure, without including keys or personal information.

## Why the README is arranged this way

Research consulted on 26 October 2026:

- [GitHub's README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes): explain usefulness, getting started, help, and contributors; use repository-relative links and images.
- [Excalidraw's README](https://github.com/excalidraw/excalidraw/blob/master/README.md): a visual introduction, clear product links, a compact badge row, features, and a quick start.
- [tldraw's README](https://github.com/tldraw/tldraw/blob/main/README.md): a concise product description, visual identity, navigation, and practical entry points for developers.

These are relevant established projects, not evidence that a particular README won an award or caused adoption. Their text, artwork, logos, customer lists and claims were not copied. Geera's README uses its own story, source links and actual application captures.

No verified evidence was supplied that this competition automatically eliminates projects using an AI README screener. The document is organized for fast human and machine reading without hidden instructions, keyword stuffing, invented endorsements, fabricated badges, or unsupported scores.

## Claim boundaries

- The story omits the teacher's medical condition and identity.
- Carol Naddunga receives credit for help along the way, without assigning unverified implementation responsibilities.
- The brand film is a Gemini-generated identity asset, not output from the drawing engine. The README's main screenshots show application drawings instead.
- Source code uses the MIT license. Licensed dataset strokes retain separate attribution; they are not claimed as original Geera artwork.
- Historical documents use Tegeera, the former product name. Their dates and findings are preserved rather than silently rewritten as current results.
