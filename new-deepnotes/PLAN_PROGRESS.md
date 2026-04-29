# Restart plan — progress (`new-deepnotes`)

Checklist for [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md). **Procedure-level map:** [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) (legacy tRPC + app-server WebSocket rows are marked **implemented** or **removed**).

**Last reviewed:** 2026-04-29

---

## Phase snapshot

| Phase | Status | Notes |
|-------|--------|--------|
| **0** — OpenAPI + Drizzle inventory | **Done** | TRPC/WS map, Drizzle baseline from `postgres-init.sql`, auth/CORS/forks docs. |
| **1** — Legacy repo hygiene | **Optional** | Only if still editing the old monorepo. |
| **2** — Repo bootstrap | **Done** | Turbo, CI, template DB tests, deploy notes. |
| **3** — REST + Drizzle | **In progress** | All **HTTP** items in TRPC_REST_MAP through **slice 10** (`…/collab-updates`), **Stripe**, **2FA**, membership, crypto bootstrap routes. **Not started:** **live Yjs collab WebSocket** and **realtime** (legacy `realtime-server` / msgpackr — separate from collab). |
| **4** — Client MVP | **In progress** | Same as Phase 4 checklist; **added** MSW + Vitest session POST contracts and `useSession` unit matrix. **Done:** Playwright demo session E2E; **Next:** optional password-login Playwright or Phase 3 collab/realtime WS MVP. |
| **5** — Cutover | **Not started** | Canary, retire `/trpc` when safe. |

---

## Legacy coverage (summary)

Cross-check [TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md): **sessions**, **users.account** (incl. Stripe), **users.pages**, **groups** (password/privacy/deletion), **pages** (create/bump/backlinks/snapshots/deletion/move), **collab bootstrap** (`GET`/`POST …/collab-updates`), and **WebSocket parity** for invites/requests/roles/remove/password/email-change/move/make-private are **implemented** on REST. **Removed by design:** user/group **rotate-keys**, **RevenueCat**.

**Intentional / optional gaps (not bugs):**

- **Anonymous public read** for `GET /api/groups/:groupId/pages` (legacy optional auth) — still auth-only; add if product needs it.
- **Stripe:** optional `checkout.session.completed` / richer webhook tests.
- **Marketing `vite-ssg`** site — `apps/marketing` (static landing + `Open app` via `VITE_WEB_APP_URL`); deploy doc updated in `docs/DEPLOY_CLOUDFLARE.md`.
- **Legacy `scheduler` / `manager` / standalone `collab-server` & `realtime-server` processes** — not ported; greenfield targets Workers + future WS/DO topology instead.

---

## Phase 0 — exit criteria

- [x] tRPC + WS → proposed REST/WS names  
- [x] OpenAPI from code  
- [x] Drizzle + baseline migration vs `postgres-init.sql`  
- [x] Auth/CORS + CLIENT_FORKS docs  

---

## Phase 3 — REST (compact)

| Area | Session / worker entrypoints (representative) |
|------|-----------------------------------------------|
| Account | `login`, `refresh`, `logout`, `demo`, `POST /api/users`, email verify, email change, password, delete, 2FA routes, billing |
| User prefs | `user-page-prefs.ts` — starting path, recents, favorites, defaults, notifications |
| Groups/pages | `group-permissions`, `group-pages`, `group-password`, `group-privacy`, `group-deletion`, `group-membership`, `group-main-and-members`, `group-invite-crypto-bootstrap`, `user-public-keyring`, `page-operations`, `page-move`, `page-collab-updates`, `stripe-billing` |

**Still to build:** WebSocket **collab** (Yjs fan-out, JWT upgrade, room per `pageId`) and **realtime** channel (legacy msgpackr-style live protocol, [RESTART_PLAN §4.3](../docs/RESTART_PLAN.md)); optional Redis hot buffer; integration tests per chosen topology.

---

## Phase 4 — client (compact)

- [x] OpenAPI codegen + `openapi-fetch` + `credentials: "include"`  
- [x] Router, `useSession`, register/login/demo/logout, 2FA branch  
- [x] Home + page list + `PageEditorView` (Tiptap + Yjs + debounced `POST …/collab-updates`)  
- [x] `@deepnotes/e2ee`, session keyrings + `passwordSalt` from login  
- [x] `/groups`, `/groups/:id`, invite landing `/invite`, join `/join`, membership crypto  
- [x] `/notifications` (ciphertext not decrypted in UI)  
- [x] MSW: `GET /api/health`, `GET /api/users/me`; ESLint `no-restricted-imports` on `src/**/*.ts`  
- [x] MSW + Vitest: session POST routes (`login`, `demo`, `refresh`, `logout`) + `useSession` flows (password login, 2FA flag, demo, logout, bootstrap)  
- [x] Playwright: demo session against real `wrangler dev` + Vite (see **E2E / Playwright** below)  
- [x] Marketing landing (`vite-ssg`): `apps/marketing`  
- [ ] Password-login (or registered-user) Playwright path; optional/crypto assertions beyond cookies  
- [ ] Capacitor / Tauri after web MVP  

### E2E / Playwright (detail)

