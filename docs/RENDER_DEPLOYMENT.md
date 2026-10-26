# Deploy Geera on Render Free

The repository is deployment-ready after the checks below, not automatically published.
Do not paste private keys into chat, GitHub, client-side VITE variables or this document.

## 1. Create the free durable counter

Render Free deletes locally written files on restarts. Geera therefore needs an external counter to preserve its model-request allowance.

1. Sign in at https://console.upstash.com/ and create a Redis database on the **Free** plan.
2. Keep it on Free. Do not enable automatic upgrades, paid plans or eviction. Do not use an unclaimed temporary database that expires in 72 hours.
3. In the database connection panel, locate **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**. Use the normal read/write token, not the read-only token.
4. Leave that page open. The only data Geera stores there is a date and request counters, not speech, explanations or drawings.

## 2. Publish the configuration to your existing GitHub repository

Run the commit/push commands supplied with this change. The repository is https://github.com/NestroyMusoke/Tegeera.

## 3. Create the Render service

1. Sign in at https://dashboard.render.com/.
2. Choose **New +**, then **Blueprint**.
3. Connect GitHub and select **NestroyMusoke/Tegeera**. Authorize only the repository access you intend to grant.
4. Select the branch containing render.yaml. Leave the Blueprint path as **render.yaml**, at the repository root.
5. Confirm that the web service plan is **Free**, not Starter or a trial paid service. The Blueprint creates no paid disk or database.
6. Fill the three prompted variables:

| Variable | Value to paste privately in Render |
| --- | --- |
| NEBIUS_API_KEY | Your current Nebius Token Factory API key |
| UPSTASH_REDIS_REST_URL | The Upstash HTTPS REST URL |
| UPSTASH_REDIS_REST_TOKEN | The Upstash read/write REST token |

7. Create/deploy the Blueprint and wait for **Live**. The address is assigned by Render; do not assume a particular geera.onrender.com name is available.

The configuration installs development dependencies for compilation, runs npm run build:web, then starts npm run start:web with Node 24. It serves the page and /api from the same origin. Render's assigned public URL becomes the allowed origin automatically. No custom domain or GitHub Pages variable is needed.

If using a custom domain later, set ALLOWED_ORIGINS to the exact HTTPS origins, comma-separated, including the Render address if you still use it. Never use a wildcard. Never set NODE_ENV to development to bypass the production checks.

## 4. Verify before sharing with judges

- Open the assigned URL and verify the film, form and examples.
- Open /api/health on that URL: provider should be nebius, configured should be true. Health alone does not prove model access or Redis availability.
- Submit a new explanation, then another without refreshing. Confirm drawings, not just a success status.
- Check the Upstash counter key geera:provider-budget:v1. Redeploy once and confirm counters remain, then submit again. Do not delete/reset the key.
- Confirm source files, .env.local and secrets cannot be downloaded from the site.
- Verify one phone session, including microphone permission and typed fallback.

## Credit protection and limits

Defaults: 80 provider attempts per UTC day, 1000 total attempts for this Redis counter, and two concurrent model requests. Corrections, glyph generation and failed provider attempts all count. One explanation may use multiple attempts. These are request caps, not a guaranteed dollar cap; token lengths vary. Check the actual Nebius balance and adjust the caps conservatively. Do not enable automatic paid top-ups if you cannot afford them.

The total counter has no expiry and survives app sleep/redeploy. The daily counter uses Redis server time. If the counter service fails, times out or refuses a reservation, Geera does not call the model. This prevents unmetered spending but makes AI temporarily unavailable. Existing drawings remain safe. The current error calls this a budget allowance failure; check Render/Upstash when it occurs.

Keep the same dedicated Redis database through judging. Changing/deleting the database resets the counter; app restarts do not. The per-client limiter conservatively uses the socket peer instead of trusting spoofable forwarded headers, so Render proxy traffic may share the short-term limit. This is not an authenticated anti-abuse system.

Render Free can sleep after 15 minutes idle and take about a minute to wake. Explain this in judging instructions. Free hosting and the free counter have quotas, not an uptime guarantee. Check credit balance and the live demo before judging; recorded video and README setup instructions remain important backups.

## Verification scope

Local automated tests cover fail-closed remote reservations, unsafe URL rejection, secret-safe errors, existing HTTP/media behavior, and packaging. Mocked REST tests do not verify a real Upstash account. A real Render/Upstash smoke test is still required after you supply the dashboard credentials.

Official references: https://render.com/docs/free, https://render.com/docs/blueprint-spec, https://upstash.com/pricing/redis, https://upstash.com/docs/redis/features/restapi.
