# Restart plan — progress (`new-deepnotes`)

Checklist for [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md). **Procedure-level map:** [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) (legacy tRPC + app-server WebSocket rows are marked **implemented** or **removed**).

**Last reviewed:** 2026-04-27

---

## Phase snapshot

| Phase | Status | Notes |
|-------|--------|--------|
| **0** — OpenAPI + Drizzle inventory | **Done** | TRPC/WS map, Drizzle baseline from `postgres-init.sql`, auth/CORS/forks docs. |
| **1** — Legacy repo hygiene | **Optional** | Only if still editing the old monorepo. |
| **2** — Repo bootstrap | **Done** | Turbo, CI, template DB tests, deploy notes. |
| **3** — REST + Drizzle | **In progress** | All **HTTP** items in TRPC_REST_MAP through **slice 10** (`…/collab-updates`), **Stripe**, **2FA**, membership, crypto bootstrap routes. **Not started:** **live Yjs collab WebSocket** and **realtime** (legacy `realtime-server` / msgpackr — separate from collab). |
| **4** — Client MVP | **In progress** | Auth, register (E2EE), pages list, Tiptap+Yjs+REST collab, groups + invites/join E2EE, notifications (list/read; **no** body decrypt), MSW contract smoke, ESLint import walls. **Next:** Playwright (or broader MSW) for cookies; optional demo keyring for CI. |
| **5** — Cutover | **Not started** | Canary, retire `/trpc` when safe. |

---

## Legacy coverage (summary)

Cross-check [TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md): **sessions**, **users.account** (incl. Stripe), **users.pages**, **groups** (password/privacy/deletion), **pages** (create/bump/backlinks/snapshots/deletion/move), **collab bootstrap** (`GET`/`POST …/collab-updates`), and **WebSocket parity** for invites/requests/roles/remove/password/email-change/move/make-private are **implemented** on REST. **Removed by design:** user/group **rotate-keys**, **RevenueCat**.

**Intentional / optional gaps (not bugs):**

- **Anonymous public read** for `GET /api/groups/:groupId/pages` (legacy optional auth) — still auth-only; add if product needs it.
- **Stripe:** optional `checkout.session.completed` / richer webhook tests.
- **Marketing `vite-ssg`** site — not in this tree yet (RESTART_PLAN §5.1).
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
- [ ] Playwright (or equivalent) E2E for httpOnly session  
- [ ] Capacitor / Tauri after web MVP  

---

## Phase 2 & 5

**Phase 2:** [x] pnpm/Turbo, Compose Postgres+Redis, Wrangler/Hyperdrive doc, CI with template DB + `DATABASE_ADMIN_URL`, real Vitest in `@deepnotes/web`.

**Phase 5:** [ ] Staged cutover; decommission legacy when metrics + decrypt spot-checks are green.

---

## Tests & tooling (maintenance)

| Package | What runs | Notes |
|---------|-----------|--------|
| `@deepnotes/session` | **`account-flows.integration.test.ts`** — **20** `it()` when `DATABASE_URL` + admin URL set; clones template DB | Account, 2FA, groups/pages, prefs, slices 4–10, membership, collab REST |
| `@deepnotes/db` | `template-db.test.ts` — **6** FK/clone cases | |
| `@deepnotes/api` | `openapi.test.ts`, `schemas/users.test.ts`, … | |
| `@deepnotes/api-worker` | **`index.test.ts`** — **71** route × 503 matrix + **1** extra `email-verification/confirm` 503 | Totals **72** env-missing smoke cases |
| `@deepnotes/web` | Vitest + happy-dom; composable/API tests | Extend MSW/login matrix; Playwright later |

Run session integration (from repo root):  
`pnpm --filter @deepnotes/session exec vitest run src/account-flows.integration.test.ts`  
(requires `new-deepnotes/.env` with DB URLs as in package README.)

**Follow-ups:** Redis failed-login integration; expired refresh JWT; optional OpenAPI snapshot CI drift check.

---

## Success criteria (from RESTART_PLAN §8, condensed)

- [x] OpenAPI + generated client types; no tRPC/superjson/RevenueCat/key-rotation in this tree; [CLIENT_FORKS](./docs/CLIENT_FORKS.md).  
- [x] SQL-heavy flows: template Postgres tests (`@deepnotes/db`, `@deepnotes/session`).  
- [ ] Drizzle “empty → current” production upgrade doc.  
- [ ] Collab **and** **realtime** each: ≥1 integration test with chosen deps.  
- [ ] Stripe (and other high-risk paths): deeper automated coverage where secrets allow.  
- [ ] Cloudflare staging: Hyperdrive + Postgres + Redis + chosen WS topology load-tested.  
- [x] Web: Vitest in CI; restricted imports from `apps/web` TS.  
- [ ] E2E smoke (cookies) before calling client MVP “done”.  

---

## Short log (newest first)

| Date | Change |
|------|--------|
| 2026-04-27 | Compacted PLAN_PROGRESS; verified legacy map vs `TRPC_REST_MAP` — HTTP + listed WS flows migrated; added **realtime** vs **collab WS** distinction, optional gaps (public page list, vite-ssg, scheduler). Corrected counts: **20** session integration `it()`, **72** worker 503 smokes (71-route matrix + confirm). |
| 2026-04-27 | MSW contract tests + ESLint restricted imports on web `*.ts`. |
| 2026-04-27 | Tiptap + Yjs editor; invite/join E2EE + crypto bootstrap API; members detail UI; notifications thin SPA; groups overview; collab REST + `passwordSalt`; Stripe. |

Add a row for meaningful future milestones (e.g. first collab WS, realtime MVP, cutover).
