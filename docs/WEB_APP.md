# Tegeera web app

The same React drawing application now runs in a browser or Capacitor Android.
No separate drawing engine or scenario library was added for the web.

## Run it on your PC

In Windows Command Prompt:

```bat
cd /d "C:\Users\X1 Yoga\Desktop\Tegeera_build_1"
npm run build:web
npm run start:web:local
```

Open `http://127.0.0.1:8080/`. The existing ignored `server/.env.local` supplies the
private Nebius credential. Do not paste a key into the website. If port 8080 is
already occupied by the old backend, stop that terminal first. `PORT` can choose
another port. The local command binds only to this computer, regardless of HOST.

To test without any model credential, build as above and run `npm run start:web`.
Local drawings remain available; AI reports unconfigured. The production command
binds to all interfaces, so use the local command when loading private dev keys.

## Publish as one service

This implementation is not itself a public deployment. Use a Node 24 web-service
host with HTTPS and a secret/environment-variable facility. Select the repository
root, **not just the server folder**.

| Host setting | Value |
| --- | --- |
| Build command | `npm ci && npm run build:web` |
| Start command | `npm run start:web` |
| Health path | `/api/health` |
| Private runtime secret | `NEBIUS_API_KEY` |
| Runtime variable | `ALLOWED_ORIGINS=https://YOUR-ACTUAL-HOSTNAME` |
| Runtime variable | `MAX_PROVIDER_CALLS_PER_DAY=80` or a lower positive limit |
| Scaling | One instance for this prototype |

The browser uses `/api`; the Node service serves built public files and forwards
API routes into the existing guarded interpreter. No second frontend/backend URL
or public model key is required. Keep provider secrets runtime-only, not build
variables. Existing GitHub Pages hosting still works with `npm run build` and its
separate HTTPS `TEGEERA_INTERPRETER_URL`; do **not** deploy the `/api` build to a
static-only host. Android builds retain the ordinary existing build command.

There is no hosting account creation, public upload, domain purchase or billing
change in this patch. Choose/authorize the host before public deployment.

## Speech and privacy

- Tap Speak explicitly. Supported browsers use their SpeechRecognition service,
  including prefixed implementations. Audio may go to the browser vendor, rather
  than being recognized offline. Tegeera does not record or persist audio.
- Recognition uses continuous results and deduplicates cumulative final results.
  A repeated phrase at a new result index is intentionally accepted.
- Interim words do not replace the accepted scene. Final phrases use the existing
  bounded drawing queue. AI interpretation transmits explanation text to the
  configured model provider, as before.
- Stop ends capture; Cancel also cancels pending drawing work. Hiding or leaving
  the page stops microphone capture. Silence/end recovery is bounded; network and
  permission errors do not spin indefinitely.
- HTTPS is required outside localhost. Browser/API support is not universal.
  Unsupported browsers keep typed input. Actual accents, microphone permissions,
  service availability and recognizer latency require physical-device testing.
- The manifest supplies app/home-screen metadata. There is no service-worker
  offline reload cache in this patch; do not advertise guaranteed offline install.

Official references checked during implementation:
[SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition),
[continuous results](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous),
[recognition end](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/end_event).

## Public-use limits

The existing backend caps peer requests, simultaneous model requests and outbound
provider attempts, including repairs. These counters are in memory: restarts reset
them, multiple instances multiply them, and CORS is not authentication. Set an
account-side spend cap and use a trusted edge/durable quota before broad public
promotion. Hosting and model availability are not guaranteed free or unlimited.

The web server exposes only `dist`, blocks hidden paths and traversal (including
encoded and Windows paths), resolves symlinks before containment checks, and adds
CSP, MIME-sniffing, framing and permission restrictions. HTML is revalidated;
fingerprinted JS/CSS is cached. Source files and `.env.local` are not served.

## Release checks

Run `npm test`, `npm test --prefix server`, `npm run lint`, `npm run build:web`.
Then test the production server: repeated drawings, mixed text/drawings, Undo,
unconfigured/unavailable AI, narrow-screen layout and refresh.

Before calling public speech verified, test a physical Android Chrome device and
an iPhone browser: grant/deny microphone, say two phrases, repeat one phrase,
pause, hide the tab, Stop/Cancel, interrupt the network and recover with typing.
An automated fake recognizer is not evidence of microphone accuracy.

## Verification from this implementation run

- Full client suite: 799 passed, 3 opt-in live tests skipped. Two subsequently
  added privacy/race regressions also passed in the final 11-test targeted run.
- Backend suite: 76 passed; the static-server test was rerun successfully after
  adding a symlink escape check.
- Production web build, unchanged bundle budgets, lint and diff whitespace check passed.
- Local SVG-ready performance: 834 samples, p95 18.94 ms, maximum 62.10 ms.
  Excludes recognizer, model, browser paint and actual phone scheduling.
- Production browser: mixed sharing/question explanation, consecutive drawings,
  Undo, narrow-screen DOM overflow check, and automatic hosted connection checked.
- One explicit Nebius smoke through `/api` returned a valid one-object blueprint
  in 5979 ms. This is connectivity/schema evidence, not visual-quality evidence
  or an end-to-end real-time guarantee.
- No public deployment or real microphone recording/recognition test was completed.
