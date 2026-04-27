# new-deepnotes

Greenfield monorepo aligned with [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md) (track execution in [PLAN_PROGRESS.md](./PLAN_PROGRESS.md)): **pnpm** + **Turbo 2**, **OpenAPI + Zod** (`@deepnotes/api`), **Drizzle** (`@deepnotes/db`), **Hono** on **Cloudflare Workers** (`@deepnotes/api-worker`), **Vue 3.5 + Vite 6** (`@deepnotes/web`), **Docker Compose** (Postgres + Redis), and CI at the parent repo (`.github/workflows/new-deepnotes-ci.yml`).

## Quickstart

```bash
cp template.env .env
docker compose up -d
pnpm install
pnpm db:migrate   # after Postgres is up
pnpm dev          # runs dev tasks in parallel (Wrangler + Vite when configured)
```

- API (local): `pnpm --filter @deepnotes/api-worker dev` — health at `/api/health`, OpenAPI JSON at `/api/openapi.json`.
- Web: `pnpm --filter @deepnotes/web dev` (port **5174**).

Replace the Hyperdrive placeholder `id` in `apps/api-worker/wrangler.toml` before deploying to Cloudflare.

License: **AGPL-3.0** (see `LICENSE`).
