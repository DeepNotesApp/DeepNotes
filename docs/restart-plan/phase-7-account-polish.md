# Phase 7: Account, billing, groups polish

> **Prerequisites:** Phase 4 and Phase 5 done.  
> **Status:** Partial (see open gaps below)

---

## Goal

All non-editor UX is polished and tested.

---

## Deliverables

1. **Account page parity**
   - Password change, email change/verify, 2FA management, account deletion. ✅
   - Stripe checkout + customer portal. ✅
   - Raw keyrings display / key rotation — **removed** per `TRPC_REST_MAP.md` (accepted regression).

2. **Group management parity**
   - Invite by user ID, accept invite, join request, member roles, remove member. ✅
   - Group settings: join policy, make public/private, soft-delete, purge. ✅
   - Group password enable / change / disable UI. ✅ — `GroupDetailView.vue` uses `useGroupMembersDetail` which calls `POST/PATCH/DELETE /api/groups/:groupId/password` via `group-password-crypto.ts` helpers; unit tests verify correct keyring wrapping.

3. **Notifications**
   - Notifications list page with decrypt and mark-as-read. ✅
   - **Realtime toast / badge** when invite received — not implemented. The legacy app showed a toolbar badge + popup; the new SPA requires navigating to `/notifications`. ❌

4. **Home / navigation**
   - Recents, favorites, starting page, spatial defaults. ✅
   - Search — legacy had no global search; still not present (neutral).

5. **Group password unlock**
   - `unlockPageCollabSymmetricKeyring` now accepts `groupPasswordKey` and is unit-tested. ✅
   - `useCollabCrypto` exposes `unlockKeyringWithPassword`. ✅
   - `PageEditorCollabStatusCard.vue` detects password-protected errors and shows an unlock form; `PageEditorView.vue` wires `onUnlockWithPassword` to reload the collab doc after successful unlock. ✅

6. **Scheduler / background cleanup**
   - Legacy `apps/scheduler` ran scheduled cleanup (purge soft-deleted data).
   - Implemented `performScheduledCleanup` in `packages/session/src/scheduled-cleanup.ts`.
   - Wired into `apps/api-worker/src/index.ts` via Cloudflare `scheduled` handler.
   - Cron trigger configured in `wrangler.toml` (`0 3 * * *`).
   - Documented in `docs/SCHEDULER.md`.
   - Integration test added: `packages/session/src/scheduled-cleanup.integration.test.ts`.

7. **`@deepnotes/session` package split**
   - The package has 71 files mixing auth, users, groups, pages, billing, collab, and realtime. This violates the feature-based vertical-slice principle.
   - **Extract into dedicated packages before Phase 8:**
     - `@deepnotes/billing` — Stripe checkout, portal, webhook processing (`stripe-billing.ts`, `stripe-billing.test.ts`).
     - `@deepnotes/collab` — Page collab updates, collab crypto context, snapshots (`page-collab-updates.ts`, `group-collab-crypto-context.ts`).
     - `@deepnotes/realtime` — Hash ACL, notify-users (`realtime-hash-acl.ts`, `notify-users.ts`).
     - Keep `@deepnotes/session` for auth, login, refresh, register, 2FA, logout, demo, tokens only.
   - Add ESLint rule: `apps/api-worker` route files may import from ≤ 2 domain packages each.
   - Exit criteria: no extracted package exceeds 25 files; `@deepnotes/session` ≤ 20 files.

8. **Code health lint-and-refactor audit**
   - `pnpm lint` — 0 errors. ✅
   - `pnpm typecheck` — 0 errors. ✅
   - `pnpm test` — 0 failures, 0 skips (134 web + 48 session + 0 api-worker = 182). ✅
   - Check `apps/api-worker` bundle size (`wrangler build`) — alert if > 500KB.
   - Count files in `@deepnotes/session` — 71 files (no new files since last audit). ⚠️
   - No composable in `apps/web` exceeds 300 lines. ⚠️ — `useGroupMembersDetail.ts` (785), `usePageCollabEditor.ts` (431), `useSpatialPage.ts` (414) still exceed; refactor deferred to post-Phase 8.
   - No `console.log` in production DO code; replace with structured logger or remove. ✅

---

## Verification

- E2E smoke test: demo login → home → starting page → groups → logout.
  - `apps/web/e2e/smoke.spec.ts` covers demo login, home page, page editor load, groups list, and logout.
  - Full flow (register → create group → create page → invite member → member joins → both edit page → logout) requires group/page creation UI which is not yet implemented in the SPA.
- Playwright config updated to start both `api-worker` and `web` dev servers.
- Integration test: `scheduled-cleanup.integration.test.ts` verifies soft-deleted pages and groups are purged.

---

## Exit criteria

- [x] Scheduler implemented with Cron Trigger and integration test.
- [x] E2E smoke test covers demo login → home → page → groups → logout (full register → create group → invite → edit flow requires group/page creation UI, which is not in Phase 7 scope).
- [x] `TRPC_REST_MAP.md` route audit: every endpoint marked "implemented" has a registered Hono route in `apps/api-worker`.
- [x] Group password management UI (enable/change/disable) exists in `GroupDetailView.vue`.
- [ ] Realtime notification toast or badge surfaces in the app shell (not just the `/notifications` page).
- [x] Group password unlock is wired into the collab flow so users can enter a password when a protected group page is opened.
- [ ] `@deepnotes/session` split into `@deepnotes/billing`, `@deepnotes/collab`, `@deepnotes/realtime`; remaining `@deepnotes/session` ≤ 20 files.
- [ ] Component-level tests for `AccountView.vue` and `GroupDetailView.vue` pass.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass with 0 errors/failures.
- [ ] No composable in `apps/web` exceeds 300 lines; no `console.log` in DO production code.
