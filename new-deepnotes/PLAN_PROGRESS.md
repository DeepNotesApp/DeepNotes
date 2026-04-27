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
| **3** — REST + Drizzle features | **In progress** | Account + **2FA** complete. **Shipped:** slices [1](#pagesgroups-rest--slice-1)–[5](#pagesgroups-rest--slice-5-privacy-private-re-key); [6](#pages-rest--slice-6-bump-backlinks-snapshots-deletion); [7 — page move](#pages-rest--slice-7-move--group-creation); [8 — create + `groupCreation`](#pagesgroups-rest--slice-8-create--groupcreation); **[slice 9 — membership + join flows](#pagesgroups-rest--slice-9-membership--join-invites--requests)**. **[Stripe / billing](#phase-3--stripe-billing--webhooks--account-hooks).** **[Slice 10 — collab Postgres bootstrap](#pages-rest--slice-10-collab-updates-rest):** `GET`/`POST …/collab-updates`. **Still ahead:** **collab + realtime WebSockets** (JWT upgrade, binary fan-out, optional Redis buffer like legacy) per [RESTART_PLAN §4.3](../docs/RESTART_PLAN.md). |
| **4** — Client MVP | **In progress** | **Shipped:** [OpenAPI client](#phase-4--openapi-typed-client-bootstrap) + [routing + session UI](#phase-4--routing--session-ui) + [pages + editor + register](#phase-4--pages-list-editor--register) + **[collab decrypt + REST append](#phase-4--collab-decrypt--yjs--post-append)** + **[register crypto parity](#phase-4--register-crypto-parity)** + **[groups overview UI](#phase-4--groups-overview-thin-spa)** + **[notifications list + mark read](#phase-4--notifications-thin-spa)** (`/notifications`, `GET` window + `POST …/read`, unread vs `lastNotificationRead`, load older). **Next:** Tiptap; **MSW/Playwright**; richer group admin (join/member/invite UI); optional deterministic demo keyring for CI; optional notification **body** decrypt when crypto shapes are fixed in the client. **Phase 3** still: [collab + realtime WebSocket](#not-started-phase-3--realtime--collab-websocket). |
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
- [x] **DB integration (template Postgres):** `account-flows.integration.test.ts` — **24** `it()` blocks when DB env set — register / email / password / **login + refresh** / **2FA** / **groups + pages** (includes [slice 10 collab GET/append](#pages-rest--slice-10-collab-updates-rest) inside the same case) / **[slice 8 `groupCreation`](#pagesgroups-rest--slice-8-create--groupcreation)** / **[slice 9 membership + joins](#pagesgroups-rest--slice-9-membership--join-invites--requests)** / **user page prefs** / **[slice 4–5 group admin](#pagesgroups-rest--slice-4-group-password-privacy-deletion)** / **[slice 6 page ops](#pages-rest--slice-6-bump-backlinks-snapshots-deletion)** / **[slice 7 page move](#pages-rest--slice-7-move--group-creation)**. `@deepnotes/db` `template-db.test.ts` — clone + FK matrix. See [Phase 3 test coverage (detail)](#phase-3-test-coverage-detail).

### Phase 3 test coverage (detail)

Integration tests use `describe.skipIf` when `DATABASE_URL` (and admin URL for `CREATE DATABASE`) are unset; they clone template `dn_test_tpl_session_email` (isolated from `@deepnotes/db`’s `dn_test_tpl_deepnotes` so **Turbo** can run both packages in parallel).

**How to run locally:** ensure `.env` at `new-deepnotes/.env` has `DATABASE_URL` and (for template create/drop) `DATABASE_ADMIN_URL` with a role that can `CREATE DATABASE`. Then:

- `pnpm --filter @deepnotes/session exec vitest run src/account-flows.integration.test.ts` (**24** `it()` blocks when DB env set — includes [slice 6](#pages-rest--slice-6-bump-backlinks-snapshots-deletion) + [slice 7](#pages-rest--slice-7-move--group-creation) + [slice 8](#pagesgroups-rest--slice-8-create--groupcreation) + [slice 9](#pagesgroups-rest--slice-9-membership--join-invites--requests) + [slice 10 collab](#pages-rest--slice-10-collab-updates-rest) bundled in **groups + pages**)
- `pnpm --filter @deepnotes/db exec vitest run src/template-db.test.ts`

CI should set the same vars against the workflow Postgres service (role with `CREATEDB`).

**Session package file:** `packages/session/src/account-flows.integration.test.ts` (describe: **account flows + sessions: Postgres template DB**).

| Test case | Exercises | Assertions |
|-----------|-----------|------------|
| Register → email-change request → confirm | `performUserRegister`, `performUserEmailChange*`, `signAccessToken` | New email in `decryptUserEmail` + `email_hash` match; `encrypted_new_email` / `email_verification_code` cleared; clear-session cookie lines on confirm. |
| Email change request, wrong password | `performUserEmailChangeRequest` | **400** `BAD_REQUEST` when `oldLoginHash` does not match. |
| Email change confirm, wrong 6-digit code | `performUserEmailChangeConfirm` | **400** `BAD_REQUEST` (code mismatch). |
| Password change, happy path | `performUserPasswordChange` | After change: PHC decrypts to a hash matching **new** password; private + symmetric keyrings **unwrap** with the same `derivePasswordValues` key as login (salt from stored PHC), round-trip to the new keyring bytes passed in. |
| Password change invalidates sessions | `performUserPasswordChange` + explicit `devices` / `sessions` insert | `sessions.invalidated === true` for the user. |
| Password change, wrong old password | `performUserPasswordChange` | **400** `BAD_REQUEST`. |
| **Login → refresh → refresh** | `performUserRegister`, `performSessionLogin`, `performSessionRefresh` | Login sets `Set-Cookie` (`refreshToken`, `loggedIn=true`); DB `sessions.refresh_code` + `encryption_key` change on refresh; JSON `oldSessionKey` / `newSessionKey` match pre/post row `encryption_key`; **second** refresh with rotated cookies succeeds. |
| **Replay pre-rotation refresh JWT** | Same as above, then third call with **first** login’s `refreshToken` + original `loggedIn` | **401** `UNAUTHORIZED` “Session was invalidated.” — JWT still verifies but `payload.rfc` no longer matches `sessions.refresh_code` after rotation. |
| **Refresh, `loggedIn` ≠ true** | `performSessionLogin`, `performSessionRefresh` with `loggedInCookie: "false"` | **401** “User not logged in.” |
| **Refresh, no refresh cookie** | `performSessionRefresh` with `refreshCookie: undefined`, `loggedIn: "true"` | **401** “No refresh token received.” |
| **Login, wrong password** | `performSessionLogin` | **401** `UNAUTHORIZED` (wrong `loginHash`). |
| **Password change, demo user** | `performUserRegister` + `UPDATE users SET demo`, `performUserPasswordChange` | **403** `FORBIDDEN` (“demo accounts”). |
| **2FA → login (TOTP)** | `performUserTwoFactorEnableRequest` / `Finish`, `performSessionLogin` | After finish: `two_factor_auth_enabled`, `encrypted_authenticator_secret`, `encrypted_recovery_codes` set; **6×32-char hex** recovery codes; login with fresh `authenticator.generate(secret)` returns **200**-equivalent payload (`sessionId`). |
| **2FA finish, wrong code** | `EnableRequest` then `EnableFinish` with `"000000"` | **400** `BAD_REQUEST` (“Authenticator token is incorrect.”). |
| **2FA login without MFA** | After finish, `performSessionLogin` without `authenticatorToken` | **401** “Requires two-factor authentication.” (untrusted device). |
| **2FA login, bad TOTP** | `authenticatorToken: "111111"` | **401** “Invalid authenticator token.” |
| **2FA login with recovery code** | `performUserTwoFactorEnableFinish` → `performSessionLogin` with `recoveryCode` (no TOTP) | **200**-equivalent (`sessionId`); `decryptRecoveryCodes` on row shows **5** hashes left (one consumed). |
| **2FA recovery code reuse** | Second `performSessionLogin` with same plaintext recovery code, new IP/UA | **401** “Invalid recovery code.” |
| **Groups + pages (personal)** | `performUserRegister` then `performGetUserGroupIds` / `performListGroupPages` / `performGetGroupMainPageId` / `performGetGroupMemberUserIds` / `performCreatePage` (second page, `parentPageId` = initial page); **[slice 10](#pages-rest--slice-10-collab-updates-rest)** `performGetPageCollabUpdates` + `performAppendPageCollabUpdates` on initial `reg.pageId` | `groupIds` = `[personalGroupId]`; list returns initial `pageId`; **main page** = `reg.pageId` (matches `groups.main_page_id`); **members** = `[reg.userId]` (sole `group_members` row); create returns `numFreePages` **1** for default `plan`; `users.num_free_pages` = 1; two rows in `pages` for group; unknown `groupId` list → **404** `NOT_FOUND`. **Collab:** empty GET → append index `0` + `1` → GET has `lastIndex` **1**; stale `expectedLastIndex` → **409** `CONFLICT`; gap in indices → **400**. |
| **User page prefs** | Register + access JWT; `performGetStartingPageId`; `performGetCurrentPath` (root page + child); unknown page **404**; `performAddFavoritePages` / `performRemoveFavoritePages` (order on `users.favorite_page_ids`); `performRemoveRecentPages` bogus id **404** / missing child in recent **404** / remove root then `recent` empty + `performClearRecentPages`; `performPatchDefaultNote`; insert `notifications` + `users_notifications` → `performLoadNotifications` (base64 ciphertext) + `performMarkNotificationsRead` → `users.last_notification_read` | Matches legacy semantics where tested; favorites column from migration `0001_favorite_page_ids`. |
| **Group password, privacy, deletion (slice 4)** | `UPDATE users` → `plan = pro` on registered user; `performGroupPasswordEnable` / `Change` / `Disable` on **personal** group; `performGroupPrivacyMakePublic` after `accessKeyring` cleared; `performGroupPrivacySetJoinRequestsAllowed` **false**; `performGroupSoftDelete` (future `permanent_deletion_date`) → `Restore` (null) → `SoftDelete` + `Purge` (past date); `Restore` after purge **400** | PHC + server-side encrypt via `GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY`; `group-permissions` includes **`editGroupSettings`** (owner/admin only). |
| **Privacy make-private (slice 5)** | Register with **public** personal group (`access_keyring` set); Pro; `performGroupPrivacyMakePrivate` with full re-key payload (single member, empty invites/requests, one page); assert `access_keyring` **null** + page `encrypted_symmetric_keyring` updated; second call **400** “already private”; re-public in DB then payload with **extra** page id → **400** keyset mismatch | Mirrors legacy `groupKeyRotationSchema` key sets; **no** `next_key_rotation_date` writes (RESTART_PLAN). |
| **Page bump / backlinks / snapshots / deletion (slice 6)** | Pro; `performCreatePage` (second + third child); `performPageBump` (child, parent = main’s child chain); `users.starting_page_id` + recent; `performPageBacklinkCreate`+`Delete` (scoped query — bump may add separate `page_links` row); `performPageSnapshotSave`+`Load`+`Delete`; `performPageSoftDelete`+`Restore`+`SoftDelete`+`Purge` | Postgres-only links; Pro for snapshot save/load; not main page for delete. |
| **Page move (slice 7)** | Pro; no-op same dest + `!setAsMainPage` **400**; main page **400**; `setAsMainPage` in personal group (no `reencrypt`); `groupCreation` + cross-group reencrypt, `page_updates` index 0 | [performPageMove](packages/session/src/page-move.ts); no Redis collab key delete (RESTART_PLAN). |
| **Create + `groupCreation` (slice 8)** | Pro; path `groupId` = unused nanoid; `parentPageId` in **personal** group; [insertSharedGroupForOwnerInTx](packages/session/src/group-creation-shared.ts) then `pages` + `users_pages` | Parity with legacy `pages.create` + `groupCreation` (tRPC). |
| **Membership + joins (slice 9)** | Two Pro users; shared **public** group via `groupCreation`; [performGroupJoinInvitationSend](packages/session/src/group-membership.ts) → invite row → [performGroupJoinInvitationAccept](packages/session/src/group-membership.ts); [performGroupMemberRoleChange](packages/session/src/group-membership.ts) to moderator; [performGroupMemberRemove](packages/session/src/group-membership.ts); [performGroupJoinRequestSend](packages/session/src/group-membership.ts) + [performGroupJoinRequestAccept](packages/session/src/group-membership.ts) with `viewer` | Covers legacy WS join-invitation / join-request / change-role / remove DB semantics; **no** push-notification step 2 (client-driven later). |

**`@deepnotes/db` real Postgres (`template-db.test.ts`):**

| Test case | Exercises | Assertions |
|-----------|-----------|------------|
| Clone + insert user | Template clone, `users` insert | Isolated DB starts with **0** users; insert + select by `id`. |
| **Sessions FK** | `INSERT sessions` without parent `users` / `devices` | Insert **rejects** (FK violation) for orphan `user_id` / `device_id`. |
| **Devices FK** | `INSERT devices` with non-existent `user_id` | Insert **rejects** (FK to `users`). |
| **Pages → groups FK** | `INSERT pages` with unknown `group_id` | Insert **rejects** (FK to `groups`). |
| **`group_members` → `users` FK** | `INSERT group_members` with bogus `user_id` and `group_id` | Insert **rejects** (no parent user). |
| **`group_members` → `groups` FK** | Insert minimal `users` row, then `group_members` with unknown `group_id` | Insert **rejects** (no parent group). |

**Not yet in integration:** Redis failed-login with real `ioredis`/Upstash against `performSessionLogin` (unit tests cover rate-limit helpers); `performSessionRefresh` with **expired** refresh JWT (would need clock-skew or short-lived token minting in test); **invalid/tampered** refresh JWT where `verifyRefreshToken` fails but `decodeRefreshTokenUnsafe` returns `sid` (invalidates row — behaviour worth an explicit test when touching refresh again).

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

### Account routes — detail (Phase 3)

- [x] **`users.pages` prefs (HTTP)** — [Users/pages REST — slice 2](#userspages-rest--slice-2); [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) `users.pages` rows.

- [x] **Email change**
  - [x] `POST /api/users/me/email-change` — `performUserEmailChangeRequest`: `oldLoginHash` + `newEmail`; **403** demo, **400** bad password or “email already in use” (global `email_hash` match, same as legacy); sets `encrypted_new_email` + 6-digit `email_verification_code`; Resend (subject/body like legacy) or **200** `{ "emailVerificationCode" }` when `SEND_EMAILS=false`; **204** when emailed.
  - [x] `POST /api/users/me/email-change/confirm` — `performUserEmailChangeConfirm`: one call (WS two-step collapsed); `oldLoginHash`, `emailVerificationCode` (6 digits), `newLoginHash`, `userEncrypted*Keyring` (b64, same as register/password); verifies code + password; applies new `encrypted_email` / `email_hash`, clears pending fields, PHC + rewrapped keyrings, invalidates **all** `sessions`, **204** + `buildClearSessionCookies`; optional `updateStripeCustomerEmail` in worker (matches legacy `customers.update` after commit, errors non-fatal).
  - [x] **`decryptUserEmail`** in `@deepnotes/session` for confirm; **`sendEmailChangeVerificationEmail`** (Resend); OpenAPI + [docs/TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) updated.
- [x] **2FA (HTTP surface)** — Hono + OpenAPI: `user-two-factor-settings.ts` (`encryptUserAuthenticatorSecret` in `session-crypto`). Routes: [2FA HTTP routes](#2fa-http-routes-phase-3). `load` is **`POST /api/users/me/2fa/load`** (password in JSON, not a `GET` — [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) footnote). **Postgres integration:** [account-flows.integration.test.ts](./packages/session/src/account-flows.integration.test.ts) — enable/finish + `performSessionLogin` with TOTP; wrong finish token; missing MFA; invalid TOTP (`assertTwoFactorOk` in [two-factor.ts](./packages/session/src/two-factor.ts)).

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

### Pages/groups REST — slice 1

**Goal:** unblock client “list my groups → list pages → create page” without tRPC.

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | `group-permissions.ts` — `userHasGroupPermission` (roles `owner`/`admin`/`moderator`/`member`/`viewer` vs legacy `@deeplib/misc`; **public** group = `groups.access_keyring` not null grants `viewGroupPages` without membership). `user-group-ids.ts` — `performGetUserGroupIds`. `group-pages.ts` — `performListGroupPages` (cursor `lastPageId`, excludes `permanent_deletion_date` set), `performCreatePage` (parent page must belong to group; **Pro** required when `groupId !== personalGroupId`; **50 free pages** for `plan !== 'pro'`; bumps `group_members.last_activity_date`). |
| **`@deepnotes/api`** | `schemas/pages-groups.ts` — path/query/body/response Zod + OpenAPI; wired in `openapi.ts`. |
| **`@deepnotes/api-worker`** | Hono: `GET /api/users/me/groups`, `GET /api/groups/:groupId/pages`, `POST /api/groups/:groupId/pages` (**201** on create). |

**Intentional gaps (later):** no Redis locks (legacy redlock); **`GET /api/groups/:groupId/pages`** is **auth-only** (legacy allowed optional auth for public read — can add later). Optional **`groupCreation`** on create is [slice 8](#pagesgroups-rest--slice-8-create--groupcreation).

### Users/pages REST — slice 2

**Goal:** ship legacy `users.pages` *prefs* surface on REST + Drizzle so the SPA can manage recents, favorites, breadcrumbs, defaults, and notifications without tRPC/KeyDB.

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/db`** | Migration **`0001_favorite_page_ids`**: `users.favorite_page_ids char(21)[] NOT NULL DEFAULT '{}'`. Legacy stored favorites only in KeyDB; greenfield persists them in Postgres (RESTART_PLAN: portable Redis, no `DataAbstraction` mirror for this field). |
| **`@deepnotes/session`** | `user-page-prefs.ts`: `performGetStartingPageId`, `performGetCurrentPath` (`users_pages.last_parent_id` walk + one-shot repair like legacy KeyDB), `performRemoveRecentPages` / `performClearRecentPages`, `performAddFavoritePages` / `performRemoveFavoritePages` / `performClearFavoritePages`, `performPatchDefaultNote` / `performPatchDefaultArrow`, `performLoadNotifications`, `performMarkNotificationsRead`. |
| **`@deepnotes/api`** | `schemas/user-pages.ts` — Zod + OpenAPI for query/body/response shapes; wired in `openapi.ts`. |
| **`@deepnotes/api-worker`** | Hono routes: `GET …/me/pages/starting`, `GET …/me/pages/path`, `POST …/pages/recent/remove|clear`, `POST …/pages/favorites|…/remove|…/clear`, `PATCH …/me/defaults/note|arrow`, `GET …/me/notifications`, `POST …/me/notifications/read`. |

**Cutover note:** Existing production users who had favorites only in KeyDB will see an **empty** `favorite_page_ids` after migration until a one-off backfill is run (if ever needed); new installs and new favorites use Postgres only.

### Pages/groups REST — slice 3

**Goal:** legacy `groups.getMainPageId` and `groups.getUserIds` without KeyDB — sourced from Postgres, with permission rules aligned to `@deeplib/data` / `@deeplib/misc` (public **read pages** does **not** imply **view members**).

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | `group-permissions.ts` — `viewGroupMembers` on role rows (all five roles **true**); public-only path still grants only `viewGroupPages`. `group-main-and-members.ts` — `performGetGroupMainPageId` (`viewGroupPages`), `performGetGroupMemberUserIds` (union `group_members`, `group_join_requests`, `group_join_invitations`; deduped set). |
| **`@deepnotes/api`** | `groupMainPageResponseSchema`, `groupMemberUserIdsResponseSchema` in `schemas/pages-groups.ts`; OpenAPI `GET /api/groups/{groupId}/main-page` and `…/members`. |
| **`@deepnotes/api-worker`** | Hono: same paths, **200** JSON. |
| **Tests** | Integration extends **groups + pages** case; worker **503** matrix + `openapi.test.ts` paths. |

**Intentional vs legacy tRPC:** old `getMainPageId` was auth-only (no explicit permission); REST requires **`viewGroupPages`** like `getPages`. **`getUserIds`** matches legacy union + `viewGroupMembers` (stricter than anonymous public read).

### Pages/groups REST — slice 4 (group password, privacy, deletion)

**Goal:** legacy `groups.password.*`, `groups.privacy.*` (public + join-requests), `groups.deletion.*` on REST + Drizzle — no KeyDB/redlock; Pro gating where legacy used `assertUserSubscribed`.

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | `group-permissions.ts` — new permission **`editGroupSettings`** (owner/admin only, per `@deeplib/misc`); `user-plan.ts` — `assertUserProPlan` (Pro-only flows). `crypto/session-crypto.ts` — `computeGroupPasswordPhc` (Argon2id), `encryptGroupRehashedPasswordHash` / `decrypt...` (context `GroupRehashedPasswordHash` + **`GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY`**). `group-password.ts` — enable / change / disable. `group-privacy.ts` — make public (clears `group_members` + `group_join_invitations` `encrypted_access_keyring`); set join-requests. `group-deletion.ts` — soft delete (~+1 month), restore (grace only), purge (past date). `env.ts` — required **`GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY`**. |
| **`@deepnotes/api`** | `schemas/pages-groups.ts` — password + privacy Zod; OpenAPI: `POST|PATCH|DELETE …/password`, `POST …/privacy/public`, `PATCH …/privacy/join-requests`, `DELETE /api/groups/{groupId}`, `POST …/restore`, `POST …/purge`. |
| **`@deepnotes/api-worker`** | Hono: same paths; `byteB64` pass-through to session (no double-decode). Worker **`getSessionEnv`** requires the new key. `503` matrix **+8** routes (**44** total 503 cases). |
| **Tests** | [Integration](#phase-3-test-coverage-detail): personal group set to Pro in DB, full password + privacy + delete cycle + restore after purge **400**; [TRPC_REST_MAP](docs/TRPC_REST_MAP.md) **implemented** rows. |

### Pages/groups REST — slice 5 (privacy private, re-key)

**Goal:** legacy WS `groups.privacy.makePrivate` (step 1 read + step 2 `rotateGroupKeys`) as **one** `POST` with the same ciphertext shape as legacy `groupKeyRotationSchema` / [group-key-rotation.ts](../apps/app-server/src/utils/group-key-rotation.ts) (records keyed by user id or page id). **No** per-page `next_key_rotation_date` updates (rotation machinery removed per RESTART_PLAN).

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | `performGroupPrivacyMakePrivate` in `group-privacy.ts` — Pro + `editGroupSettings`; group must have **`access_keyring` non-null** (still “public”); validates `groupMembers` / `groupJoinInvitations` / `groupJoinRequests` / `groupPages` **key sets** match Postgres exactly; transaction updates `groups`, all member/invite/request rows, all pages; `groupAccessKeyring` optional (omit → `access_keyring` **null**, same as legacy). |
| **`@deepnotes/api`** | `groupPrivacyPrivateRequestSchema` (+ nested OpenAPI component schemas) in `schemas/pages-groups.ts`; path in `openapi.ts`. |
| **`@deepnotes/api-worker`** | `POST /api/groups/:groupId/privacy/private` — **204**; **503** matrix **+1** route (**45** total). |
| **Tests** | Integration: [slice 5 row](#phase-3-test-coverage-detail); [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) **Groups** + **WebSocket** rows. |

**Client contract:** JSON uses **base64** for all byte fields (`byteB64`). Empty objects `{}` for invites/requests when none.

### Pages REST — slice 6 (bump, backlinks, snapshots, deletion)

**Goal:** legacy `pagesRouter` **except** `pages.move` (handled in [slice 7](#pages-rest--slice-7-move--group-creation)) and optional **`groupCreation`** on `POST` create only. No KeyDB mirrors for links/snapshots — only **`page_links`** / **`page_snapshots`**.

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | `page-operations.ts` — `performPageBump` (personal-main breadcrumb validation, `users.*` recents, optional `page_links` on bump, activity timestamps), `performPageBacklinkCreate` / `performPageBacklinkDelete`, `performPageSnapshotSave` (Pro, legacy trim: >10 and oldest >14d), `performPageSnapshotLoad` (Pro), `performPageSnapshotDelete`, `performPageSoftDelete` / `performPageRestore` / `performPagePurge` (not group **main** page). |
| **`@deepnotes/api`** | `pageIdPathSchema`, `pageTargetPagePathSchema`, `pageSnapshotPathSchema`, `pageBumpRequestSchema`, `pageBacklinkCreateRequestSchema`, `pageSnapshot*`, OpenAPI paths under `/api/pages/...`. |
| **`@deepnotes/api-worker`** | Routes listed in [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) **Pages** table; with [slice 7](#pages-rest--slice-7-move--group-creation) move route, `503` matrix **55** session routes. |
| **Tests** | [Phase 3 detail table](#phase-3-test-coverage-detail) **slice 6** row; integration case **pages: bump, backlinks, …** |

**Path semantics:** `POST /api/pages/:pageId/backlinks` — `pageId` = **target**; `DELETE /api/pages/:sourcePageId/backlinks/:targetPageId` — **source** first (legacy `sourcePageId` / `targetPageId`).

### Pages REST — slice 7 (move + group creation)

**Goal:** legacy `websocket/pages/move` (tRPC `moveProcedureStep1` + `moveProcedureStep2`) in **one** `POST`, as in [TRPC map](./docs/TRPC_REST_MAP.md) — `editGroupSettings` on source, optional **new** shared group + owner row (`groupCreation` when `destGroupId` is unused), `setAsMainPage` with personal-group `users_pages` swap, cross-group page + `page_snapshots` + replace `page_updates` with a single Yjs payload at index 0, bump `users.recent_group_ids` for the destination. **Intentional omission:** KeyDB/Redis `page-update-*` deletes (RESTART_PLAN: collab on a new path).

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | `page-move.ts` — `performPageMove` (Pro, `user-plan.assertUserProPlan`); `SessionEnv` + optional Argon2 group password for `groupCreation` (same as register/demo) via `computeGroupPasswordPhc` / `encryptGroupRehashedPasswordHash` |
| **`@deepnotes/api`** | `pageMoveRequestSchema` (+ nested reencrypt + `pageMoveGroupCreationRequestSchema`); `GET` OpenAPI **not** used for a separate “read step” — client must supply prepared ciphertext in one `POST` (or call existing read APIs first) |
| **`@deepnotes/api-worker`** | `POST /api/pages/:pageId/move` — `503` matrix **+1** (**55** total session routes) |
| **Tests** | Integration: [slice 7 row](#phase-3-test-coverage-detail) — `pages: move (set main, groupCreation, validation)`; `openapi.test.ts` + worker 503 list |

**Client contract:** `reencrypt` is **required** when the page’s `group_id` changes (after optional `groupCreation` insert, the page still has the old `group_id` until the same transaction’s update block). Omit `reencrypt` when only `setAsMainPage` in the **same** group. Snapshots: `pageEncryptedSnapshots` is a map by snapshot id (empty `{}` if none).

### Pages/groups REST — slice 8 (create + `groupCreation`)

**Goal:** legacy tRPC `pages.create` with optional `groupCreation` (new non-personal `groupId` + first page) without using **move** — same ciphertext shape as [slice 7 `groupCreation`](#pages-rest--slice-7-move--group-creation) / `PageMoveGroupCreationRequest`.

| Layer | What shipped |
|-------|--------------|
| **`@deepnotes/session`** | `group-creation-shared.ts` — `GroupCreationCiphertext` + `insertSharedGroupForOwnerInTx` (shared with [page-move.ts](packages/session/src/page-move.ts)). `group-pages.ts` — `performCreatePage`: if `body.groupCreation` set, Pro + path `groupId` must not exist, `parentPageId` in user’s **personal** group, then in one tx: insert group + owner member (legacy `createGroup` order), `pages` + `users_pages`, `group_members.last_activity` for new group. |
| **`@deepnotes/api`** | `pageMoveGroupCreationRequestSchema` moved above `GroupPageCreateRequest`; `groupPageCreateRequestSchema` includes optional `groupCreation`. |
| **`@deepnotes/api-worker`** | `POST /api/groups/:groupId/pages` — same handler; Zod decodes nested base64. |
| **Tests** | Integration: [slice 8 row](#phase-3-test-coverage-detail); [TRPC_REST_MAP](docs/TRPC_REST_MAP.md) `pages.create` row. |

**Client contract:** Path parameter `groupId` is the **new** group id when `groupCreation` is present (client-generated nanoid, must not already exist). `parentPageId` is typically under the user’s **personal** group (breadcrumb parent), not the new group’s id.

### Pages/groups REST — slice 9 (membership + join invites + requests)

**Goal:** Replace legacy WebSocket `groups.joinInvitations.*`, `groups.joinRequests.*`, `groups.changeUserRole`, `groups.removeUser` with REST + Drizzle. **DB parity** with step 1 of each legacy flow; **no** server-side replication of step 2 **encrypted notification fan-out** (clients can still write `notifications` / `users_notifications` using the same ciphertext patterns as today when needed).

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | [group-role-ranks.ts](packages/session/src/group-role-ranks.ts) — role rank / `canManageRole` / `canChangeRole` / `manageLowerRanks` equivalent. [group-membership.ts](packages/session/src/group-membership.ts) — `performGroupJoinInvitationSend` / `Accept` / `Reject` / `Cancel`, `performGroupJoinRequestSend` / `Accept` / `Reject` / `Cancel`, `performGroupMemberRoleChange`, `performGroupMemberRemove`. Pro gating aligned with legacy `assertUserSubscribed` except **invitation reject** (legacy had no Pro check). |
| **`@deepnotes/api`** | `groupJoinInvitationSendRequestSchema`, `groupJoinInvitationAcceptRequestSchema`, `groupJoinRequestSendRequestSchema`, `groupJoinRequestAcceptRequestSchema`, `groupMemberRolePatchRequestSchema`, `groupMemberRoleSchema`, `groupUserIdPathSchema` in [schemas/pages-groups.ts](packages/api/src/schemas/pages-groups.ts); paths in [openapi.ts](packages/api/src/openapi.ts); exports from [index.ts](packages/api/src/index.ts). |
| **`@deepnotes/api-worker`** | Hono: `POST /api/groups/:groupId/join-invitations`, `POST …/join-invitations/me/accept`, `POST …/me/reject`, `DELETE …/join-invitations/:userId`; `POST …/join-requests`, `POST …/join-requests/me/cancel` (**registered before** `…/:userId/accept` so `me` is not captured), `POST …/:userId/accept`, `POST …/:userId/reject`; `PATCH` / `DELETE` `/api/groups/:groupId/members/:userId`. |
| **Tests** | [Integration](#phase-3-test-coverage-detail) row **slice 9**; [openapi.test.ts](packages/api/src/openapi.test.ts) path assertions; worker **503** **65** routes. |

**HTTP summary (OpenAPI):**

| Method + path | Role |
|---------------|------|
| `POST /api/groups/{groupId}/join-invitations` | Manager sends invite (`inviteeUserId`, `invitationRole`, ciphertext; `encryptedAccessKeyring` required iff group **private**) |
| `POST /api/groups/{groupId}/join-invitations/me/accept` | Invitee accepts (`userEncryptedName`) |
| `POST /api/groups/{groupId}/join-invitations/me/reject` | Invitee rejects |
| `DELETE /api/groups/{groupId}/join-invitations/{userId}` | Manager cancels invite to `userId` |
| `POST /api/groups/{groupId}/join-requests` | Requester asks to join (`are_join_requests_allowed`) |
| `POST /api/groups/{groupId}/join-requests/me/cancel` | Requester withdraws pending request |
| `POST /api/groups/{groupId}/join-requests/{userId}/accept` | Manager accepts (`targetRole`, keyrings; access keyring iff private) |
| `POST /api/groups/{groupId}/join-requests/{userId}/reject` | Manager rejects (`rejected = true` on row) |
| `PATCH /api/groups/{groupId}/members/{userId}` | `role` change |
| `DELETE /api/groups/{groupId}/members/{userId}` | Remove member or **leave** (self) |

### Pages REST — slice 10 (collab updates REST)

**Goal:** Persist and load encrypted Yjs update blobs in **`page_updates`** over HTTP so the SPA can hydrate the editor **without** legacy collab-server or Redis. Matches legacy DB shape used after flush from Redis; **does not** replace live multi-user collab (WebSocket track still required for low-latency sync).

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | [page-collab-updates.ts](packages/session/src/page-collab-updates.ts) — `performGetPageCollabUpdates` (`viewGroupPages`, ordered by `index`) **+** `groupId`, `pageEncryptedSymmetricKeyring`, `groupEncryptedContentKeyring`, `groupAccessKeyring` / `memberEncryptedAccessKeyring` for SPA unwrap; `performAppendPageCollabUpdates` (`editGroupPages`, transaction + `max(index)` check, contiguous indices, **409** on stale `expectedLastIndex`) |
| **`@deepnotes/api`** | `pageCollabUpdatesGetResponseSchema`, `pageCollabUpdatesAppendRequestSchema` in [schemas/pages-groups.ts](packages/api/src/schemas/pages-groups.ts); OpenAPI `GET` + `POST` `/api/pages/{pageId}/collab-updates` |
| **`@deepnotes/api-worker`** | Hono handlers; JSON `encryptedData` as base64 |
| **Tests** | [account-flows.integration.test.ts](packages/session/src/account-flows.integration.test.ts) extends **groups + pages** case (collab `GET` crypto fields); [openapi.test.ts](packages/api/src/openapi.test.ts); worker 503 matrix **70** routes |
| **Docs** | [TRPC_REST_MAP.md](./docs/TRPC_REST_MAP.md) — **Collab bootstrap** table |

**Client contract:** `GET` returns `{ lastIndex, updates, groupId, pageEncryptedSymmetricKeyring, groupEncryptedContentKeyring, groupAccessKeyring, memberEncryptedAccessKeyring }` (`lastIndex` **null** if no rows). `POST` body `{ expectedLastIndex, updates: [{ index, encryptedData }] }` — first row must be index **0** when `expectedLastIndex` is **null**; subsequent appends must use contiguous indices. **Intentional:** no Redis cache invalidation (RESTART_PLAN); mixed legacy collab + new REST writers on the same page can diverge until cutover.

### Phase 3 — Stripe (billing + webhooks + account hooks)

Replaces legacy Fastify `/stripe/webhook` and tRPC `users.account.stripe.*` using **Postgres** `users.customer_id` (no KeyDB `customer` → `user-id` hash).

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/session`** | [stripe-billing.ts](packages/session/src/stripe-billing.ts) — `performStripeCreateCheckoutSession` (monthly/yearly `price_*`, `Origin` or `PUBLIC_APP_URL` for success URL), `performStripeCreatePortalSession`, `parseStripeWebhookEvent` + `processStripeWebhookEvent` (`customer.subscription.updated` / `deleted` → `plan` / `subscription_id`, same branching as legacy `stripe-webhook.ts`). `findUserIdByStripeCustomerId` for tests and ops. |
| **`@deepnotes/api`** | [schemas/billing.ts](packages/api/src/schemas/billing.ts); OpenAPI paths registered in [openapi.ts](packages/api/src/openapi.ts). |
| **`@deepnotes/api-worker`** | `getStripeBillingEnv` / `getStripeWebhookSecret` in [session-env.ts](apps/api-worker/src/session-env.ts); `POST /api/billing/stripe/checkout-session` (optional JSON body), `POST /api/billing/stripe/portal-session`, `POST /api/webhooks/stripe` (raw body, `Stripe-Signature`); when `STRIPE_SECRET_KEY` is set: **`deleteStripeCustomer`** on `DELETE /api/users/me`, **`updateStripeCustomerEmail`** on `POST /api/users/me/email-change/confirm`. |
| **Config** | [template.env](template.env) — `STRIPE_SECRET_KEY`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`; [DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md). |
| **Tests** | Vitest 503 matrix **70** routes total (includes Stripe **+** [slice 10 `collab-updates`](#pages-rest--slice-10-collab-updates-rest)); no live Stripe calls in CI yet. |

**Gaps (optional follow-ups):** Integration tests with Stripe test clock / fixtures; `checkout.session.completed` if product needs it beyond `subscription.updated`.

### Not started (Phase 3 — realtime / collab WebSocket)

Sprints **1–9** (pages / groups / membership), **Stripe**, and **[slice 10 — Postgres `page_updates` REST](#pages-rest--slice-10-collab-updates-rest)** are tracked above. Remaining work:

- [ ] **Collab WebSocket + realtime** — end-state: live Yjs-style sync with JWT-on-upgrade and **no** `next_key_rotation_date` / scheduled re-key ([RESTART_PLAN](../docs/RESTART_PLAN.md) §4.3). Suggested build order (can be parallelized after item 1):
  1. **Auth on upgrade:** reuse access JWT from `accessToken` cookie (same verification as HTTP); reject missing/invalid before accepting the socket; document subprotocol / first-message handshake if needed.
  2. **Room model:** one room per `pageId` (legacy pattern `…/page:{pageId}` or new versioned path); enforce `viewGroupPages` / `editGroupPages` from session + Drizzle before joining.
  3. **Wire format:** either **byte parity** with legacy collab-server (lib0 + `@deeplib/misc` message enums, golden fixtures) or **collab v2** with a semver’d protocol and a single cutover client—decide explicitly in code + short appendix next to OpenAPI.
  4. **Fan-out:** **Cloudflare Durable Object** per page (hibernatable WebSockets) vs dedicated Node/realtime process; REST [slice 10](#pages-rest--slice-10-collab-updates-rest) remains the Postgres source of truth for cold start / catch-up.
  5. **Optional Redis:** hot `page-update-*` buffer / pub-sub for multi-instance parity with legacy `@deeplib/data`—only if load tests or migration needs justify it (standard Redis commands only).
  6. **Tests:** at least one integration test per stream (collab + realtime) with Redis or in-memory doubles as required by the chosen topology ([RESTART_PLAN §8](../docs/RESTART_PLAN.md)).

---

### Phase 4 — OpenAPI typed client (bootstrap)

**Goal:** SPA uses a **small typed HTTP layer** (RESTART_PLAN §5.1 / §5.8): no `@deepnotes/api-worker`, `@deepnotes/db`, or Drizzle from `apps/web` source; session cookies via `credentials: "include"`.

| Layer | What shipped |
|-------|----------------|
| **Codegen** | `pnpm --filter @deepnotes/web run generate:api-types` — `scripts/generate-api-types.mts` imports `getOpenApiDocument` from `@deepnotes/api` (dev-time only), writes `src/api/openapi.json`, runs `openapi-typescript` → `src/api/api-types.generated.ts`. **Re-run when `packages/api` OpenAPI paths change** (CI can add a drift check later: compare committed JSON to fresh dump). |
| **Runtime** | `openapi-fetch` + `createDeepnotesApiClient` / `resolveApiBaseUrl` in [apps/web/src/api/client.ts](apps/web/src/api/client.ts); optional `VITE_API_URL` (no trailing slash) in [vite-env.d.ts](apps/web/src/vite-env.d.ts) for cross-origin API during dev. |
| **Tests** | [apps/web/src/api/client.test.ts](apps/web/src/api/client.test.ts) — mocked `fetch` asserts `Request.credentials === "include"` and `/api/health` URL. |
| **Lint** | [apps/web/eslint.config.js](apps/web/eslint.config.js) ignores generated `api-types.generated.ts` and `openapi.json`. |

**Intentional gaps:** no MSW/contract suite yet; no `import/no-restricted-paths` until more packages exist to accidentally import.

### Phase 4 — routing + session UI

| Layer | Shipped |
|-------|---------|
| **Router** | [`router.ts`](apps/web/src/router.ts) — `createWebHistory`, `/`, [`/register`](apps/web/src/features/auth/RegisterView.vue), `/login` (lazy), [`/page/:pageId` → `PageEditorView`](apps/web/src/features/pages/PageEditorView.vue). |
| **Session** | [`useSession`](apps/web/src/features/auth/useSession.ts) — `bootstrap` (single in-flight + `bootstrapped` gate), `fetchMe`, `loginWithPassword` + **2FA** branch, `loginWithDemo`, `logout`. Cookie hint via [`readDocumentCookie`](apps/web/src/features/auth/cookies.ts) (`loggedIn` only; access/refresh stay httpOnly). |
| **Demo** | [`buildSessionDemoRequest`](apps/web/src/features/auth/build-demo-session.ts) — `libsodium` + `nanoid`, base64 field shapes match OpenAPI. |
| **Auth preimage** | [`bytes.ts`](apps/web/src/features/auth/bytes.ts) — `loginPreimageFromPassword` = UTF-8 bytes of the password; **must** match register + login. |
| **Vite** | [Proxy `→ 8787`](apps/web/vite.config.ts) for `wrangler dev`; `optimizeDeps` for `libsodium-wrappers-sumo`. |
| **Docs** | [apps/web/README.md](apps/web/README.md) — feature folders + sign-in contract. |

### Phase 4 — pages list, editor, register

| Layer | Shipped |
|-------|---------|
| **Routes** | [`/page/:pageId`](apps/web/src/features/pages/PageEditorView.vue) (auth: redirect to login with `?redirect=`); guest [`/register`](apps/web/src/features/auth/RegisterView.vue). |
| **Registration** | [`buildUserRegisterRequest`](apps/web/src/features/auth/build-user-register.ts) = [`buildSessionDemoRequest`](apps/web/src/features/auth/build-demo-session.ts) + `email` + `loginHash` from [`uint8ToBase64(loginPreimage)`](apps/web/src/features/auth/bytes.ts); test [`build-user-register.test.ts`](apps/web/src/features/auth/build-user-register.test.ts). **201** → redirect to `/login?registered=1` + banner. |
| **Page list** | [`useGroupPages`](apps/web/src/features/pages/useGroupPages.ts): `GET /api/users/me/groups` then per group `GET /api/groups/{groupId}/pages` (first window, max 20); [HomeView](apps/web/src/features/home/HomeView.vue) shows links. |
| **Editor + collab REST** | See [Phase 4 — collab decrypt + Yjs + POST append](#phase-4--collab-decrypt--yjs--post-append). |

### Phase 4 — collab decrypt + Yjs + POST append

**Goal:** SPA loads encrypted `page_updates` over HTTP, unwraps the page symmetric keyring (group access → group content → `PageKeyring`), decrypts each blob with legacy **`PageDocUpdate`** AAD, applies **`Y.applyUpdateV2`**, and debounced **`POST …/collab-updates`** with **`encodeStateAsUpdateV2`** deltas encrypted the same way.

| Layer | What shipped |
|-------|----------------|
| **`@deepnotes/e2ee`** | New workspace package: browser-safe vendored keyring + `derivePasswordValues` (Argon2id, libsodium) from `@deepnotes/session` crypto — **no** DB / server imports. |
| **`passwordSalt` (login)** | [session-responses.ts](packages/api/src/schemas/session-responses.ts) optional on `SessionLoginSuccess`; [login.ts](packages/session/src/login.ts) sets **base64 Argon2 salt** from decrypted PHC so the SPA can derive the same master key as the server for `UserPrivateKeyring` / `UserSymmetricKeyring` unwrap. Omitted for `POST /api/sessions/demo`. |
| **Session keyrings in `sessionStorage`** | [crypto-storage.ts](apps/web/src/features/auth/crypto-storage.ts), [session-keyrings.ts](apps/web/src/features/auth/session-keyrings.ts): after password login, unwrap `User*` + wrap `SessionUser*` (legacy contexts); store wrapped blobs + raw `sessionKey` for subsequent unwrap; [useSession](apps/web/src/features/auth/useSession.ts) calls **`applyRefreshToStoredKeyrings`** on bootstrap refresh; **clear** on demo / logout / failed refresh. |
| **Collab `GET` payload** | [page-collab-updates.ts](packages/session/src/page-collab-updates.ts) adds `groupId`, `pageEncryptedSymmetricKeyring`, `groupEncryptedContentKeyring`, `groupAccessKeyring` (nullable), `memberEncryptedAccessKeyring` (nullable). [pages-groups Zod + OpenAPI](packages/api/src/schemas/pages-groups.ts); worker JSON; integration asserts non-empty bootstrap fields. |
| **Client unwrap chain** | [page-collab-crypto.ts](apps/web/src/features/pages/page-collab-crypto.ts): member-vs-public access coalesce, asymmetric unwrap with session `PrivateKeyring`, `GroupContentKeyring` + `PageKeyring` contexts; **explicit errors** for group-password / locked layers (not in MVP). |
| **Page UI** | [PageEditorView.vue](apps/web/src/features/pages/PageEditorView.vue): hydrate textarea from server; debounced save; demo / missing-crypto banners. |

**Limits (documented in UI):** **Demo** accounts cannot derive client keys (no `passwordSalt`). **`/register`** uses [build-user-register](apps/web/src/features/auth/build-user-register.ts) (real crypto). **Group password** / non-raw content keyrings are rejected with a clear message.

### Phase 4 — register crypto parity

**Goal:** Replace random `buildSessionDemoRequest`/`buildUserRegisterRequest` blobs with libsodium keyrings + group/page creation matching [legacy `getRegistrationValues`](../apps/client/src/code/areas/auth/register.ts) so new accounts can use the editor E2EE path end-to-end.

| Step | Status |
|------|--------|
| Client: real user box keypair + symmetric keyring (**raw** inner blobs for `POST /api/users`; server applies `UserEncrypted*` wrap — same as demo path) | **Done** |
| Personal **`groupCreation`**: private group (`groupIsPublic: false`), `GroupContentKeyring` / `GroupPrivateKeyring` / asymmetric access + internal rings | **Done** |
| **`pageCreation`**: page symmetric keyring + `PageRelativeTitle` / `PageAbsoluteTitle` (“Main page” / empty) | **Done** |
| Defaults: **`msgpackr`** `UserDefaultNote` / `UserDefaultArrow` shapes aligned with legacy | **Done** |
| **`persistSessionKeyringsFromLogin`**: unwrap `UserPrivateKeyring` / `UserSymmetricKeyring` only when `topLayer !== Raw` after server unwrap (legacy double-wrap vs greenfield raw inner) | **Done** |
| Optional: demo path that uses a deterministic dev keyring for CI | **Todo** |

**Intentional gap:** [Phase 3 WS collab](#not-started-phase-3--realtime--collab-websocket); Tiptap; MSW/Playwright.

**Tests:** [build-user-register.test.ts](apps/web/src/features/auth/build-user-register.test.ts) — raw user keyrings, private group, `UserName` decrypt round-trip.

### Phase 4 — groups overview (thin SPA)

**Goal:** RESTART_PLAN Phase 4 “groups subset” — one screen over existing HTTP: `GET /api/users/me/groups`, then per group `GET …/main-page`, `GET …/members`, `GET …/pages` (first 20, same cap as [useGroupPages](apps/web/src/features/pages/useGroupPages.ts)), without rebuilding legacy Quasar group admin.

| Layer | What shipped |
|-------|----------------|
| **Fetch + composable** | [groups-overview.ts](apps/web/src/features/groups/groups-overview.ts) — `fetchGroupsOverview` (parallel GETs, `isPersonal` vs `user.personalGroupId`, `membersUnavailable` on 403/404 for `…/members`); [useGroupsOverview.ts](apps/web/src/features/groups/useGroupsOverview.ts). |
| **UI** | [GroupsView.vue](apps/web/src/features/groups/GroupsView.vue) — `/groups`, auth redirect, cards with main-page link + member count + page id buttons; [router](apps/web/src/router.ts); [App.vue](apps/web/src/App.vue) “Groups” nav link. |
| **Tests** | [groups-overview.test.ts](apps/web/src/features/groups/groups-overview.test.ts) — mocked `client.GET` (two groups). |
| **Docs** | [apps/web/README.md](apps/web/README.md) — `features/groups`. |

**Gaps:** join invite/request and member role UI still API-only ([slice 9](#pagesgroups-rest--slice-9-membership--join-invites--requests)).

### Phase 4 — notifications (thin SPA)

**Goal:** Same pattern as [groups overview](#phase-4--groups-overview-thin-spa) — one authenticated screen over existing REST, without legacy Quasar.

| Layer | What shipped |
|-------|----------------|
| **Fetch + helpers** | [notifications-list.ts](apps/web/src/features/notifications/notifications-list.ts) — `fetchNotificationsPage` (first page + `lastNotificationId` pagination), `readCursorForUnread` when the API omits `lastNotificationRead` on older pages, `isNotificationUnread(id, lastNotificationRead)`, `markAllNotificationsRead` → `POST /api/users/me/notifications/read` |
| **Composable** | [useNotifications.ts](apps/web/src/features/notifications/useNotifications.ts) — `loadFirst`, `loadMore`, `markRead` (local unread clear + cursor set to `max(id)` to match server) |
| **UI** | [NotificationsView.vue](apps/web/src/features/notifications/NotificationsView.vue) — `/notifications`, header nav, cards with `type` + formatted `dateTime`, “New” when `id > lastNotificationRead` (or no cursor), placeholder line for encrypted body |
| **Tests** | [notifications-list.test.ts](apps/web/src/features/notifications/notifications-list.test.ts) — unread math, first page, paginated cursor, 401, mark-read 204 |
| **Docs** | [apps/web/README.md](apps/web/README.md) — `features/notifications` |

**Gaps (intentional):** Ciphertext not decrypted; full parity with legacy in-app toasts is future work.

---

## Phase 4 checklist (client MVP)

- [x] **Tooling (bootstrap):** Vitest + **happy-dom** + `@vue/test-utils` in `@deepnotes/web` (minimal `App` test); same Vite 6 pipeline via `vitest/config` `defineConfig` (RESTART_PLAN §5.8).
- [x] **API client (bootstrap):** typed client from the same OpenAPI document as the Worker—see [Phase 4 — OpenAPI typed client](#phase-4--openapi-typed-client-bootstrap). Runtime bundle does **not** import `@deepnotes/api` (only generated `api-types.generated.ts` + `openapi-fetch`); regenerate after OpenAPI changes.
- [x] **Routing + session UI (slice a):** `vue-router` + [`App.vue` shell](apps/web/src/App.vue) (header, Register / Sign in / Sign out). **`useSession`**: as below; Vite [proxy `/api` → 127.0.0.1:8787](apps/web/vite.config.ts). **CORS:** API must allow this app’s origin; proxy avoids cross-origin in local dev. **Not done:** Playwright E2E.
- [x] **Pages + editor + register (slice b):** [Phase 4 — pages, editor, register](#phase-4--pages-list-editor--register) — routing, list, register, local Yjs. **Extended:** [Phase 4 — collab decrypt + Yjs + POST append](#phase-4--collab-decrypt--yjs--post-append) on [`PageEditorView`](apps/web/src/features/pages/PageEditorView.vue) (`applyUpdateV2`, `encodeStateAsUpdateV2`, `POST` append, `passwordSalt` + `sessionStorage` session keyrings). **Register:** [real register crypto](#phase-4--register-crypto-parity) (`msgpackr` + `@deepnotes/e2ee`; private personal group). **Not done:** [live collab WebSocket](#not-started-phase-3--realtime--collab-websocket).
- [x] **Groups** overview as thin SPA: [`/groups`](apps/web/src/features/groups/GroupsView.vue) + [fetch helper](apps/web/src/features/groups/groups-overview.ts) (list → main page + members count + first page window). **Not done:** invite/request/member admin UI.
- [x] **Notifications** as thin SPA: [`/notifications`](apps/web/src/features/notifications/NotificationsView.vue) + [notifications-list.ts](apps/web/src/features/notifications/notifications-list.ts) — see [Phase 4 — notifications (thin SPA)](#phase-4--notifications-thin-spa). **Not done:** decrypt notification payloads in the browser.
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

- [x] **E2EE primitives:** [`@deepnotes/e2ee`](../packages/e2ee) — keyring + Argon2 helpers for the SPA only (RESTART_PLAN: no server/Drizzle in the browser bundle). `@deepnotes/session` remains server-side.
- [x] **API surface:** `src/api/` — generated `paths` + `createDeepnotesApiClient`; bundle does not depend on `@deepnotes/api` at runtime (codegen devDeps only). **Still to enforce:** ESLint `import/no-restricted-paths` banning `@deepnotes/api-worker`, `@deepnotes/db`, `drizzle-orm` from `apps/web/src/**` once rule config is added.
- [x] **Feature folders (bootstrap):** `src/features/auth`, `src/features/home`, `src/features/groups`, `src/features/notifications` ([notifications list](apps/web/src/features/notifications/NotificationsView.vue)), `src/features/pages` — [apps/web/README.md](./apps/web/README.md). **Optional later:** `src/shared/ui` re-exports if primitives grow; ESLint `import/no-restricted-paths` when enforced.
- [x] **Session composable:** [`useSession.ts`](./apps/web/src/features/auth/useSession.ts) (testable) + thin [`LoginView.vue`](./apps/web/src/features/auth/LoginView.vue) / [`App.vue`](./apps/web/src/App.vue). **Later:** keyring + page crypto in dedicated modules (not in `.vue` only).
- [x] **Tailwind + shadcn-vue:** Tailwind v4 (`@tailwindcss/vite`, [`globals.css`](./apps/web/src/styles/globals.css)); `npx shadcn-vue init` + `button` / `input` / `label` / `card` / `alert` / `checkbox`; shell uses utility classes + `@/components/ui/*` ([README — Styling](./apps/web/README.md#styling)). ESLint ignores generated [`src/components/ui`](./apps/web/src/components/ui).

### Testing (see RESTART_PLAN §5.8)

- [x] **Vitest** in `apps/web` with DOM environment (`happy-dom`) and `@vue/test-utils` aligned with Vite 6.
- [x] **Composable tests (bootstrap):** [`bytes.test.ts`](./apps/web/src/features/auth/bytes.test.ts) (base64 + UTF-8 preimage); [`app.test.ts`](./apps/web/src/app.test.ts) (router + bootstrap, no `loggedIn` cookie). **Not done:** `LoginView` / `useSession` MSW or mocked `fetch` matrix (401, 2FA, demo).
- [ ] **Contract tests** for the fetch wrapper (MSW or recorded OpenAPI fixtures)—optional until multiple features consume the API.
- [ ] **E2E smoke** (Playwright recommended): login or session refresh with **httpOnly cookies** against **local compose** or **Cloudflare preview**—add CI job when stable enough (can start `manual`/`workflow_dispatch` if cost is a concern).

#### Automated tests — package matrix (maintenance)

| Package / app | Role | What runs today | Gaps (highest value next) |
|---------------|------|------------------|---------------------------|
| **`@deepnotes/db`** | Drizzle + migrations | `template-db.test.ts` (6 cases): clone template, empty `users`, **FK** rejects for orphan `sessions`, **`devices`→`users`**, **`pages`→`groups`**, **`group_members`→`users`**, **`group_members`→`groups`** | More paths when groups CRUD lands (join invites/requests, cascades from `groups` delete) |
| **`@deepnotes/session`** | Auth, account, crypto orchestration | Unit: `login-rate-limit`, `encrypt-user-email`, `email-hash`, `send-email-change-code`. **Integration:** `account-flows.integration.test.ts` (**24** cases when DB env set) — … + [slice 6](#pages-rest--slice-6-bump-backlinks-snapshots-deletion) + [slice 7 move](#pages-rest--slice-7-move--group-creation) + [slice 8 create + `groupCreation`](#pagesgroups-rest--slice-8-create--groupcreation) + [slice 9](#pagesgroups-rest--slice-9-membership--join-invites--requests); template `dn_test_tpl_session_email`, **`@deepnotes/db/testing/template-db`**. | **Redis** + `performSessionLogin` failed-login counters; refresh **expired JWT**; optional: invitation **reject/cancel**, join-request **reject/cancel**, **private** group invite/request **access keyring** branches |
| **`@deepnotes/api`** | Zod + OpenAPI | `openapi.test.ts` (session routes + [slice 6/7 `/api/pages/...` paths](#pages-rest--slice-6-bump-backlinks-snapshots-deletion)); **`schemas/users.test.ts`**; **`schemas/pages-groups.ts`**, **`schemas/user-pages.ts`** | Optional OpenAPI **snapshot**; more Zod edge cases for new page schemas |
| **`@deepnotes/api-worker`** | Hono on Worker | `index.test.ts`: **70** tests (503 matrix when env/Hyperdrive missing) — includes [slice 6](#pages-rest--slice-6-bump-backlinks-snapshots-deletion) + `/api/pages/{pageId}/move` + [slice 9](#pagesgroups-rest--slice-9-membership--join-invites--requests) + [slice 10 `…/collab-updates`](#pages-rest--slice-10-collab-updates-rest) (`GET` + `POST`) + [Stripe routes](#phase-3--stripe-billing--webhooks--account-hooks) (`/api/billing/stripe/*`, `/api/webhooks/stripe`) | **200** tests with stub `SessionEnv` + template DB (heavier) |
| **`@deepnotes/web`** | SPA | `app.test.ts` (router + `App`, bootstrap); **`client.test.ts`**; **`bytes.test.ts`**; **`build-user-register.test.ts`**; **`groups-overview.test.ts`**; **`notifications-list.test.ts`**; Vitest [include](apps/web/vite.config.ts) `src/**/*.test.ts` | MSW/contract for login + 2FA; **`page-collab-crypto`** unit tests (optional); `generate:api-types` when OpenAPI changes; Playwright (see Phase 4 checklist) |
| **`@deepnotes/e2ee`** | Client crypto | *No tests yet* (vendored from session crypto); typecheck via `tsc` | Golden vectors vs `@deepnotes/session` crypto for drift detection |

**Principle:** keep **fast unit tests** on pure crypto, Zod, and mail/HTTP branches; add **Postgres-backed** flows incrementally (same template pattern as `@deepnotes/db`) so Phase 3 routes do not regress silently.

### Progress vs legacy (reference only)

| Legacy (`apps/client`) | New (`new-deepnotes/apps/web`) |
|------------------------|--------------------------------|
| Quasar + Vite 2, 4GB heap builds | Vite 6 + Vue 3.5, Vitest + happy-dom in CI |
| Imports `AppRouter`, server websocket paths | Must use **OpenAPI** + documented WS only |
| No automated UI tests | **Done:** `app.test` + `client.test` + `bytes.test` + `build-user-register.test`; pages/register routes + [`HomeView`](./apps/web/src/features/home/HomeView.vue) + [`PageEditorView`](./apps/web/src/features/pages/PageEditorView.vue) |

---

## Success criteria (RESTART_PLAN §8)

- [x] OpenAPI source of truth; client **generated** types (`openapi-typescript`) + `openapi-fetch` in `@deepnotes/web` — [Phase 4 — OpenAPI typed client](#phase-4--openapi-typed-client-bootstrap).
- [ ] Drizzle migrations from empty DB documented for production upgrades.
- [ ] Cold API dev start under **2 s** (no `inspect-brk` by default) — validate on a typical laptop.
- [ ] Collab + realtime: at least one integration test each (Redis + deps).
- [x] SQL-heavy paths: real Postgres tests; prefer **template DB** cloning (§5.7) — `@deepnotes/db` `template-db.test.ts` (clone + **sessions / devices / pages / `group_members`** FK rejects); `@deepnotes/session` `account-flows.integration.test.ts` (account + **2FA** + **groups/pages** + [slice 8 create + `groupCreation`](#pagesgroups-rest--slice-8-create--groupcreation) + [slice 9 membership](#pagesgroups-rest--slice-9-membership--join-invites--requests) + prefs + [slice 4–5](#pagesgroups-rest--slice-4-group-password-privacy-deletion) + [slice 6](#pages-rest--slice-6-bump-backlinks-snapshots-deletion) + [slice 7](#pages-rest--slice-7-move--group-creation)).
- [ ] Auth, crypto, Stripe: automated coverage beyond smoke; **no** generic repository layer (§5.0). **Progress:** [Phase 3 test coverage (detail)](#phase-3-test-coverage-detail) — **24** `account-flows` + **6** `@deepnotes/db` when DB set; slices [6](#pages-rest--slice-6-bump-backlinks-snapshots-deletion)–[9](#pagesgroups-rest--slice-9-membership--join-invites--requests). **Stripe:** [shipped](#phase-3--stripe-billing--webhooks--account-hooks); add integration tests (webhook + checkout) when CI secrets allow. **Next:** **Redis** failed-login against real Redis; Stripe E2E tests optional.
- [x] No tRPC / superjson / RevenueCat / key-rotation in **this** tree (keep absent); product sign-off for IAP/Stripe when billing ships.
- [x] Client: zero undocumented forks, or a short owned exception list — see [docs/CLIENT_FORKS.md](./docs/CLIENT_FORKS.md).
- [ ] Cloudflare: deploy runbook; Hyperdrive + Postgres + Redis proven in staging; collab/realtime topology chosen and load-tested.
- [x] Web: Vitest + DOM env in CI (happy-dom + `@vue/test-utils` on `App.vue`).
- [ ] Web: enforce **no** server/db imports from web source (ESLint `import/no-restricted-paths` or README when features land); **E2E** smoke for session cookies (RESTART_PLAN §8).

---

## Phase 3 working order (suggested)

| Order | Item | Rationale / notes |
|-------|------|----------------------|
| ✅ | Slices 1–9 (through [membership + joins](#pagesgroups-rest--slice-9-membership--join-invites--requests)) | Account, pages/groups CRUD, move, create-with-new-group, invitations/requests/member role/remove. |
| ✅ | **[Slice 10](#pages-rest--slice-10-collab-updates-rest)** — `page_updates` **GET** + append **POST** | Editor bootstrap + optimistic append on Postgres; no WS yet. |
| **1** | **Collab WebSocket + realtime** (JWT upgrade; Yjs/binary fan-out; no key rotation) | [RESTART_PLAN §4.3](../docs/RESTART_PLAN.md); optional Redis buffer parity; DO vs separate service; load-test before freeze. |
| ✅ | **Stripe** — checkout, portal, webhooks, account hooks | [Phase 3 — Stripe](#phase-3--stripe-billing--webhooks--account-hooks); secrets in [template.env](./template.env) and [DEPLOY_CLOUDFLARE](docs/DEPLOY_CLOUDFLARE.md). |

---

## Short log (newest first)

| Date | Change |
|------|--------|
| 2026-04-27 | **Phase 4 — notifications (thin SPA):** [notifications-list.ts](apps/web/src/features/notifications/notifications-list.ts) (`fetchNotificationsPage`, `readCursorForUnread` for paged `GET`, `markAllNotificationsRead`); [useNotifications.ts](apps/web/src/features/notifications/useNotifications.ts); [NotificationsView.vue](apps/web/src/features/notifications/NotificationsView.vue) at `/notifications` (type + time, unread via `lastNotificationRead`, “Load older”, “Mark all as read”); [App.vue](apps/web/src/App.vue) nav; [notifications-list.test.ts](apps/web/src/features/notifications/notifications-list.test.ts). [PLAN_PROGRESS — section](#phase-4--notifications-thin-spa). **Next (Phase 4):** join/member/invite UI; Tiptap; MSW/Playwright; optional notification decrypt. |
| 2026-04-27 | **Phase 4 — groups overview (thin SPA):** [groups-overview.ts](apps/web/src/features/groups/groups-overview.ts) `fetchGroupsOverview` (parallel `me/groups`, per-group `main-page`, `members`, `pages`); [GroupsView.vue](apps/web/src/features/groups/GroupsView.vue) at `/groups`; header link; [groups-overview.test.ts](apps/web/src/features/groups/groups-overview.test.ts). [PLAN_PROGRESS — section](#phase-4--groups-overview-thin-spa). |
| 2026-04-27 | **Phase 4 — register crypto parity:** [build-user-register.ts](apps/web/src/features/auth/build-user-register.ts) — real box keypair + symmetric user keyring (raw inner for server `UserEncrypted*`); private personal `groupCreation` (legacy-shaped `GroupContentKeyring` / access / internal / group private); `pageCreation` + **`msgpackr`** default note/arrow; optional `displayName`. [session-keyrings.ts](apps/web/src/features/auth/session-keyrings.ts): `UserPrivateKeyring` / `UserSymmetricKeyring` unwrap only when `topLayer !== Raw` (greenfield register vs legacy client-wrapped accounts). **`@deepnotes/web`** dependency **`msgpackr`**. Tests + copy in [RegisterView](apps/web/src/features/auth/RegisterView.vue). [PLAN_PROGRESS — register section](#phase-4--register-crypto-parity). |
| 2026-04-27 | **Phase 4 — collab E2EE + `passwordSalt`:** Package [`@deepnotes/e2ee`](./packages/e2ee) (browser keyring + Argon2). Login JSON adds optional **`passwordSalt`** ([session-responses](packages/api/src/schemas/session-responses.ts), [performSessionLogin](packages/session/src/login.ts)). Web: [session-keyrings](apps/web/src/features/auth/session-keyrings.ts), [crypto-storage](apps/web/src/features/auth/crypto-storage.ts), refresh rotation in [useSession](apps/web/src/features/auth/useSession.ts). Collab `GET` adds group/page key material ([page-collab-updates](packages/session/src/page-collab-updates.ts), OpenAPI + worker). [PageEditorView](apps/web/src/features/pages/PageEditorView.vue) + [page-collab-crypto](apps/web/src/features/pages/page-collab-crypto.ts): `applyUpdateV2`, debounced `POST` with `PageDocUpdate` AAD. **Docs:** [PLAN_PROGRESS — collab decrypt section](#phase-4--collab-decrypt--yjs--post-append). |
| 2026-04-27 | **Stack:** `@deepnotes/web` — Tailwind CSS v4 + shadcn-vue (Reka), `components.json`, `@/*` alias, [`README` styling](./apps/web/README.md#styling). |
| 2026-04-27 | **Phase 4 — routing + session UI:** `vue-router` (`/`, `/login`); `useSession` (refresh + me bootstrap, email/password + 2FA, demo, logout); `build-demo-session` + `libsodium`/`nanoid`; Vite proxy `/api` → `127.0.0.1:8787`; `App` shell + `HomeView` + `LoginView`; `bytes.test.ts` + updated `app.test.ts`; [apps/web/README.md](./apps/web/README.md). **Next (Phase 4):** page list, editor, register account form (same `loginHash` preimage as login). **Phase 3** still: collab + realtime [WebSocket](#not-started-phase-3--realtime--collab-websocket). |
| 2026-04-27 | **Phase 4 — OpenAPI typed client:** `@deepnotes/web` — `pnpm run generate:api-types` (`tsx` + `openapi-typescript`); committed `src/api/openapi.json` + `api-types.generated.ts`; `createDeepnotesApiClient` / `resolveApiBaseUrl` (`openapi-fetch`, `credentials: "include"`); `client.test.ts`; `VITE_API_URL`; eslint ignore for generated files. **Phase 3** collab WS backlog expanded (upgrade → room → wire → fan-out → Redis → tests). PLAN_PROGRESS Phase 4 snapshot → **In progress**. |
| 2026-04-27 | **Phase 3 — slice 10 (collab Postgres REST):** [page-collab-updates.ts](packages/session/src/page-collab-updates.ts) — `performGetPageCollabUpdates` / `performAppendPageCollabUpdates`; `GET|POST /api/pages/:pageId/collab-updates`; OpenAPI + Zod; [TRPC_REST_MAP](docs/TRPC_REST_MAP.md) collab bootstrap table; integration extends **groups + pages**; api-worker 503 matrix **70**. **Next:** collab + realtime **WebSocket** only. |
| 2026-04-27 | **Phase 3 — Stripe (billing):** [stripe-billing.ts](packages/session/src/stripe-billing.ts) — `performStripeCreateCheckoutSession` / `performStripeCreatePortalSession`, `processStripeWebhookEvent` (legacy `customer.subscription.updated` / `deleted` → `users.plan` + `subscription_id` via `users.customer_id`); [schemas/billing.ts](packages/api/src/schemas/billing.ts) + OpenAPI; Worker `POST /api/billing/stripe/checkout-session`, `…/portal-session`, `POST /api/webhooks/stripe` ([session-env](apps/api-worker/src/session-env.ts) `getStripeBillingEnv` / `getStripeWebhookSecret`); **`STRIPE_SECRET_KEY`** hooks: `deleteStripeCustomer` on `DELETE /api/users/me`, `updateStripeCustomerEmail` on email-change confirm. Dependencies: `stripe@^17.7` in session + api-worker. [TRPC_REST_MAP](docs/TRPC_REST_MAP.md); [template.env](template.env). Api-worker 503 matrix **68** tests. **Next:** [realtime + collab](#phase-3-working-order-suggested) only. |
| 2026-04-27 | **Phase 3 — slice 9 (membership + join flows):** [group-role-ranks.ts](packages/session/src/group-role-ranks.ts) (`canManageRole` / `canChangeRole` / `manageLowerRanks` parity); [group-membership.ts](packages/session/src/group-membership.ts) — invitations send/accept/reject/cancel, join requests send/accept/reject/cancel, `PATCH`/`DELETE` members; Zod + OpenAPI + Hono; [TRPC_REST_MAP](docs/TRPC_REST_MAP.md) WS table; **`byteB64`** passthrough in worker (decoded `Uint8Array`). `account-flows` **24** cases; api-worker 503 matrix **65**. [Slice 9 section](#pagesgroups-rest--slice-9-membership--join-invites--requests). **Next:** [realtime + collab](#phase-3-working-order-suggested). |
| 2026-04-27 | **Phase 3 — slice 8 (create + `groupCreation`):** [group-creation-shared.ts](packages/session/src/group-creation-shared.ts) + `performCreatePage` with optional `groupCreation` (Pro; path `groupId` = new id; `parentPageId` in personal group). `GroupPageCreateRequest` + OpenAPI; [TRPC_REST_MAP](docs/TRPC_REST_MAP.md) `pages.create`; `account-flows` **23** cases. [Slice 8 section](#pagesgroups-rest--slice-8-create--groupcreation); [working order](#phase-3-working-order-suggested) next = **group join + membership REST**. |
| 2026-04-27 | **Phase 3 — pages slice 7 (move):** `page-move.ts` `performPageMove` (Pro; optional `groupCreation` + reencrypt; `setAsMainPage` + `users_pages` swap for personal; `page_updates` + `page_snapshots` on cross-group); `pageMoveRequestSchema` in `@deepnotes/api`; `POST /api/pages/:pageId/move` + OpenAPI; worker **503** **55** tests; `account-flows` **22** cases; [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) `websocket/pages/move` row; [slice 7 section](#pages-rest--slice-7-move--group-creation). **Next:** group invites / requests REST or join routes; **realtime + collab**; **Stripe**. |
| 2026-04-27 | **Phase 3 — pages router slice 6 (bump, backlinks, snapshots, page deletion):** `page-operations.ts` (`performPageBump` … `performPagePurge`); `page_links` / `page_snapshots` + Postgres-only (no `page-backlinks` KeyDB); OpenAPI + Hono; worker **503** matrix **54** tests; `account-flows` **21** integration cases; [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) `pages.*` rows; [slice 6](#pages-rest--slice-6-bump-backlinks-snapshots-deletion). **Next:** `POST /api/pages/:pageId/move` (WS parity + `page_updates` / collab cache). |
| 2026-04-27 | **Phase 3 — groups slice 5 (`POST …/privacy/private`):** `performGroupPrivacyMakePrivate` + `groupPrivacyPrivateRequestSchema` (legacy `groupKeyRotationSchema` shape, base64 JSON); Hono + OpenAPI; worker **503** **45** tests; `account-flows` **20** integration cases (make private, already-private **400**, bad page keyset **400**); **TRPC_REST_MAP** Groups + WS `make-private` rows; [slice 5 section](#pagesgroups-rest--slice-5-privacy-private-re-key); [working order](#phase-3-working-order-suggested) now leads with **`pagesRouter`**. |
| 2026-04-27 | **Phase 3 — groups slice 4 (password, privacy, deletion):** `editGroupSettings` in `group-permissions.ts`; `SESSION` `GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY`; `user-plan.ts` (`assertUserProPlan`); `group-password.ts` / `group-privacy.ts` / `group-deletion.ts`; Hono + OpenAPI + Zod; worker **503** **44** tests; `account-flows` **19** integration cases; **TRPC_REST_MAP** updated; [slice 4 section](#pagesgroups-rest--slice-4-group-password-privacy-deletion) + not-started `privacy/private`. |
| 2026-04-27 | **Phase 3 — groups main-page + members (slice 3):** `performGetGroupMainPageId` / `performGetGroupMemberUserIds` (`group-main-and-members.ts`); `viewGroupMembers` in `group-permissions.ts` (public-only still **not** enough for members list); `GET /api/groups/:groupId/main-page` + `…/members`; OpenAPI + schemas; integration extends **groups + pages**; TRPC_REST_MAP **implemented** for `getMainPageId` / `getUserIds`; worker **503** matrix **36** rows; PLAN_PROGRESS slice 3 + working-order refresh. |
| 2026-04-27 | **Phase 3 — `users.pages` prefs (slice 2):** migration `0001_favorite_page_ids`; `user-page-prefs.ts` + Hono/OpenAPI routes (starting, path, recent, favorites, defaults PATCH, notifications); `schemas/user-pages.ts`; integration test **user page prefs**; TRPC_REST_MAP marked implemented; PLAN_PROGRESS sections + matrix counts (**18** session integration, **34** worker 503 rows). |
| 2026-04-27 | **Phase 3 — pages/groups slice 1:** `performGetUserGroupIds`, `performListGroupPages`, `performCreatePage` + `group-permissions.ts`; OpenAPI + Zod `pages-groups.ts`; api-worker `GET /api/users/me/groups`, `GET/POST /api/groups/:groupId/pages` (**201** create); [TRPC_REST_MAP](./docs/TRPC_REST_MAP.md) marked implemented for `getGroupIds`, `getPages`, `pages.create`; integration test **groups + pages**; PLAN_PROGRESS [Pages/groups REST — slice 1](#pagesgroups-rest--slice-1) + matrix bumps. |
| 2026-04-27 | **More real Postgres tests:** `account-flows.integration.test.ts` — **2FA recovery-code** login + one-time use + `decryptRecoveryCodes` count; **replay** of first refresh JWT after two rotations (**401**); **`loggedIn`** / missing refresh guards. `template-db.test.ts` — **`group_members`** FK to `users` and to `groups`. PLAN_PROGRESS: run commands, expanded tables, matrix + success criteria + working order. |
| 2026-04-27 | **Real Postgres tests (session + db):** `account-flows.integration.test.ts` — login + double refresh, wrong password, demo **403**, **2FA** (enable/finish + TOTP login, wrong finish code, MFA required, bad TOTP). `template-db.test.ts` — orphan **`sessions`**, **`devices`**, **`pages`→`groups`** FK rejects. PLAN_PROGRESS: Phase 3 detail table, package matrix, success criteria, working order. |
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
