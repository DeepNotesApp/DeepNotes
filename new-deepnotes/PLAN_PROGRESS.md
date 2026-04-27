# Restart plan — progress (new-deepnotes)

Living checklist for the greenfield work described in [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md). Update this file when phases advance or decisions change.

**Last reviewed:** 2026-04-26

---

## Phase snapshot

| Phase | Status | Notes |
|-------|--------|--------|
| **0** — OpenAPI + Drizzle inventory | **Done** | tRPC→REST/WS map: [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md). Drizzle + migration `0000_legacy_baseline` match `postgres-init.sql` core tables. Auth/CORS/forks: [docs/AUTH_AND_CORS.md](./docs/AUTH_AND_CORS.md), [docs/CLIENT_FORKS.md](./docs/CLIENT_FORKS.md). |
| **1** — Legacy repo hygiene | **Optional / n/a** | Parallel track only if still editing the old monorepo. |
| **2** — Repo bootstrap | **Mostly done** | Template DB integration test + CI `DATABASE_ADMIN_URL`; deploy doc: [docs/DEPLOY_CLOUDFLARE.md](./docs/DEPLOY_CLOUDFLARE.md). Optional: Wrangler deploy job. |
| **3** — REST + Drizzle features | **In progress** | `POST /api/sessions/login|refresh|logout` wired via `@deepnotes/session` (Drizzle + legacy crypto + `jose` JWT + cookies). `POST /api/sessions/demo` still `501`. Next: Redis-backed login rate limits, `start-demo` / registration, `GET /api/users/me`. |
| **4** — Client MVP | **Not started** | Auth → list → page → Yjs → groups; crypto/libs port as needed. |
| **5** — Cutover | **Not started** | Canary, redirect, retire `/trpc` when safe. |

---

## Phase 0 checklist (exit: OpenAPI v0 + Drizzle in repo + feature checklist)

- [x] Map legacy **tRPC** procedures + **WebSocket** handlers → proposed REST/WS names (skeleton routes may return `501`).
- [x] **OpenAPI** published from code (v0: health + spec endpoint); expand paths as features land.
- [x] Transcribe **`postgres-init.sql`** → Drizzle schema + baseline migration (`0000_legacy_baseline`: `pgcrypto`, `nanoid()`, core tables, FKs aligned with Drizzle; legacy `NOT VALID` FKs omitted for fresh installs).
- [x] Document **cookie names**, **JWT** claims, **CORS** origins → [docs/AUTH_AND_CORS.md](./docs/AUTH_AND_CORS.md).
- [x] List **`@deepnotes/*` forks** the new client will not use (exception list with owners if any remain) → [docs/CLIENT_FORKS.md](./docs/CLIENT_FORKS.md).

---

## Phase 3 checklist (REST + Drizzle)

- [x] Document **sessions** REST paths + request schemas in OpenAPI; worker returns **501** until handlers exist.
- [x] Implement **sessions.login** / refresh / logout against Drizzle + legacy crypto semantics (JWT via `jose`; **Redis** rate limits not wired yet—parity with legacy `login` lockouts).
- [ ] Implement **sessions.start-demo** (registration path) + **Redis** for failed-login / optional session cache.
- [x] **JWT + httpOnly cookies** (`accessToken`, `refreshToken`, `loggedIn`) matching [docs/AUTH_AND_CORS.md](./docs/AUTH_AND_CORS.md).
- [ ] **Users** registration + `GET /api/users/me` (and remaining TRPC_REST_MAP slices as needed).
- [ ] Pages/groups CRUD, realtime/collab, Stripe webhook (no RevenueCat).

---

## Phase 2 checklist (bootstrap)

- [x] pnpm + Turborepo 2, Node 22+.
- [x] Docker Compose: Postgres + Redis (`REDIS_URL`-style in `template.env`).
- [x] Cloudflare: `wrangler.toml`, Hyperdrive binding (replace placeholder `id` before prod).
- [x] Document **Pages** / preview vs production env vars; optional deploy job to CF preview → [docs/DEPLOY_CLOUDFLARE.md](./docs/DEPLOY_CLOUDFLARE.md).
- [x] CI: lint, typecheck, tests, `drizzle-kit check`, build (Postgres service present for future migrate/tests).
- [x] CI: Postgres role with **CREATEDB** + **template DB** integration tests (RESTART_PLAN §5.7) — `DATABASE_ADMIN_URL` + `src/template-db.test.ts`.

---

## Success criteria (RESTART_PLAN §8)

- [ ] OpenAPI source of truth; client **generated** types or shared Zod.
- [ ] Drizzle migrations from empty DB documented for production upgrades.
- [ ] Cold API dev start under **2 s** (no `inspect-brk` by default) — validate on a typical laptop.
- [ ] Collab + realtime: at least one integration test each (Redis + deps).
- [x] SQL-heavy paths: real Postgres tests; prefer **template DB** cloning (§5.7) — `@deepnotes/db` template test.
- [ ] Auth, crypto, Stripe: automated coverage beyond smoke; **no** generic repository layer (§5.0).
- [x] No tRPC / superjson / RevenueCat / key-rotation in **this** tree (keep absent); product sign-off for IAP/Stripe when billing ships.
- [x] Client: zero undocumented forks, or a short owned exception list — see [docs/CLIENT_FORKS.md](./docs/CLIENT_FORKS.md).
- [ ] Cloudflare: deploy runbook; Hyperdrive + Postgres + Redis proven in staging; collab/realtime topology chosen and load-tested.

---

## Short log (newest first)

| Date | Change |
|------|--------|
| 2026-04-26 | Phase 3: `@deepnotes/session` (login/refresh/logout + 2FA TOTP/recovery), api-worker Hyperdrive + dynamic import for Workers bundle; OpenAPI 200/401/503 for session routes; demo remains `501`; session crypto vendored in-package (no parent `@stdlib` links); `libsodium-wrappers-sumo@^0.8` override for Wrangler. |
| 2026-04-26 | Phase 3 start: OpenAPI + Zod for `POST /api/sessions/login|refresh|logout|demo`; api-worker `501` stubs; Phase 0 marked done in snapshot. |
| 2026-04-26 | Phase 0 docs (TRPC_REST_MAP, AUTH_AND_CORS, CLIENT_FORKS); Phase 2 deploy doc; Drizzle legacy baseline from `postgres-init.sql`; Vitest template-DB integration test + CI `DATABASE_ADMIN_URL`. |
| 2026-04-26 | Initial `new-deepnotes` monorepo: `@deepnotes/api`, `@deepnotes/db`, `@deepnotes/api-worker`, `@deepnotes/web`, CI workflow. |

Add a row here for meaningful milestones (e.g. “auth MVP”, “first Drizzle migration from legacy schema”).
