# Cloudflare deploy — preview vs production

High-level runbook aligned with [docs/RESTART_PLAN.md](../../docs/RESTART_PLAN.md).

## Components

| Piece | Target | Config |
|-------|--------|--------|
| HTTP API | Cloudflare Workers | `apps/api-worker/wrangler.toml` |
| SPA (signed-in app) | Cloudflare Pages (or Workers static assets) | Build `apps/web` → `dist/` |
| Marketing (public landing, SEO) | Cloudflare Pages (separate project or path) | Build `apps/marketing` → `dist/` (`vite-ssg`). At build time set **`VITE_WEB_APP_URL`** for the “Open app” link (e.g. `https://app.example.com`). |
| Postgres | Managed Postgres (external) | **Hyperdrive** binding → same logical DB as local |
| Redis | Upstash / Redis Cloud / TCP-capable provider | `REDIS_URL` (or vendor HTTP API) via secrets |

Replace the **Hyperdrive id placeholder** in `wrangler.toml` before production.

## Environment variables

### Production (Workers)

Set via **Wrangler secrets** or dashboard (never commit):

- Database: Hyperdrive handles pooling; app reads Hyperdrive binding, not raw remote URL in Worker code paths that should use the binding.
- `JWT_SECRET` (or `ACCESS_SECRET` / `REFRESH_SECRET` if split to match legacy semantics)
- **Stripe (subscriptions):** `STRIPE_SECRET_KEY`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID` for `POST /api/billing/stripe/checkout-session` and `…/portal-session`; `STRIPE_WEBHOOK_SECRET` for `POST /api/webhooks/stripe` (raw body + `Stripe-Signature`). Optional: same `STRIPE_SECRET_KEY` powers `customers.del` / `customers.update` after account delete and email change when wired in the Worker.
- `REDIS_URL` or vendor-specific vars for rate limits / sessions

### Preview (per PR / branch)

Typical pattern:

- **Preview Worker**: separate environment in Wrangler (`env.preview`) or a second Worker name; secrets scoped to a **branch database** or read-only clone.
- **Preview Pages**: branch deployments; set **environment variables** in Pages project for **public** config only (e.g. `VITE_API_URL=https://api-preview.example.com`).
- **Never** put DB passwords or signing keys in `VITE_*` client variables.
- **Marketing build:** only non-secret URLs belong in `VITE_WEB_APP_URL` (public SPA origin).

### Local

See `template.env` and `docker-compose.yml`: Postgres on `5432`, Redis on `6380`, `DATABASE_URL`, optional `DATABASE_ADMIN_URL` for template DB tests.

## CI

GitHub Actions (`.github/workflows/new-deepnotes-ci.yml`) runs lint, typecheck, tests (including Postgres-backed `@deepnotes/db` tests), `drizzle-kit check`, and build. Optional follow-up: add a **deploy** job that runs `wrangler deploy` with Cloudflare API token stored as a repo secret.

## DNS and cookies

Serve the API from a stable host (e.g. `api.deepnotes.example`) and the SPA from `app.` or apex; set cookie **`Domain`** / **`Secure`** / **`SameSite`** to match that split. Document the chosen pairing in `AUTH_AND_CORS.md` when auth ships.
