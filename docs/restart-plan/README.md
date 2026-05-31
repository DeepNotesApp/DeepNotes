# DeepNotes Restart Plan — Index

> **Last updated:** 2026-05-31 (Phase 6 in progress. Core spatial mechanics done: selection, clipboard, alignment, undo/redo, viewport, containers, state screens. Sidebar data stubbed, arrow labels are raw `<input>` stubs, `SPATIAL_PARITY_CHECKLIST.md` missing. Phase 9 pending.)  
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
| 6 | Spatial canvas polish | **In progress** | [phase-6-spatial-polish.md](phase-6-spatial-polish.md) |
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
- [ ] **Spatial polish (Phase 6):** ≥ 80% of `docs/SPATIAL_PARITY_CHECKLIST.md` rows marked done. (Checklist file itself is missing.)
- [ ] **Schema completeness:** Phase 3 Yjs schema includes every field from the Phase 1 diff table.
- [x] **Backlinks:** SPA displays incoming page backlinks.
- [x] **Playwright:** E2E smoke test covers login → home → page → groups → logout.
- [x] **Package split:** `@deepnotes/session` split into `@deepnotes/session-core`, `@deepnotes/groups`, `@deepnotes/pages`, `@deepnotes/billing`, `@deepnotes/realtime`. Session package now has 8 files (down from 57).
- [x] **Marketing site:** `apps/marketing` has routable pages for `/`, `/pricing`, `/whitepaper`, `/help`, `/privacy-policy`, `/terms-of-service`. Build outputs 20 static HTML files (including 14 help article sub-routes). `pnpm lint`, `pnpm typecheck`, `pnpm build` pass with 0 errors. Dark/light theme toggle, restored legacy assets (logo, whitepaper diagrams, use-case thumbnails), and Shadcn `Switch`/`Input` components integrated.
- [ ] **Staging:** Hyperdrive + Postgres + Redis + WS proven in staging. Load test: 50 concurrent pages, p95 latency < 200 ms, row rate ≤ 20/page.
- [x] **Scheduler:** Cron Trigger wired to `performScheduledCleanup` with integration test.
- [ ] **Rollback plan:** Documented and rehearsed. Feature flag for REST-only collab fallback exists.
- [ ] **Cutover:** 100 random legacy pages decrypt correctly. 24-hour canary error < 0.1%.
- [ ] **Code health:** `pnpm lint`, `pnpm typecheck`, `pnpm test` pass with 0 errors/failures. No composable > 300 lines. No `console.log` in DO production code. `apps/api-worker` bundle ≤ 500KB.

---

## Current gaps (high-level)

### Phase 6 — Spatial canvas polish (in progress)

- **`docs/SPATIAL_PARITY_CHECKLIST.md` created.** 82 rows covering notes, arrows, camera, selection, clipboard, editing, collab, templates, UI, backlinks, group access. Schema diff table complete.
- **Left sidebar panels now load real data.** `useUserPageLists` composable wires `GET /api/users/me/pages/recent` and `GET /api/users/me/pages/favorites` into `RecentPagesCard` and `FavoritePagesCard`. Clear handlers call API-backed `clearRecent`/`clearFavorites`.
- **Right sidebar properties panels exist but lack depth.** `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `PagePropertiesCard.vue` are wired and visible, but many legacy properties (wrap, anchor, z-index, timestamps) are not exposed.
- **`MainToolbar.vue` extracted as standalone component.** `PageLayout.vue` now delegates to `MainToolbar.vue` for the header shell. Still missing: page action buttons (insert note/arrow, alignment, formatting), zoom controls other than reset, fit-to-screen, screenshot.
- **Arrow labels fixed.** `DisplayArrow.vue` now uses `NoteTiptapEditor` on `Y.XmlFragment` instead of raw `<input>`. Proper collaborative rich-text editing.
- **Arrow geometry now reads actual note heights.** `DisplayNote.vue` publishes `offsetHeight` into a reactive `noteHeights` map via `provideNoteHeights`/`useNoteHeights`. `DisplayArrow.vue` reads heights from the map instead of hardcoding `80px`.
- **Note drag `Teleport` overlay fixed.** Overlay now applies `scale(zoom)` and uses `posOverride` so the preview tracks the cursor correctly at all zoom levels.
- **Page state screens exist but 4 states are indistinguishable.** `page-deleted`, `group-deleted`, `invited`, `rejected` all map to the same generic error UI because the API does not return distinct error codes.
- **Context menu exists for canvas but not for individual notes.** `CanvasContextMenu.vue` (right-click on empty canvas) is implemented. No per-note context menu exists.

### Other gaps

- **Realtime notification toast** — only `/notifications` page exists, no badge/toast.
- **Composable size** — `useGroupMembersDetail.ts` (103 lines), `usePageCollabEditor.ts` (238 lines), and `useSpatialPage.ts` (195 lines) are all under the 300-line limit. Container logic extracted to `container-ops.ts`.
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
