# Restart plan — progress (new-deepnotes)

Living checklist for the greenfield work described in [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md). Update this file when phases advance or decisions change.

**Last reviewed:** 2026-04-26

---

## Phase snapshot

| Phase | Status | Notes |
|-------|--------|--------|
| **0** — OpenAPI + Drizzle inventory | **In progress** | Minimal OpenAPI (`/api/health`) and Drizzle chain exist; full tRPC→REST map, `postgres-init.sql` transcription, auth env doc still open. |
| **1** — Legacy repo hygiene | **Optional / n/a** | Parallel track only if still editing the old monorepo. |
| **2** — Repo bootstrap | **Mostly done** | pnpm + Turbo 2, Node ≥22, Docker Postgres/Redis, `template.env`, Hono worker + Wrangler + Hyperdrive stub, Vue+Vite web shell, root CI (`new-deepnotes-ci.yml`). Missing: Pages/preview env doc, **CREATEDB** + template-DB integration tests (§5.7). |
| **3** — REST + Drizzle features | **Not started** | Auth/sessions, pages/groups, realtime/collab, Stripe (no RevenueCat). |
| **4** — Client MVP | **Not started** | Auth → list → page → Yjs → groups; crypto/libs port as needed. |
| **5** — Cutover | **Not started** | Canary, redirect, retire `/trpc` when safe. |

---

## Phase 0 checklist (exit: OpenAPI v0 + Drizzle in repo + feature checklist)

- [ ] Map legacy **tRPC** procedures + **WebSocket** handlers → proposed REST/WS names (skeleton routes may return `501`).
- [x] **OpenAPI** published from code (v0: health + spec endpoint); expand paths as features land.
- [ ] Transcribe **`postgres-init.sql`** → Drizzle schema + follow-on migrations (bootstrap `app_meta` / `0000` is only a placeholder).
- [ ] Document **cookie names**, **JWT** claims, **CORS** origins.
- [ ] List **`@deepnotes/*` forks** the new client will not use (exception list with owners if any remain).

---

## Phase 2 checklist (bootstrap)

- [x] pnpm + Turborepo 2, Node 22+.
- [x] Docker Compose: Postgres + Redis (`REDIS_URL`-style in `template.env`).
- [x] Cloudflare: `wrangler.toml`, Hyperdrive binding (replace placeholder `id` before prod).
- [ ] Document **Pages** / preview vs production env vars; optional deploy job to CF preview.
- [x] CI: lint, typecheck, tests, `drizzle-kit check`, build (Postgres service present for future migrate/tests).
- [ ] CI: Postgres role with **CREATEDB** + **template DB** integration tests (RESTART_PLAN §5.7).

---

## Success criteria (RESTART_PLAN §8)

- [ ] OpenAPI source of truth; client **generated** types or shared Zod.
- [ ] Drizzle migrations from empty DB documented for production upgrades.
- [ ] Cold API dev start under **2 s** (no `inspect-brk` by default) — validate on a typical laptop.
- [ ] Collab + realtime: at least one integration test each (Redis + deps).
- [ ] SQL-heavy paths: real Postgres tests; prefer **template DB** cloning (§5.7).
- [ ] Auth, crypto, Stripe: automated coverage beyond smoke; **no** generic repository layer (§5.0).
- [x] No tRPC / superjson / RevenueCat / key-rotation in **this** tree (keep absent); product sign-off for IAP/Stripe when billing ships.
- [ ] Client: zero undocumented forks, or a short owned exception list.
- [ ] Cloudflare: deploy runbook; Hyperdrive + Postgres + Redis proven in staging; collab/realtime topology chosen and load-tested.

---

## Short log (newest first)

| Date | Change |
|------|--------|
| 2026-04-26 | Initial `new-deepnotes` monorepo: `@deepnotes/api`, `@deepnotes/db`, `@deepnotes/api-worker`, `@deepnotes/web`, CI workflow. |

Add a row here for meaningful milestones (e.g. “auth MVP”, “first Drizzle migration from legacy schema”).