| Item | Detail |
|------|--------|
| **Spec** | [`apps/web/e2e/session.spec.ts`](./apps/web/e2e/session.spec.ts) — “Try demo”, assert `accessToken` / `refreshToken` **not** in `document.cookie`, `loggedIn` hint present, **reload** then still “Signed in” (refresh + `/me`). |
| **Config** | [`apps/web/playwright.config.ts`](./apps/web/playwright.config.ts) — `webServer`: `pnpm --filter @deepnotes/api-worker dev` (waits on `GET /api/health`) + `pnpm --filter @deepnotes/web dev` on `127.0.0.1:5174`. |
| **CI secrets file** | [`e2e/dev.vars.ci`](./e2e/dev.vars.ci) — copied to `apps/api-worker/.dev.vars` in GitHub Actions (non-production test-only values, same shape as `account-flows.integration.test.ts`). |
| **CI DB** | Job runs `pnpm db:migrate` on the service Postgres **before** lint/test so the worker’s Hyperdrive DB matches the session integration template schema. |
| **Local** | Docker Compose Postgres on **5433** (matches `wrangler.toml` `localConnectionString`), `pnpm db:migrate`, copy `e2e/dev.vars.ci` → `apps/api-worker/.dev.vars`, then `pnpm test:e2e` from repo root. |

---

## Phase 2 & 5

**Phase 2:** [x] pnpm/Turbo, Compose Postgres+Redis, Wrangler/Hyperdrive doc, CI with template DB + `DATABASE_ADMIN_URL`, real Vitest in `@deepnotes/web`.

**Phase 5:** [ ] Staged cutover; decommission legacy when metrics + decrypt spot-checks are green.

---

## Tests & tooling (maintenance)

| Package | What runs | Notes |
|---------|-----------|-------|
| `@deepnotes/session` | **`account-flows.integration.test.ts`** — **24** `it()` when `DATABASE_URL` + admin URL set; clones template DB | Account, 2FA, groups/pages, prefs, slices 4–10, membership, collab REST |
| `@deepnotes/db` | `template-db.test.ts` — **6** FK/clone cases | |
| `@deepnotes/api` | `openapi.test.ts`, `schemas/users.test.ts`, … | |
| `@deepnotes/api-worker` | **`index.test.ts`** — **71** route × 503 matrix + **1** extra `email-verification/confirm` 503 | Totals **72** env-missing smoke cases |
| `@deepnotes/web` | Vitest + happy-dom; MSW + `useSession` tests | **34** unit smoke cases (incl. session routes + `useSession`) |
| `@deepnotes/marketing` | `vite-ssg build` → `dist/` | Static landing; `VITE_WEB_APP_URL` for app link |
| **Playwright** | `pnpm test:e2e` (root) → `@deepnotes/web` **1** spec (demo cookies + reload) | Needs migrated DB + `.dev.vars`; CI installs Chromium only |

Run session integration (from repo root):  
`pnpm --filter @deepnotes/session exec vitest run src/account-flows.integration.test.ts`  
(requires `new-deepnotes/.env` with DB URLs as in package README.)

**Follow-ups:** Redis failed-login integration; expired refresh JWT; optional OpenAPI snapshot CI drift check; second Playwright spec for email/password registration + login.

---

## Success criteria (from RESTART_PLAN §8, condensed)

- [x] OpenAPI + generated client types; no tRPC/superjson/RevenueCat/key-rotation in this tree; [CLIENT_FORKS](./docs/CLIENT_FORKS.md).  
- [x] SQL-heavy flows: template Postgres tests (`@deepnotes/db`, `@deepnotes/session`).  
- [x] Drizzle “empty → current” production upgrade doc ([docs/DRIZZLE_MIGRATIONS.md](./docs/DRIZZLE_MIGRATIONS.md)).  
- [ ] Collab **and** **realtime** each: ≥1 integration test with chosen deps.  
- [ ] Stripe (and other high-risk paths): deeper automated coverage where secrets allow.  
- [ ] Cloudflare staging: Hyperdrive + Postgres + Redis + chosen WS topology load-tested.  
- [x] Web: Vitest in CI; restricted imports from `apps/web` TS.  
- [ ] E2E smoke **complete for client MVP:** demo path [x]; password/session edge cases [ ].  

---

## Short log (newest first)

| Date | Change |
|------|--------|
| 2026-04-29 | MSW handlers + contract tests for session POST routes; Vitest `useSession` matrix (`resetSessionSingletonForTests`); plan progress (+ session integration `it()` count). |
| 2026-04-29 | `apps/marketing` (`vite-ssg` single-page), `docs/DRIZZLE_MIGRATIONS.md`, deploy doc row for marketing + `VITE_WEB_APP_URL`; plan progress. |
| 2026-04-27 | Compacted PLAN_PROGRESS; verified legacy map vs `TRPC_REST_MAP` — HTTP + listed WS flows migrated; added **realtime** vs **collab WS** distinction, optional gaps (public page list, vite-ssg, scheduler). Corrected counts: session integration `it()` tally and **72** worker 503 smokes (71-route matrix + confirm). |
| 2026-04-27 | MSW contract tests + ESLint restricted imports on web `*.ts`. |
| 2026-04-27 | Tiptap + Yjs editor; invite/join E2EE + crypto bootstrap API; members detail UI; notifications thin SPA; groups overview; collab REST + `passwordSalt`; Stripe. |

Add a row for meaningful future milestones (e.g. first collab WS, realtime MVP, cutover).
