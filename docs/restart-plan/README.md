# DeepNotes Restart Plan — Index

> **Last updated:** 2026-05-31 (Phase 6 in progress. **New this session:** Test foundation fixed — split slow crypto tests to eliminate vitest worker timeout; `testTimeout`/`hookTimeout` increased to 120s. `NotePropertiesCard.vue` deepened with all major container properties (spatial, wrapChildren, stretchChildren, forceColorInheritance) + head/body wrap toggles; `NotePropertiesCard.test.ts` (5 tests). `ArrowPropertiesCard.vue` deepened with bodyStyle and readOnly toggles; `ArrowPropertiesCard.test.ts` (6 tests). `SpatialPageView.vue` added back/forward nav buttons; `SpatialPageView.test.ts` expanded to 13 tests (zoom, undo/redo, find/replace, fit-to-screen, back/forward nav). Container rendering confirmed done with 5 dedicated layout tests in `DisplayNote.test.ts`. See `phase-6-spatial-polish.md` and `SPATIAL_PARITY_CHECKLIST.md` for details. Phase 9 pending.)  
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
| 6 | Spatial canvas polish | **In Progress** | [phase-6-spatial-polish.md](phase-6-spatial-polish.md) |
| 7 | Account, billing, groups polish | **Complete** | [phase-7-account-polish.md](phase-7-account-polish.md) |
| 8 | Marketing, Help, Pricing, and Legal Surfaces | **Complete** | [phase-8-marketing.md](phase-8-marketing.md) |
| 9 | Production Readiness and Cutover | In progress | [phase-9-production.md](phase-9-production.md) |

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

- **`docs/SPATIAL_PARITY_CHECKLIST.md` created.** 82+ rows. Schema diff table complete. **Test coverage improved this session:** `NotePropertiesCard.test.ts` (5), `ArrowPropertiesCard.test.ts` (6), `SpatialPageView.test.ts` (13), `PageToolbarActions.test.ts` (7), `MainToolbar.test.ts` (8), `PageLayout.test.ts` (10), `RecentPagesCard.test.ts` (5), `FavoritePagesCard.test.ts` (5), `SelectedPagesCard.test.ts` (5), `useNoteContextMenu.test.ts` (5), `useCanvasActions.test.ts` (5), `DisplayNote.test.ts` (26), `DisplayArrow.test.ts` (12), `useCanvasContextMenu.test.ts` (6), `note-geometry.test.ts` (10), `useBoxSelection.test.ts` (6), `arrow-geometry.test.ts` (5), `useSpatialEditing.test.ts` (4), `selection.test.ts` (12). Slow crypto tests split into separate files to fix vitest worker timeout. Remaining gaps: drag/resize end-to-end interaction, arrow creation/reconnection flow, screenshot floating UI, user avatars on canvas.
- **Left sidebar panels now load real data.** `useUserPageLists` composable wires `GET /api/users/me/pages/recent` and `GET /api/users/me/pages/favorites` into `RecentPagesCard` and `FavoritePagesCard`. Clear handlers call API-backed `clearRecent`/`clearFavorites`.
- **Right sidebar properties panels significantly improved.** `NotePropertiesCard.vue` now exposes all major container properties (spatial, wrapChildren, stretchChildren, forceColorInheritance) plus head/body wrap toggles. `ArrowPropertiesCard.vue` now exposes bodyStyle (solid/dashed/dotted) and readOnly toggle. `PagePropertiesCard.vue` remains basic. All wired through `PageEditorView.vue`.
- **`MainToolbar.vue` extracted as standalone component.** `PageLayout.vue` now delegates to `MainToolbar.vue` for the header shell. `PageToolbarActions.vue` provides insert note, insert arrow, zoom in/out, and fit-to-screen buttons. Still missing: alignment/formatting buttons, screenshot.
- **Arrow labels fixed.** `DisplayArrow.vue` now uses `NoteTiptapEditor` on `Y.XmlFragment` instead of raw `<input>`. Proper collaborative rich-text editing.
- **Arrow geometry and fitToScreen now read actual note heights.** `DisplayNote.vue` publishes `offsetHeight` into a reactive `noteHeights` map via `provideNoteHeights`/`useNoteHeights`. `DisplayArrow.vue` and `useCanvasActions.ts:fitToScreen` read heights from the map instead of hardcoding `80px`.
- **Note drag `Teleport` overlay fixed.** Overlay now applies `scale(zoom)` and uses `posOverride` so the preview tracks the cursor correctly at all zoom levels.
- **Page state screens exist but 4 states are indistinguishable.** `page-deleted`, `group-deleted`, `invited`, `rejected` all map to the same generic error UI because the API does not return distinct error codes.
- **Per-note context menu implemented.** `NoteContextMenu.vue` + `useNoteContextMenu.ts` composable wired into `DisplayNote.vue` and `SpatialPageView.vue`. Bring-to-front, send-to-back, delete actions wired. `useNoteContextMenu.test.ts` (5 tests) covers the composable.
- **Arrow geometry partially fixed.** `DisplayArrow.vue` now uses rectangle-edge intersection for `bodyType === 'line'` via `arrow-geometry.ts`. Interregional coordinate transforms and `fakePos`/`looseEndpoint` rendering remain missing.
- **No `PageElem` abstraction.** Legacy notes and arrows inherit from `PageElem`, sharing selected/active/editing/visible/region state. New code treats them as completely separate types.
- **`editing` state management implemented.** `useSpatialEditing.ts` tracks which note/arrow is being edited. Escape stops editing; canvas click stops editing; Delete/Backspace is suppressed while editing to avoid deleting selected elements.
- **Container rendering fully implemented.** `DisplayNote.vue` enforces spatial vs non-spatial layout, `stretchChildren`, and `wrapChildren`. `DisplayNote.test.ts` includes 5 dedicated container layout tests.
- **`SpatialPageView.vue` refactored.** Keyboard shortcuts extracted to `useSpatialKeyboard.ts`. Box selection, arrow drag, arrow reconnect, and note drag extracted to dedicated composables. Note geometry utilities extracted to `note-geometry.ts`. Canvas actions (double-click, fit-to-screen) extracted to `useCanvasActions.ts`. Context menu handlers extracted to `useCanvasContextMenu.ts`. Component reduced from ~740 lines to ~260 lines.
- **Selection partially improved.** `bringToTop` zIndex bump on selection is now implemented and tested. Formatting integration across selected editors, active element/region keyboard navigation, and `selectAll` including descendant arrows remain missing.
- **Floating UI partially improved.** Back/forward nav buttons added to `SpatialPageView.vue`. Still missing: screenshot, user avatars on canvas.

### Other gaps

- **Realtime notification toast** — only `/notifications` page exists, no badge/toast.
- **Composable size** — `useGroupMembersDetail.ts` (103 lines), `usePageCollabEditor.ts` (238 lines), and `useSpatialPage.ts` (195 lines) are all under the 300-line limit. Container logic extracted to `container-ops.ts`. `SpatialPageView.vue` script section reduced from ~740 lines to ~260 lines after extracting keyboard, box selection, arrow drag, arrow reconnect, note drag, note geometry, canvas actions, and context menu handlers into dedicated composables.
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
