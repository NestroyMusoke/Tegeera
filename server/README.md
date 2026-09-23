# Tegeera hosted interpreter

This optional Node 24 service keeps a shared model credential out of the Android APK and public website. The app tries its local deterministic interpreter first. Unsupported language can be sent to this service for a scene blueprint; unfamiliar nouns can request a separate bounded stroke doodle. The app validates both before displaying them. A valid schema does **not** prove a correct explanation or a recognizable drawing.

## Configuration

`NVIDIA_API_KEY` is the preferred server-side secret. `NVIDIA_MODEL` defaults to `nvidia/nemotron-3-super-120b-a12b`. If no NVIDIA key is configured, the existing `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` path remains available. If neither key is set, `/health` reports `configured: false` and model routes return 503; the app's local drawings still work. Do not commit a key or put it in a `VITE_` variable, GitHub Actions variable, URL, or Android source.

`ALLOWED_ORIGINS` is a comma-separated list of **exact origins**, without paths. Include `https://localhost` for the Capacitor Android WebView and the web demo's origin (currently `https://nestroymusoke.github.io`). The default includes localhost development and Capacitor only. `PORT` defaults to 8080.

Run `npm test --prefix server` for isolated, mocked-provider tests. For local startup on a machine with a private key in its environment, run `npm start --prefix server` and visit `http://localhost:8080/health`. The service does not read `.env` files automatically. Set `VITE_TEGEERA_INTERPRETER_URL=http://localhost:8080` in the **client build environment** for a local test; this value is a public service URL, never the secret.

When a hosted service exists, set the GitHub Actions repository **variable** `TEGEERA_INTERPRETER_URL` to its HTTPS base URL and rebuild both Pages and the Android APK. Both workflows now inject that URL at build time. The model key belongs only in the hosting platform's secret configuration. No hosted service or live NVIDIA model test is implied by this repository configuration.

Routes: `GET /health`, `POST /v1/interpret`, `POST /v1/glyph`, `POST /v1/glyph/edit`, `POST /v1/lesson-nouns`. Requests are size-limited, rate-limited, origin-checked, and time-bounded. Model output is treated as untrusted; malformed scenes and strokes fail closed. The in-memory rate limit is a prototype guard, not production-grade abuse protection. A public launch needs durable rate limits, budget caps, telemetry, and a verified hosting/billing plan.
