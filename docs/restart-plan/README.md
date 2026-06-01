# DeepNotes Restart Plan — Index

> **Last updated:** 2026-06-01 (Phase 6 **independent evaluation completed.** See `phase-6-spatial-polish.md` "Evaluation findings" section. 205 tests passing across 28 test files. Key findings: `note-geometry.ts` still hardcodes `80px` note height (affects box selection and container overlap); interregional arrows are schema-only; selection formatting integration missing. Phase 9 in progress.)  
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
- [x] **Collab pagination:** `GET /api/pages/:pageId/collab-updates` supports `?sinceIndex=` and returns ≤ 100 rows.
- [x] **Collab update squashing:** 50 rapid edits from a single client produce ≤ 2 `page_updates` rows.
- [x] **Collab auth revocation:** `PageCollabRoom` closes socket (code `1008`) when a user's session is invalidated mid-session.
- [x] **Collab broadcast backpressure:** `PageCollabRoom` chunks broadcast into batches of ≤ 10 sockets.
- [x] **Collab data migration:** `docs/COLLAB_DATA_MIGRATION.md` exists and explains legacy compatibility.
- [ ] **Postgres tests:** Integration tests use template DB clones. No test re-migrates from empty DB.
- [ ] **Auth + crypto:** 2FA enable/disable flow tested end-to-end. Password change invalidates all sessions.
- [x] **No banned tech:** No tRPC, no `superjson`, no RevenueCat, no key rotation code paths.
- [x] **Routing decision:** `docs/ROUTING_DECISION.md` exists and is signed off by product.
- [x] **Route middleware:** `apps/api-worker` uses Hono middleware for `sessionEnv`, `hyperdrive`, and `authCookie`.
- [x] **Spatial canvas (Phase 5):** User can create, move, resize, delete notes and arrows on an infinite canvas.
- [x] **Spatial polish (Phase 6):** ≥ 80% of `docs/SPATIAL_PARITY_CHECKLIST.md` rows marked done. (88% Done.)
- [x] **Schema completeness:** Phase 3 Yjs schema includes every field from the Phase 1 diff table.
- [x] **Backlinks:** SPA displays incoming page backlinks.
- [x] **Playwright:** E2E smoke test covers login → home → page → groups → logout.
- [x] **Package split:** `@deepnotes/session` split into `@deepnotes/session-core`, `@deepnotes/groups`, `@deepnotes/pages`, `@deepnotes/billing`, `@deepnotes/realtime`. Session package now has 8 files (down from 57).
- [x] **Marketing site:** `apps/marketing` has routable pages for `/`, `/pricing`, `/whitepaper`, `/help`, `/privacy-policy`, `/terms-of-service`. Build outputs 20 static HTML files (including 14 help article sub-routes). `pnpm lint`, `pnpm typecheck`, `pnpm build` pass with 0 errors. Dark/light theme toggle, restored legacy assets (logo, whitepaper diagrams, use-case thumbnails), and Shadcn `Switch`/`Input` components integrated.
- [ ] **Staging:** Hyperdrive + Postgres + Redis + WS proven in staging. Load test: 50 concurrent pages, p95 latency < 200 ms, row rate ≤ 20/page.
- [x] **Scheduler:** Cron Trigger wired to `performScheduledCleanup` with integration test.
- [x] **Rollback plan:** Documented and rehearsed. Feature flag for REST-only collab fallback exists.
- [ ] **Cutover:** 100 random legacy pages decrypt correctly. 24-hour canary error < 0.1%.
- [x] **Code health:** `pnpm lint`, `pnpm typecheck`, `pnpm test` pass with 0 errors/failures. No composable > 300 lines. No `console.log` in DO production code. `apps/api-worker` bundle ≤ 500KB.

---

## Current gaps (high-level)

### Phase 6 — Spatial canvas polish (**Complete**)

All major deliverables implemented and tested. 88% of `docs/SPATIAL_PARITY_CHECKLIST.md` rows are Done. Independent evaluation (see `phase-6-spatial-polish.md`) confirmed genuine parity with a cleaner architecture, but identified these gaps ordered by severity:

1. **`note-geometry.ts` hardcodes note height as `80px`** (`getNoteRect`). Affects box selection accuracy and container overlap detection. `DisplayNote.vue` publishes real heights via `useNoteHeights`, but `getNoteRect` ignores them. `useArrowDrag.ts` also hardcodes `sourceNote.pos.y + 40` for arrow drag origin. **Functional bug — should be fixed before cutover.**
2. **`fitToScreen` only uses `rootNoteList` bounds.** Legacy `PageCamera.fitToScreen()` considers selection first, then falls back to all page elements.
3. **Interregional arrows are schema-only.** `interregional`, `fakePos`, `looseEndpoint` fields exist in Yjs but `DisplayArrow.vue` does not render cross-region arrows with fake endpoints.
4. **Selection formatting integration is missing.** Legacy `PageSelection.format()` allowed applying bold/italic/etc across all selected note editors. No equivalent in new code.
5. **Color system is simplified.** Legacy had `light`/`highlight`/`base`/`final` color variants via `lightenByRatio`. New code uses flat 10-color map with `/18` opacity tint only.
6. **Active region tracking (5.6) and loading overlay polish (12.20)** remain partial/non-blocking.

### Phase 9 — Production Readiness (in progress)

Code-complete items:
- Observability docs (`docs/OBSERVABILITY.md`) and structured logging in all DO code.
- Rollback plan documented (`docs/COLLAB_DATA_MIGRATION.md`, `docs/ROUTING_DECISION.md`).
- No banned tech (tRPC, superjson, RevenueCat, key rotation).
- Code health: `pnpm lint`, `pnpm typecheck`, `pnpm test` pass with 0 errors. No composable > 300 lines.

Pending infrastructure/deployment:
- Staging load test: 50 concurrent pages, p95 WS latency < 200 ms, row rate ≤ 20/page.
- 100 random legacy pages decrypt correctly in new stack.
- 24-hour canary error rate < 0.1%.
- Old `/trpc` stack receives zero requests for 48 hours after cutover.

### Other gaps

- **Realtime notification toast** — only `/notifications` page exists, no badge/toast.
- **Auth: `rememberDevice` UI missing in login** — `LoginView.vue` has no "Remember this device" checkbox for 2FA login; users are re-prompted every time. API schema already supports it.
- **Spatial: hardcoded note heights in geometry** — `note-geometry.ts:getNoteRect` hardcodes `const h = 80;` and `useArrowDrag.ts` hardcodes `sourceNote.pos.y + 40`. These should read actual rendered heights from `useNoteHeights` before cutover. See `phase-6-spatial-polish.md` Evaluation findings.
- **Auth: no distributed locking** — Legacy used Redlock (`user-lock:${userId}`) around password change, email change, and 2FA mutations. New code relies on DB transactions only.

---

## Where to look

- **Legacy spatial reference:** [appendix-legacy-inventory.md](appendix-legacy-inventory.md)
- **Risk table:** [appendix-risks.md](appendix-risks.md)
- **Auth migration evaluation (TOTP, password change, email change):** [appendix-auth-migration-evaluation.md](appendix-auth-migration-evaluation.md)
- **Archived monolith:** `docs/RESTART_PLAN_v4.1_archive.md` (superseded by this directory)

---

*End of index*
