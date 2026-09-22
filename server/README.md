# Tegeera remote interpreter

This optional Node 24 service is the only production component allowed to hold a shared LLM credential. The Android/Web client first tries Tegeera's deterministic local interpreter; only unsupported language reaches this service. The model returns a bounded high-level visual blueprint without noun artwork. The client validates the blueprint, resolves artwork through its separate glyph path, compiles to DoodleScript, and checks the complete result before the scene changes.

## Required runtime settings

- `OPENROUTER_API_KEY`: a newly generated OpenRouter key. Never commit it.
- `OPENROUTER_MODEL`: optional override. By default, only free models are tried in priority order (Gemma 4 26B, Gemma 4 31B, then the free router); a pinned override may incur charges, so verify its pricing yourself.
- `ALLOWED_ORIGINS`: comma-separated exact origins, without URL paths.
- `APP_URL`: the public Tegeera URL sent as OpenRouter attribution.

Deploy this directory as a small container service (for example, Google Cloud Run). Set the values above in that platform's secret/configuration controls. Confirm `GET /health`, then create the GitHub Actions repository variable `TEGEERA_INTERPRETER_URL` containing the service URL and redeploy Pages.

The service enforces origin checks, a 500-character utterance limit, a 12-request-per-minute in-memory IP limit, a 45-second upstream timeout, and OpenRouter `data_collection: deny`. The client still treats all model output as untrusted. This service is optional and has not been deployed or verified as a public production backend.
