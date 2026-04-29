# Drizzle migrations — production upgrade path

How to take an **empty** PostgreSQL database to the **current** `@deepnotes/db` schema in staging or production, aligned with [docs/RESTART_PLAN.md](../../docs/RESTART_PLAN.md).

## Prerequisites

- **Role** can connect and create objects in the target database (migration SQL runs as the configured user).
- **`DATABASE_URL`** matches the database you are migrating (same host/port/name as the app will use via Hyperdrive or direct `postgres`).
- **Artifacts**: migration files live under `packages/db/migrations/` and are applied by **Drizzle Kit** (`drizzle-kit migrate`), not by manually replaying `postgres-init.sql` long term.

## One-time apply (empty → current)

1. Create an empty database (no tables), or use a fresh Postgres instance dedicated to the app.

2. From the **`new-deepnotes`** repo root, set `DATABASE_URL` (and optionally load `.env`):

   ```bash
   export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
   ```

3. Run migrations:

   ```bash
   pnpm db:migrate
   ```

   This invokes `drizzle-kit migrate` for `@deepnotes/db` using `packages/db/drizzle.config.ts`.

4. Verify schema expectations:

   ```bash
   pnpm db:check
   ```

5. Configure **Workers** / runtime secrets (`JWT_*`, Redis, Stripe, etc.) per `template.env` and [docs/DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md). Hyperdrive should point at the **same** logical database you migrated.

## Upgrades when migrations already exist

When you ship new migration files:

1. Back up production (snapshot or logical dump) before applying.

2. Run **`pnpm db:migrate`** against the **production** `DATABASE_URL` during a maintenance window or automated deploy step **before** rolling out Workers that assume new columns or constraints.

3. Run **`pnpm db:check`** in CI on every change (already in `.github/workflows/new-deepnotes-ci.yml`) so drift between `schema.ts` and migration folders is caught early.

## Recovery notes

- **`postgres-init.sql`** in the legacy monorepo was the historical baseline; the greenfield chain starts at **`0000_legacy_baseline.sql`** (and follow-ups such as `0001_*`). New environments should rely **only** on the Drizzle migration folder, not on copying the old dump wholesale, unless you are doing a special one-off import.

- Integration tests that clone a template DB (`DATABASE_ADMIN_URL`, template pattern in RESTART_PLAN §5.7) migrate **once** into the template, then clone per test — that validates migrations against real Postgres without replacing this production runbook.
