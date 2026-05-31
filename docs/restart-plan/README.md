# DeepNotes Restart Plan — Index

> **Last updated:** 2026-05-31 (Phase 8 complete; marketing site builds 20 static HTML routes with vue-router + vite-ssg, theme toggle, restored legacy assets)  
> **This document replaces `docs/RESTART_PLAN.md`.** If a prior statement conflicts with this one, this version wins.

---

## Phase status

| Phase | Title | Status | File |
|-------|-------|--------|------|
| 0 | Fix foundation — tests and dev loop | **Complete** | [phase-0-foundation.md](phase-0-foundation.md) |
| 1 | Legacy spatial inventory → concrete checklist | **Complete** | [phase-1-spatial-inventory.md](phase-1-spatial-inventory.md) |
| 2 | Backend REST + Drizzle parity | Verified | [phase-2-backend-parity.md](phase-2-backend-parity.md) |
| 3 | Collab wire parity — page-level Yjs doc | **Complete** | [phase-3-collab-wire.md](phase-3-collab-wire.md) |
| 4 | SPA foundation + feature slice routing | **Complete** | [phase-4-spa-routing.md](phase-4-spa-routing.md) |
| 5 | Spatial canvas MVP — notes + arrows + camera | **Complete** | [phase-5-spatial-mvp.md](phase-5-spatial-mvp.md) |
| 6 | Spatial canvas polish | **Complete** | [phase-6-spatial-polish.md](phase-6-spatial-polish.md) |
| 7 | Account, billing, groups polish | **Complete** | [phase-7-account-polish.md](phase-7-account-polish.md) |
| 8 | Marketing, Help, Pricing, and Legal Surfaces | **Complete** | [phase-8-marketing.md](phase-8-marketing.md) |
| 9 | Production Readiness and Cutover | Not started | [phase-9-production.md](phase-9-production.md) |

---

## What "restart" means

| Goal | Meaning in practice |
|------|---------------------|
| **New project** | `new-deepnotes` already exists. Do not create a third repo. |
| **Data compatible** | Postgres rows + encrypted blobs remain readable. Drizzle schema must support all legacy columns. |
| **No tRPC wire** | Client never calls `/trpc`. All HTTP via REST/OpenAPI. |
| **No key rotation** | `next_key_rotation_date` columns are inert. No scheduled re-encryption. |
| **No RevenueCat** | Stripe-only billing. |
| **Spatial parity** | A DeepNotes "page" is a canvas with notes, arrows, and containers. A single rich-text card is **not** parity. |
| **Testable** | Every phase has **automated tests that pass in CI** before the phase is declared done. |

---

## High-level success criteria

A criterion is **not met** until the verification command or check passes in CI.

