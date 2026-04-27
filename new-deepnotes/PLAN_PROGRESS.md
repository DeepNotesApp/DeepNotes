# Restart plan — progress (new-deepnotes)

Living checklist for the greenfield work described in [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md). Update this file when phases advance or decisions change.

**Last reviewed:** 2026-04-26

---

## Phase snapshot

| Phase | Status | Notes |
|-------|--------|--------|
| **0** — OpenAPI + Drizzle inventory | **Done** | tRPC→REST/WS map: [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md). Drizzle + migration `0000_legacy_baseline` match `postgres-init.sql` core tables. Auth/CORS/forks: [docs/AUTH_AND_CORS.md](./docs/AUTH_AND_CORS.md), [docs/CLIENT_FORKS.md](./docs/CLIENT_FORKS.md). |
| **1** — Legacy repo hygiene | **Optional / n/a** | Parallel track only if still editing the old monorepo. |
| **2** — Repo bootstrap | **Mostly done** | Template DB integration test + CI `DATABASE_ADMIN_URL`; deploy doc: [docs/DEPLOY_CLOUDFLARE.md](./docs/DEPLOY_CLOUDFLARE.md). Optional: Wrangler deploy job. **Gap:** `apps/web` tests still no-op—see Phase 2 checklist + [Frontend / UI track](#frontend--ui-track). |
| **3** — REST + Drizzle features | **In progress** | Auth + registration + **email resend/confirm** (Resend) below; optional **Upstash** for login rate limits. **Next (Phase 3):** pages/groups CRUD, realtime/collab, **Stripe** webhook, then Phase 2 gap (**real `apps/web` tests** in parallel is OK). |
| **4** — Client MVP | **Not started** | Auth → list → page → Yjs → groups; crypto/libs port as needed. **Parallel:** SPA structure, OpenAPI client, Vitest+DOM in CI, small E2E smoke—see [Frontend / UI track](#frontend--ui-track) (not deferred to “when MVP is done”). |
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

### Sessions + account (current)

- [x] Document **sessions** REST paths + request schemas in OpenAPI; demo + `users/me` contracts updated.
- [x] Implement **sessions.login** / refresh / logout against Drizzle + legacy crypto semantics (JWT via `jose`; optional **Redis** failed-login limits when Upstash env is set).
- [x] Implement **sessions.start-demo** (`POST /api/sessions/demo`) + **Redis** for failed-login when Upstash env is set.
- [x] **JWT + httpOnly cookies** (`accessToken`, `refreshToken`, `loggedIn`) matching [docs/AUTH_AND_CORS.md](./docs/AUTH_AND_CORS.md).
- [x] **`GET /api/users/me`** (minimal summary from `accessToken` cookie).
- [x] **Users** `POST /api/users` registration (crypto payload aligned with demo; conflict / unverified parity; `SEND_EMAILS=false` auto-verifies; when mail is on, `RESEND_API_KEY` required and registration email is sent after commit).
- [x] **Users — email verification**
  - [x] `POST /api/users/email-verification/resend` — public, `{ "email" }` (legacy `resendVerificationEmail`); 204 / 400 / 404 / 409 / 502 / 503; [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) updated (paths are **not** under `/me/`; legacy was never cookie-based).
  - [x] `POST /api/users/email-verification/confirm` — public, `{ "emailVerificationCode" }` (nanoid, legacy `verifyEmail`); 204 / 400; DB update copies `encrypted_new_email` → `encrypted_email`.
  - [x] `sendRegistrationEmail` + optional **`RESEND_API_KEY`**, optional **`PUBLIC_APP_URL`** in `SessionEnv` / [template.env](./template.env); duplicate unverified registration re-sends via same helper (401 “New email sent”).

### Not started (Phase 3 remainder)

- [ ] **Account (remaining tRPC):** `POST /api/users/me/email-change` (+ confirm), 2FA enable/load/disable/recovery routes from [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md), `DELETE /api/users/me`, password change (see map + legacy WS).
- [ ] **Pages** (user prefs + CRUD) and **groups** CRUD / privacy / passwords per map.
- [ ] **Realtime / collab** (new or adapted protocols; no key rotation).
- [ ] **Stripe:** `POST /api/webhooks/stripe`, checkout/portal (no RevenueCat).

---

## Phase 4 checklist (client MVP)

- [ ] **Tooling:** Vitest + `jsdom` or `happy-dom` + `@vue/test-utils`; `@vitejs/plugin-vue` in Vitest config (same as [Frontend / UI track](#frontend--ui-track)).
- [ ] **API client:** consume **OpenAPI** (generated types + `fetch`, or hey-api) from `@deepnotes/api` / published spec—**no** workspace dependency on Worker or DB packages from web source.
- [ ] **Routing + auth UI:** login / refresh / logout / 2FA flows aligned with [docs/AUTH_AND_CORS.md](./docs/AUTH_AND_CORS.md); composable or component tests + **E2E smoke** for cookie session.
- [ ] **Pages:** list → open editor shell → integrate **Yjs** / collab when API is ready.
- [ ] **Groups** subset and notifications UX as mapped from [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md).
- [ ] **Native wrappers** (Capacitor / Tauri): only after web MVP and CI stable.

---

## Phase 2 checklist (bootstrap)

- [x] pnpm + Turborepo 2, Node 22+.
- [x] Docker Compose: Postgres + Redis (`REDIS_URL`-style in `template.env`).
- [x] Cloudflare: `wrangler.toml`, Hyperdrive binding (replace placeholder `id` before prod).
- [x] Document **Pages** / preview vs production env vars; optional deploy job to CF preview → [docs/DEPLOY_CLOUDFLARE.md](./docs/DEPLOY_CLOUDFLARE.md).
- [x] CI: lint, typecheck, tests, `drizzle-kit check`, build (Postgres service present for future migrate/tests).
- [x] CI: Postgres role with **CREATEDB** + **template DB** integration tests (RESTART_PLAN §5.7) — `DATABASE_ADMIN_URL` + `src/template-db.test.ts`.
- [ ] **Web package tests are real:** `apps/web` currently uses a **no-op** `test` script; replace with **Vitest** + `jsdom` or `happy-dom` + `@vue/test-utils` and wire into root `pnpm test` / CI (RESTART_PLAN §5.8).

---

## Frontend / UI track

Cross-cutting work so the new SPA does not repeat **legacy `apps/client`** patterns: **tRPC + `AppRouter`**, **deep `@deepnotes/app-server` imports** for WS types, **auto-imported globals** (`trpcClient`, `internals`, stores), **~400+** mixed layout/code files, and **no** `*.test.*` / `*.spec.*` under the legacy client tree.

### Decoupling and layout (`@deepnotes/web`)

- [ ] **Forbidden imports:** no `@deepnotes/api-worker`, `@deepnotes/db`, or Drizzle from `apps/web` source; HTTP only via a small **API layer** (generated OpenAPI client or `fetch` + shared types from `@deepnotes/api`).
- [ ] **Feature folders:** e.g. `src/features/auth`, `src/features/pages`, `src/shared/ui`—document the convention in `apps/web/README.md` (or link from repo root README).
- [ ] **Thin Vue, fat composables:** session and crypto orchestration live in testable modules, not only in `.vue` files.

### Testing (see RESTART_PLAN §5.8)

- [ ] **Vitest** in `apps/web` with DOM environment and `@vitejs/plugin-vue` aligned with Vite 6.
- [ ] **Component or composable tests** for the first **auth** / session flows (forms, validation, error mapping from API).
- [ ] **Contract tests** for the fetch wrapper (MSW or recorded OpenAPI fixtures)—optional until multiple features consume the API.
- [ ] **E2E smoke** (Playwright recommended): login or session refresh with **httpOnly cookies** against **local compose** or **Cloudflare preview**—add CI job when stable enough (can start `manual`/`workflow_dispatch` if cost is a concern).

### Progress vs legacy (reference only)

| Legacy (`apps/client`) | New (`new-deepnotes/apps/web`) |
|------------------------|--------------------------------|
| Quasar + Vite 2, 4GB heap builds | Vite 6 + Vue 3.5, minimal app shell today |
| Imports `AppRouter`, server websocket paths | Must use **OpenAPI** + documented WS only |
| No automated UI tests | **To do:** real `test` script + CI |

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
- [ ] Web: Vitest + DOM env in CI; no server/db imports from web source; E2E smoke for session cookies (RESTART_PLAN §8 extended items).

---

## Short log (newest first)

| Date | Change |
|------|--------|
| 2026-04-26 | Phase 3: email verification `POST /api/users/email-verification/resend` and `…/confirm`; `performResendEmailVerification` / `performConfirmEmailVerification`; Resend in `sendRegistrationEmail`; `RESEND_API_KEY` + `PUBLIC_APP_URL`; first mail on register + re-send on duplicate unverified; OpenAPI 502 on register if provider fails; `c.env?.HYPERDRIVE` on confirm for Vitest. |
| 2026-04-26 | Phase 3: **`POST /api/users`** (`performUserRegister`), `encryptUserRehashedLoginHash`, `addHours`, OpenAPI 201/400/401/409; optional **`SEND_EMAILS`** on session env (auto-verify when `false`); group password on register still rejected (same as demo). |
| 2026-04-26 | Phase 3: `POST /api/sessions/demo` (`performSessionStartDemo`), `GET /api/users/me`, Redis failed-login limits (`SessionRedisPort` + optional Upstash), `USER_EMAIL_ENCRYPTION_KEY` on `SessionEnv`; OpenAPI 200/400 for demo, 429 for login, `userMeResponseSchema`; Vitest `login-rate-limit.test.ts`. |
| 2026-04-26 | Docs: [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md) §3.5 legacy frontend pain points, §5.8 frontend testing/CI, phased updates; this file: **Frontend / UI track** + Phase 2/4 notes on real web tests. |
| 2026-04-26 | Phase 3: `@deepnotes/session` (login/refresh/logout + 2FA TOTP/recovery), api-worker Hyperdrive + dynamic import for Workers bundle; OpenAPI 200/401/503 for session routes; demo remains `501`; session crypto vendored in-package (no parent `@stdlib` links); `libsodium-wrappers-sumo@^0.8` override for Wrangler. |
| 2026-04-26 | Phase 3 start: OpenAPI + Zod for `POST /api/sessions/login|refresh|logout|demo`; api-worker `501` stubs; Phase 0 marked done in snapshot. |
| 2026-04-26 | Phase 0 docs (TRPC_REST_MAP, AUTH_AND_CORS, CLIENT_FORKS); Phase 2 deploy doc; Drizzle legacy baseline from `postgres-init.sql`; Vitest template-DB integration test + CI `DATABASE_ADMIN_URL`. |
| 2026-04-26 | Initial `new-deepnotes` monorepo: `@deepnotes/api`, `@deepnotes/db`, `@deepnotes/api-worker`, `@deepnotes/web`, CI workflow. |

Add a row here for meaningful milestones (e.g. “auth MVP”, “first Drizzle migration from legacy schema”).
