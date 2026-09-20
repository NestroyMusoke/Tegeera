# Tegeera remote interpreter

This optional Node 24 service is the only production component allowed to hold an LLM credential. The Android/Web client first tries Tegeera's deterministic local interpreter; only unsupported language reaches this service. The model returns a bounded high-level visual blueprint. Its noun glyphs use a tiny path-data grammar, never SVG/XML markup; the client allowlists commands, bounds every coordinate, limits path and part counts, normalizes style, compiles to DoodleScript, and validates the complete result before the scene changes.

## Required runtime settings

- `OPENROUTER_API_KEY`: a newly generated OpenRouter key. Never commit it.
- `OPENROUTER_MODEL`: defaults to `openrouter/free`; pin a model for repeatable evaluations.
- `ALLOWED_ORIGINS`: comma-separated exact origins, without URL paths.
- `APP_URL`: the public Tegeera URL sent as OpenRouter attribution.

Deploy this directory as a small container service (for example, Google Cloud Run). Set the values above in that platform's secret/configuration controls. Confirm `GET /health`, then create the GitHub Actions repository variable `TEGEERA_INTERPRETER_URL` containing the service URL and redeploy Pages.

The service enforces origin checks, a 500-character utterance limit, a 12-request-per-minute in-memory IP limit, a 12-second upstream timeout, and OpenRouter `data_collection: deny`. The client still treats all model output as untrusted.
