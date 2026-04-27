# Restart plan — progress (new-deepnotes)

Living checklist for the greenfield work described in [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md). Update this file when phases advance or decisions change.

**Last reviewed:** 2026-04-27

---

## Phase snapshot

| Phase | Status | Notes |
|-------|--------|--------|
| **0** — OpenAPI + Drizzle inventory | **Done** | tRPC→REST/WS map: [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md). Drizzle + migration `0000_legacy_baseline` match `postgres-init.sql` core tables. Auth/CORS/forks: [docs/AUTH_AND_CORS.md](./docs/AUTH_AND_CORS.md), [docs/CLIENT_FORKS.md](./docs/CLIENT_FORKS.md). |
| **1** — Legacy repo hygiene | **Optional / n/a** | Parallel track only if still editing the old monorepo. |
| **2** — Repo bootstrap | **Done** | Template DB integration test + CI `DATABASE_ADMIN_URL`; deploy doc: [docs/DEPLOY_CLOUDFLARE.md](./docs/DEPLOY_CLOUDFLARE.md). **`@deepnotes/web`:** Vitest + happy-dom + `@vue/test-utils`; `vite.config` uses `defineConfig` from `vitest/config`. Optional: Wrangler deploy job. |
| **3** — REST + Drizzle features | **In progress** | Account surface includes **2FA** (`/api/users/me/2fa/...`); see [2FA HTTP routes](#2fa-http-routes-phase-3). **Next (priority):** pages + groups CRUD (per [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md)) → realtime/collab → Stripe webhook. |
| **4** — Client MVP | **Not started** | Auth → list → page → Yjs → groups; crypto/libs port as needed. **Parallel:** SPA structure, OpenAPI client, small E2E smoke—see [Frontend / UI track](#frontend--ui-track). |
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

### Test coverage (Phase 3 account surface)

- [x] **Rate limit:** failed login counters (`login-rate-limit.test.ts`).
- [x] **Email crypto:** `encryptUserEmail` / `decryptUserEmail` + `hashUserEmail` (legacy parity cases).
- [x] **Email change mailer:** `sendEmailChangeVerificationEmail` (dev skip, missing API key, Resend errors/success via mocked `fetch`).
- [x] **HTTP contracts:** OpenAPI path presence; Zod for `userEmailChange*`, password change, **2FA** bodies + finish TOTP (`schemas/users.test.ts`).
- [x] **Worker smoke:** `503` when env/DB not configured for `/api/users/me/email-change` (+ confirm), alongside other session routes.
- [x] **DB integration (template Postgres):** `account-flows.integration.test.ts` (renamed from `email-change.integration.test.ts`). See [Phase 3 test coverage (detail)](#phase-3-test-coverage-detail) for the per-case list.

### Phase 3 test coverage (detail)

Integration tests use `describe.skipIf` when `DATABASE_URL` (and admin URL for `CREATE DATABASE`) are unset; they clone template `dn_test_tpl_session_email` (isolated from `@deepnotes/db`’s `dn_test_tpl_deepnotes` so **Turbo** can run both packages in parallel).

| Test case | Exercises | Assertions |
|-----------|-----------|------------|
| Register → email-change request → confirm | `performUserRegister`, `performUserEmailChange*`, `signAccessToken` | New email in `decryptUserEmail` + `email_hash` match; `encrypted_new_email` / `email_verification_code` cleared; clear-session cookie lines on confirm. |
| Email change request, wrong password | `performUserEmailChangeRequest` | **400** `BAD_REQUEST` when `oldLoginHash` does not match. |
| Email change confirm, wrong 6-digit code | `performUserEmailChangeConfirm` | **400** `BAD_REQUEST` (code mismatch). |
| Password change, happy path | `performUserPasswordChange` | After change: PHC decrypts to a hash matching **new** password; private + symmetric keyrings **unwrap** with the same `derivePasswordValues` key as login (salt from stored PHC), round-trip to the new keyring bytes passed in. |
| Password change invalidates sessions | `performUserPasswordChange` + explicit `devices` / `sessions` insert | `sessions.invalidated === true` for the user. |
| Password change, wrong old password | `performUserPasswordChange` | **400** `BAD_REQUEST`. |

**Not yet in integration:** `performSessionLogin` + refresh (cookie/session rows), Redis failed-login with real `ioredis`/Upstash, demo account **403** on password change (covered in unit path via `performUserPasswordChange` branches if added later).

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
- [x] **`DELETE /api/users/me`** — replaces legacy `users.account.delete`: JSON `{ "loginHash" }` (base64); verifies access JWT + password (`encrypted_rehashed_login_hash`); blocks when any membership has `member_count > 1` and `owner_count <= 1`; deletes join invites/requests, solo-member groups (cascade pages), remaining `group_members`, then user row; clears session cookies; optional `deleteStripeCustomer(customerId)` hook (worker can wire Stripe later; failures swallowed like legacy).
- [x] **`POST /api/users/me/password`** — replaces legacy WS `change-password` (two RPC steps → one REST call after client re-wraps keyrings). **`performUserPasswordChange`** (`packages/session/src/change-user-password.ts`): body `oldLoginHash`, `newLoginHash`, `userEncryptedPrivateKeyring`, `userEncryptedSymmetricKeyring` (base64, same semantics as `POST /api/users`); verifies current password; **403** if `users.demo === true`; updates `encrypted_rehashed_login_hash`, `encrypted_private_keyring`, `encrypted_symmetric_keyring`; sets **`sessions.invalidated`** for all user sessions; **204** + **`buildClearSessionCookies`**. Contract: `userPasswordChangeRequestSchema` in `@deepnotes/api`; map in [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md).

### Account routes still to ship (Phase 3)

- [x] **Email change**
  - [x] `POST /api/users/me/email-change` — `performUserEmailChangeRequest`: `oldLoginHash` + `newEmail`; **403** demo, **400** bad password or “email already in use” (global `email_hash` match, same as legacy); sets `encrypted_new_email` + 6-digit `email_verification_code`; Resend (subject/body like legacy) or **200** `{ "emailVerificationCode" }` when `SEND_EMAILS=false`; **204** when emailed.
  - [x] `POST /api/users/me/email-change/confirm` — `performUserEmailChangeConfirm`: one call (WS two-step collapsed); `oldLoginHash`, `emailVerificationCode` (6 digits), `newLoginHash`, `userEncrypted*Keyring` (b64, same as register/password); verifies code + password; applies new `encrypted_email` / `email_hash`, clears pending fields, PHC + rewrapped keyrings, invalidates **all** `sessions`, **204** + `buildClearSessionCookies`; optional `updateStripeCustomerEmail` in worker (matches legacy `customers.update` after commit, errors non-fatal).
  - [x] **`decryptUserEmail`** in `@deepnotes/session` for confirm; **`sendEmailChangeVerificationEmail`** (Resend); OpenAPI + [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) updated.
- [x] **2FA (HTTP surface)** — Hono + OpenAPI: `user-two-factor-settings.ts` (`encryptUserAuthenticatorSecret` in `session-crypto`). Routes: [2FA HTTP routes](#2fa-http-routes-phase-3). `load` is **`POST /api/users/me/2fa/load`** (password in JSON, not a `GET` — [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) footnote). **Not yet in integration template DB:** 2FA enable → login with TOTP (optional follow-up; login path already uses `assertTwoFactorOk` in [two-factor.ts](./packages/session/src/two-factor.ts)).

### 2FA HTTP routes (Phase 3)

| Path | Replaces (legacy) | Request body | Success |
|------|-------------------|-------------|---------|
| `POST /api/users/me/2fa/enable/request` | `twoFactorAuth.enable.request` | `{ "loginHash" }` b64 | **200** `{ "secret", "keyUri" }` (pending TOTP, not yet enabled) |
| `POST /api/users/me/2fa/enable/finish` | `twoFactorAuth.enable.finish` | `{ "loginHash", "authenticatorToken" }` (6 digits) | **200** `{ "recoveryCodes" }` (6 × 32-char hex) |
| `POST /api/users/me/2fa/load` | `twoFactorAuth.load` | `{ "loginHash" }` | **200** `{ "secret", "keyUri" }` (2FA must already be on) |
| `POST /api/users/me/2fa/recovery-codes` | `generateRecoveryCodes` | `{ "loginHash" }` | **200** new recovery codes |
| `POST /api/users/me/2fa/devices/forget` | `forgetTrustedDevices` | `{ "loginHash" }` | **204** |
| `POST /api/users/me/2fa/disable` | `disable` | `{ "loginHash" }` | **204** |

- **Parity:** Demo accounts **403**; wrong password **400** “Password is incorrect.”; TOTP fail on finish **400** “Authenticator token is incorrect.”; `otplib` `keyuri` issuer **“DeepNotes”** (same as legacy tRPC). Recovery codes: `libsodium` hex + [hashRecoveryCode / encryptRecoveryCodes](packages/session/src/crypto/session-crypto.ts) (legacy-equivalent). Forget devices: `UPDATE devices SET trusted = false` for `user_id`.

### Not started (Phase 3 — pages, groups, infra)

- [ ] **Pages** (user prefs + CRUD) and **groups** CRUD / privacy / passwords per map.
- [ ] **Realtime / collab** (new or adapted protocols; no key rotation).
- [ ] **Stripe:** `POST /api/webhooks/stripe`, checkout/portal (no RevenueCat); wire **`deleteStripeCustomer`** from account delete when keys exist.

---

## Phase 4 checklist (client MVP)

- [x] **Tooling (bootstrap):** Vitest + **happy-dom** + `@vue/test-utils` in `@deepnotes/web` (minimal `App` test); same Vite 6 pipeline via `vitest/config` `defineConfig` (RESTART_PLAN §5.8).
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
- [x] **Web package tests are real:** `@deepnotes/web` runs `vitest run` with happy-dom; `src/app.test.ts` mounts `App.vue` (RESTART_PLAN §5.8).

---

## Frontend / UI track

Cross-cutting work so the new SPA does not repeat **legacy `apps/client`** patterns: **tRPC + `AppRouter`**, **deep `@deepnotes/app-server` imports** for WS types, **auto-imported globals** (`trpcClient`, `internals`, stores), **~400+** mixed layout/code files, and **no** `*.test.*` / `*.spec.*` under the legacy client tree.

### Decoupling and layout (`@deepnotes/web`)

- [ ] **Forbidden imports:** no `@deepnotes/api-worker`, `@deepnotes/db`, or Drizzle from `apps/web` source; HTTP only via a small **API layer** (generated OpenAPI client or `fetch` + shared types from `@deepnotes/api`).
- [ ] **Feature folders:** e.g. `src/features/auth`, `src/features/pages`, `src/shared/ui`—document the convention in `apps/web/README.md` (or link from repo root README).
- [ ] **Thin Vue, fat composables:** session and crypto orchestration live in testable modules, not only in `.vue` files.

### Testing (see RESTART_PLAN §5.8)

- [x] **Vitest** in `apps/web` with DOM environment (`happy-dom`) and `@vue/test-utils` aligned with Vite 6.
- [ ] **Component or composable tests** for the first **auth** / session flows (forms, validation, error mapping from API).
- [ ] **Contract tests** for the fetch wrapper (MSW or recorded OpenAPI fixtures)—optional until multiple features consume the API.
- [ ] **E2E smoke** (Playwright recommended): login or session refresh with **httpOnly cookies** against **local compose** or **Cloudflare preview**—add CI job when stable enough (can start `manual`/`workflow_dispatch` if cost is a concern).

#### Automated tests — package matrix (maintenance)

| Package / app | Role | What runs today | Gaps (highest value next) |
|---------------|------|------------------|---------------------------|
| **`@deepnotes/db`** | Drizzle + migrations | `template-db.test.ts`: clone template DB, smoke SQL | More assertions on FKs / critical columns after schema grows |
| **`@deepnotes/session`** | Auth, account, crypto orchestration | Unit: `login-rate-limit`, `encrypt-user-email`, `email-hash`, `send-email-change-code`. **Integration:** `account-flows.integration.test.ts` — email change + **password change** (PHC + unwrap), wrong passwords/codes, session invalidation; template `dn_test_tpl_session_email`, **`@deepnotes/db/testing/template-db`**. | **`performSessionLogin` / refresh** with template DB + device/session rows; **Redis** + `performSessionLogin` failed-login; optional **demo 403** integration |
| **`@deepnotes/api`** | Zod + OpenAPI | `openapi.test.ts` (health + session + 2FA paths); **`schemas/users.test.ts`** (email/password change, 2fa finish) | Schemas for pages/groups when they land; optional OpenAPI **snapshot** |
| **`@deepnotes/api-worker`** | Hono on Worker | `index.test.ts`: 503 when env missing — includes **2FA** routes in matrix | **200** tests with stub `SessionEnv` + template DB (heavier) |
| **`@deepnotes/web`** | SPA | `app.test.ts` (mount `App.vue`) | Auth UI + API client as in §5.8 |

**Principle:** keep **fast unit tests** on pure crypto, Zod, and mail/HTTP branches; add **Postgres-backed** flows incrementally (same template pattern as `@deepnotes/db`) so Phase 3 routes do not regress silently.

### Progress vs legacy (reference only)

| Legacy (`apps/client`) | New (`new-deepnotes/apps/web`) |
|------------------------|--------------------------------|
| Quasar + Vite 2, 4GB heap builds | Vite 6 + Vue 3.5, Vitest + happy-dom in CI |
| Imports `AppRouter`, server websocket paths | Must use **OpenAPI** + documented WS only |
| No automated UI tests | **Done:** real `test` script + one component test |

---

## Success criteria (RESTART_PLAN §8)

- [ ] OpenAPI source of truth; client **generated** types or shared Zod.
- [ ] Drizzle migrations from empty DB documented for production upgrades.
- [ ] Cold API dev start under **2 s** (no `inspect-brk` by default) — validate on a typical laptop.
- [ ] Collab + realtime: at least one integration test each (Redis + deps).
- [x] SQL-heavy paths: real Postgres tests; prefer **template DB** cloning (§5.7) — `@deepnotes/db` template test; `@deepnotes/session` `account-flows.integration.test.ts` (register, email change, password change, sessions invalidation).
- [ ] Auth, crypto, Stripe: automated coverage beyond smoke; **no** generic repository layer (§5.0). **Progress:** crypto + Zod + Resend unit tests; **Postgres** template tests for account **register / email change / password change** (see [Phase 3 test coverage (detail)](#phase-3-test-coverage-detail)). **Next:** login + refresh + optional Redis in integration; Stripe when billing exists.
- [x] No tRPC / superjson / RevenueCat / key-rotation in **this** tree (keep absent); product sign-off for IAP/Stripe when billing ships.
- [x] Client: zero undocumented forks, or a short owned exception list — see [docs/CLIENT_FORKS.md](./docs/CLIENT_FORKS.md).
- [ ] Cloudflare: deploy runbook; Hyperdrive + Postgres + Redis proven in staging; collab/realtime topology chosen and load-tested.
- [x] Web: Vitest + DOM env in CI (happy-dom + `@vue/test-utils` on `App.vue`).
- [ ] Web: enforce **no** server/db imports from web source (ESLint `import/no-restricted-paths` or README when features land); **E2E** smoke for session cookies (RESTART_PLAN §8).

---

## Phase 3 working order (suggested)

Use this when resuming: **(done)** account HTTP through 2FA (incl. `load` as POST, see map). **(next)** `users.pages` + `groups` + `pages` REST from [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md). **(then)** **realtime + collab** (no key rotation) and **Stripe** + wire billing hooks on account routes.

---

## Short log (newest first)

| Date | Change |
|------|--------|
| 2026-04-27 | **2FA account HTTP:** `user-two-factor-settings.ts`, `encryptUserAuthenticatorSecret` in `session-crypto`, Zod + OpenAPI + Hono for `/api/users/me/2fa/*` (6 routes); [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) — `load` is POST not GET; see [2FA HTTP routes](#2fa-http-routes-phase-3) below. |
| 2026-04-27 | **Integration tests:** expanded `account-flows.integration.test.ts` (email wrong code; password change PHC + keyring unwrap with salt from PHC; `sessions` invalidation; wrong old password). Renamed from `email-change.integration.test.ts`. PLAN_PROGRESS: detailed Phase 3 test table + matrix gaps. |
| 2026-04-26 | **Integration tests:** `@deepnotes/db` exports `@deepnotes/db/testing/template-db` + `db-url`; `@deepnotes/session` — `email-change.integration.test.ts` (Postgres template clone, register + email change + wrong password). PLAN_PROGRESS matrix + Phase 3 checklist updated. |
| 2026-04-26 | **Tests:** `@deepnotes/session` — `encrypt-user-email.test.ts`, `email-hash.test.ts`, `send-email-change-code.test.ts`; `@deepnotes/api` — `schemas/users.test.ts`; api-worker — email-change routes in `503` matrix; PLAN_PROGRESS — package test matrix + Phase 3 test checklist. |
| 2026-04-26 | Phase 3: **email change** — `POST /api/users/me/email-change` + `…/confirm` (`change-user-email.ts`, `decryptUserEmail`, `send-email-change-code`); `userEmailChange*Request` schemas, OpenAPI, Hono; TRPC_REST_MAP; PLAN_PROGRESS detail + suggested Phase 3 order. |
| 2026-04-26 | Phase 3: **`POST /api/users/me/password`** — `performUserPasswordChange` (`change-user-password.ts`): old password verify, demo **403**, new keyrings + PHC, invalidate all `sessions`, clear cookies **204**; `userPasswordChangeRequestSchema`, OpenAPI + worker; export **`byteB64`** from `@deepnotes/api`; TRPC_REST_MAP rows for change-password; PLAN_PROGRESS Phase 3 account section expanded. |
| 2026-04-26 | Phase 2 + §5.8: `@deepnotes/web` — Vitest + happy-dom + `@vue/test-utils`, `vite.config` from `vitest/config`, `src/app.test.ts`; Phase 3: `DELETE /api/users/me` + `performUserAccountDelete` (ownership guard, Drizzle tx, clear cookies); `userAccountDeleteRequestSchema` + OpenAPI; api-worker route; TRPC_REST_MAP note on delete body / Stripe hook. |
| 2026-04-26 | Phase 3: email verification `POST /api/users/email-verification/resend` and `…/confirm`; `performResendEmailVerification` / `performConfirmEmailVerification`; Resend in `sendRegistrationEmail`; `RESEND_API_KEY` + `PUBLIC_APP_URL`; first mail on register + re-send on duplicate unverified; OpenAPI 502 on register if provider fails; `c.env?.HYPERDRIVE` on confirm for Vitest. |
| 2026-04-26 | Phase 3: **`POST /api/users`** (`performUserRegister`), `encryptUserRehashedLoginHash`, `addHours`, OpenAPI 201/400/401/409; optional **`SEND_EMAILS`** on session env (auto-verify when `false`); group password on register still rejected (same as demo). |
| 2026-04-26 | Phase 3: `POST /api/sessions/demo` (`performSessionStartDemo`), `GET /api/users/me`, Redis failed-login limits (`SessionRedisPort` + optional Upstash), `USER_EMAIL_ENCRYPTION_KEY` on `SessionEnv`; OpenAPI 200/400 for demo, 429 for login, `userMeResponseSchema`; Vitest `login-rate-limit.test.ts`. |
| 2026-04-26 | Docs: [docs/RESTART_PLAN.md](../docs/RESTART_PLAN.md) §3.5 legacy frontend pain points, §5.8 frontend testing/CI, phased updates; this file: **Frontend / UI track** + Phase 2/4 notes on real web tests. |
| 2026-04-26 | Phase 3: `@deepnotes/session` (login/refresh/logout + 2FA TOTP/recovery), api-worker Hyperdrive + dynamic import for Workers bundle; OpenAPI 200/401/503 for session routes; demo remains `501`; session crypto vendored in-package (no parent `@stdlib` links); `libsodium-wrappers-sumo@^0.8` override for Wrangler. |
| 2026-04-26 | Phase 3 start: OpenAPI + Zod for `POST /api/sessions/login|refresh|logout|demo`; api-worker `501` stubs; Phase 0 marked done in snapshot. |
| 2026-04-26 | Phase 0 docs (TRPC_REST_MAP, AUTH_AND_CORS, CLIENT_FORKS); Phase 2 deploy doc; Drizzle legacy baseline from `postgres-init.sql`; Vitest template-DB integration test + CI `DATABASE_ADMIN_URL`. |
| 2026-04-26 | Initial `new-deepnotes` monorepo: `@deepnotes/api`, `@deepnotes/db`, `@deepnotes/api-worker`, `@deepnotes/web`, CI workflow. |

Add a row here for meaningful milestones (e.g. “auth MVP”, “first Drizzle migration from legacy schema”).
