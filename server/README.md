# Tegeera hosted interpreter

This optional Node 24 service keeps a shared model credential out of the Android APK and public website. The app tries its local deterministic interpreter first. Unsupported language can be sent to this service for a scene blueprint; unfamiliar nouns can request a separate bounded stroke doodle. The app validates both before displaying them. A valid schema does **not** prove a correct explanation or a recognizable drawing.

## Configuration

`NVIDIA_API_KEY` is the preferred server-side secret. `NVIDIA_MODEL` defaults to `nvidia/nemotron-3-super-120b-a12b`. If no NVIDIA key is configured, the existing `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` path remains available. If neither key is set, `/health` reports `configured: false` and model routes return 503; the app's local drawings still work. Do not commit a key or put it in a `VITE_` variable, GitHub Actions variable, URL, or Android source.

`ALLOWED_ORIGINS` is a comma-separated list of **exact origins**, without paths. Include `https://localhost` for the Capacitor Android WebView and the web demo's origin (currently `https://nestroymusoke.github.io`). The default includes localhost development and Capacitor only. `PORT` defaults to 8080.

The service defaults to **12 requests per socket peer per minute**, **2 concurrent model requests**, and **80 outbound provider attempts per UTC day**. Override these with `MAX_REQUESTS_PER_CLIENT_PER_MINUTE`, `MAX_CONCURRENT_MODEL_REQUESTS`, and `MAX_PROVIDER_CALLS_PER_DAY`. Invalid or zero values prevent startup instead of silently removing the cap. One visual request can make two provider attempts if its first response needs correction, and both attempts count. When the allowance is exhausted, the service returns HTTP 429; the app retains its last accepted drawing and local features. Disconnecting a client aborts its provider request.

These are **per-process in-memory guards, not a billing guarantee**: restarting or running multiple replicas resets or multiplies the allowance. Restrict deployment to one instance and set a provider-side spend/quota limit before exposing a paid credential. The service uses the socket peer for rate limiting and deliberately ignores untrusted `X-Forwarded-For`; behind a shared reverse proxy, multiple users may share one per-peer allowance. CORS is not authentication and cannot prevent server-to-server requests. A public launch still needs a trusted edge identity, durable distributed quotas, and verified provider billing controls.

Run `npm test --prefix server` for isolated, mocked-provider tests. For local startup on a machine with a private key in its environment, run `npm start --prefix server` and visit `http://localhost:8080/health`. The service does not read `.env` files automatically. Set `VITE_TEGEERA_INTERPRETER_URL=http://localhost:8080` in the **client build environment** for a local test; this value is a public service URL, never the secret.

When a hosted service exists, set the GitHub Actions repository **variable** `TEGEERA_INTERPRETER_URL` to its HTTPS base URL and rebuild both Pages and the Android APK. Both workflows now inject that URL at build time. The model key belongs only in the hosting platform's secret configuration. No hosted service or live NVIDIA model test is implied by this repository configuration.

Routes: `GET /health`, `POST /v1/interpret`, `POST /v1/glyph`, `POST /v1/glyph/edit`, `POST /v1/lesson-nouns`. Requests, reusable-noun hints, and scene hints are bounded; origins, concurrency, outbound provider attempts, and elapsed time are guarded. Model output is treated as untrusted; malformed scenes and strokes fail closed.