- [x] **Test foundation:** `pnpm test` from `new-deepnotes/` root passes with 0 failures.
- [ ] **Composable size:** No SPA composable > 300 lines.
- [ ] **Collab ACK correctness:** `serverStateVector` advances only with acknowledged diffs.
- [ ] **Collab Yjs listener:** `ydoc.on('updateV2')` triggers push schedule for non-Tiptap mutations.
- [ ] **OpenAPI:** `GET /api/openapi.json` returns a valid OpenAPI 3 document.
- [ ] **Drizzle:** `drizzle-kit migrate` applies cleanly from empty DB to current schema.
- [ ] **Backend parity:** Every row in `docs/TRPC_REST_MAP.md` marked "implemented" has a passing automated test.
- [ ] **Collab:** `PageCollabRoom` integration test: two clients sync note creation via WS within 2 seconds.
- [ ] **Collab pagination:** `GET /api/pages/:pageId/collab-updates` supports `?sinceIndex=` and returns ≤ 100 rows.
- [ ] **Collab update squashing:** 50 rapid edits from a single client produce ≤ 2 `page_updates` rows.
- [ ] **Collab auth revocation:** `PageCollabRoom` closes socket (code `1008`) when a user's session is invalidated mid-session.
- [ ] **Collab broadcast backpressure:** `PageCollabRoom` chunks broadcast into batches of ≤ 10 sockets.
- [ ] **Collab data migration:** `docs/COLLAB_DATA_MIGRATION.md` exists and explains legacy compatibility.
- [ ] **Postgres tests:** Integration tests use template DB clones. No test re-migrates from empty DB.
- [ ] **Auth + crypto:** 2FA enable/disable flow tested end-to-end. Password change invalidates all sessions.
- [ ] **No banned tech:** No tRPC, no `superjson`, no RevenueCat, no key rotation code paths.
- [ ] **Routing decision:** `docs/ROUTING_DECISION.md` exists and is signed off by product.
- [ ] **Route middleware:** `apps/api-worker` uses Hono middleware for `sessionEnv`, `hyperdrive`, and `authCookie`.
- [ ] **Spatial canvas (Phase 5):** User can create, move, resize, delete notes and arrows on an infinite canvas.
- [ ] **Spatial polish (Phase 6):** ≥ 80% of `docs/SPATIAL_PARITY_CHECKLIST.md` rows marked done.
- [ ] **Schema completeness:** Phase 3 Yjs schema includes every field from the Phase 1 diff table.
- [x] **Backlinks:** SPA displays incoming page backlinks.
- [x] **Playwright:** E2E smoke test covers demo login → home → page → groups → logout.
- [x] **Package split:** `@deepnotes/session` split into `@deepnotes/session-core`, `@deepnotes/groups`, `@deepnotes/pages`, `@deepnotes/billing`, `@deepnotes/realtime`. Session package now has 8 files (down from 57).
- [x] **Marketing site:** `apps/marketing` has routable pages for `/`, `/pricing`, `/whitepaper`, `/help`, `/privacy-policy`, `/terms-of-service`. Build outputs 20 static HTML files (including 14 help article sub-routes). `pnpm lint`, `pnpm typecheck`, `pnpm build` pass with 0 errors. Dark/light theme toggle, restored legacy assets (logo, whitepaper diagrams, use-case thumbnails), and Shadcn `Switch`/`Input` components integrated.
- [ ] **Staging:** Hyperdrive + Postgres + Redis + WS proven in staging. Load test: 50 concurrent pages, p95 latency < 200 ms, row rate ≤ 20/page.
- [x] **Scheduler:** Cron Trigger wired to `performScheduledCleanup` with integration test.
- [ ] **Rollback plan:** Documented and rehearsed. Feature flag for REST-only collab fallback exists.
- [ ] **Cutover:** 100 random legacy pages decrypt correctly. 24-hour canary error < 0.1%.
- [ ] **Code health:** `pnpm lint`, `pnpm typecheck`, `pnpm test` pass with 0 errors/failures. No composable > 300 lines. No `console.log` in DO production code. `apps/api-worker` bundle ≤ 500KB.

---

## Current gaps (high-level)

- **Realtime notification toast** — only `/notifications` page exists, no badge/toast.
- **Composable size** — `useGroupMembersDetail.ts` (103 lines) and `usePageCollabEditor.ts` (238 lines) are now under the 300-line limit. `useSpatialPage.ts` (308 lines) still exceeds by a small margin.
- **Auth: `rememberDevice` UI missing in login** — `LoginView.vue` has no "Remember this device" checkbox for 2FA login; users are re-prompted every time. API schema already supports it.
- **Auth: no distributed locking** — Legacy used Redlock (`user-lock:${userId}`) around password change, email change, and 2FA mutations. New code relies on DB transactions only.

---

## Where to look

- **Legacy spatial reference:** [appendix-legacy-inventory.md](appendix-legacy-inventory.md)
- **Risk table:** [appendix-risks.md](appendix-risks.md)
- **Auth migration evaluation (TOTP, password change, email change):** [appendix-auth-migration-evaluation.md](appendix-auth-migration-evaluation.md)
- **Archived monolith:** `docs/RESTART_PLAN_v4.1_archive.md` (superseded by this directory)

---

*End of index*
