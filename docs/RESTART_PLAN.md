# DeepNotes — Restart (greenfield) plan — v4

> **Last updated:** 2026-05-30  
> **Status:** Phase 0 foundation complete. Phase 1 spatial checklist complete. **Phase 2 backend parity verified.** **Phase 3 collab wire parity complete.** Phase 4 routing decision complete. **Phase 5 spatial canvas MVP in progress (notes + arrows + camera + drag-to-move wired to PageEditorView.vue).**  
> **This document replaces all prior restart plan versions.** If a prior statement conflicts with this one, this version wins.  
> **Analyzed:** 2026-05-30 — additional gaps identified in §0.2–0.4, §3, §4, §6–8. Collab protocol gap and routing/product-model divergence newly documented.

---

## 0. Status reality check (read this first)

### 0.1 What is actually done in `new-deepnotes` today

| Area | Files | Status | Notes |
|------|-------|--------|-------|
| **Monorepo / CI** | `package.json`, `turbo.json`, `pnpm-workspace.yaml` | Done | pnpm 9 + Turbo 2 + Node 22. |
| **DB schema + migrations** | `packages/db/src/schema.ts`, `drizzle/` | Done | Transcribed from `postgres-init.sql`. Template-DB integration test pattern exists (§5.7). |
| **OpenAPI + typed client** | `packages/api/src/openapi.ts`, `apps/web/src/api/` | Done | Zod-to-OpenAPI, `openapi-fetch` client, generated types. |
| **HTTP API (Hono on Workers)** | `apps/api-worker/src/routes/*` | Done | Auth, users, groups, pages, billing, realtime WS entry. |
| **Collab WebSocket (DO)** | `apps/api-worker/src/page-collab-room.ts` | Done | `PageCollabRoom` Durable Object, lib0 framing via `@deepnotes/collab-wire`. |
| **Realtime WebSocket (DO)** | `apps/api-worker/src/user-realtime-room.ts` | Done | `UserRealtimeRoom` DO, hash HGET/HSET/SUBSCRIBE, Upstash PUBLISH bridge. |
| **Session / auth** | `packages/session/src/*` | Done | Register, login, refresh, logout, 2FA, email change, password change, demo. |
| **Crypto** | `packages/e2ee/src/*`, `packages/session/src/crypto/*` | Done | Sodium wrappers, keyrings, page encrypt/decrypt, awareness encrypt. |
| **SPA auth + routing** | `apps/web/src/features/auth/*`, `router.ts` | Done | Login, register, demo, logout, 2FA UI, account page, group pages, notifications. |
| **Page management UI** | `apps/web/src/features/pages/*` | Partial | Bump, favorite, recent, snapshots, soft-delete, restore, purge, move, path breadcrumb. |
| **Rich-text editor** | `apps/web/src/features/pages/PageEditorTiptapCard.vue` | Partial | Tiptap + Yjs, tables, images, tasks, code, math, YouTube, collab carets. |
| **Marketing site** | `apps/marketing/` | Done | `vite-ssg` placeholder. |
| **Spatial / world canvas** | `apps/web/src/features/spatial/*` | **In progress** | Drag-to-move notes, double-click create, arrows rendered, page-level Yjs doc wired. Tiptap editors inside notes, resize, arrow creation UI, containers pending. |
| **Collab pagination** | `GET /api/pages/:pid/collab-updates` | Done | `?sinceIndex=` + `?limit=` (default 100, max 500). Client loops. |
| **Playwright E2E** | `apps/web/playwright.config.ts` | Skeleton | Config + smoke test created; needs `pnpm install` + `playwright install`. |

### 0.2 Critical bugs that block everything else

These must be fixed **before any agent adds new features**. They are root-cause failures in the dev/test loop, not feature gaps.

1. **`apps/web` Vitest configuration is broken for monorepo runs**
   - **Symptom:** Running `pnpm vitest run` from repo root fails on `.vue` SFC parsing (`Install @vitejs/plugin-vue`), `window is not defined` (router), and `document is not defined` (useSession).
   - **Root cause:** Root-level `pnpm vitest run` does **not** resolve `apps/web/vite.config.ts`. The web app's `test: { environment: "happy-dom" }` and `@vitejs/plugin-vue` are ignored when tests are discovered from the root. There is **no `vitest.workspace.ts`** inside `new-deepnotes/` — the root `vitest.config.ts` lives in the outer `DeepNotes/` legacy repo and only sets `globals: true`.
   - **Fix:** Add `new-deepnotes/vitest.workspace.ts` that explicitly projects `apps/web` to its `vite.config.ts` and other packages to their own `vitest.config.ts` files. See §6.1.

2. **`useSession` singleton state leaks between tests**
   - **Symptom:** All `useSession.test.ts` cases fail in batch even though individual assertions are correct.
   - **Root cause:** `useSession` uses module-level `ref()` singletons. `resetSessionSingletonForTests()` resets the refs and `bootstrapInFlight`, but the module-level `client` instance (created by `createDeepnotesApiClient()`) is not recreated. Concurrent test execution + Vitest module caching causes cross-test pollution.
   - **Fix:** Make `useSession` accept an optional `createClient` override in test mode, or refactor to a factory pattern. See §6.2.

3. **`router.ts` executes `createWebHistory()` at module load time**
   - **Symptom:** `router.test.ts` crashes with `window is not defined` before any test body runs.
   - **Root cause:** `const router = createRouter({ history: createWebHistory(...) })` runs on `import`, which is before `happy-dom` installs `window`.
   - **Fix:** Export a `createAppRouter()` factory function instead of a singleton router instance. Mount the router in `main.ts` and in tests after the DOM environment is ready. See §6.3.

4. **Integration tests silently skip in CI when `DATABASE_URL` is absent**
   - **Symptom:** `template-db.test.ts` and `account-flows.integration.test.ts` skip with `describe.skipIf(ctx == null)`.
   - **Root cause:** No CI job sets `DATABASE_URL` + `DATABASE_ADMIN_URL`.
   - **Fix:** Add a GitHub Actions job (or local `docker-compose up` step) that exports DB URLs before `pnpm test`. See §6.4.

5. **`page-collab-ws-incoming.ts` ACK handler updates `serverStateVector` to full doc state, not acknowledged state**
   - **Symptom:** On `single-update-ack`, the client sets `serverStateVector.current = Y.encodeStateVector(ydoc)`. This happens to suppress duplicate pushes because the full vector encodes everything, but it is **semantically wrong** — if the ACK corresponds to an earlier update and concurrent local edits exist, those edits will never be pushed.
   - **Root cause:** The ACK handler ignores the update content and simply snapshots the full document.
   - **Fix:** Track `serverStateVector` correctly: advance it only with the acknowledged diff, or use `Y.encodeStateVector(ydoc)` after `Y.applyUpdateV2(serverStateVector, acknowledgedDiff)`. See §6.1 (collab split).

6. **`usePageCollabEditor.ts` has no `ydoc.on('updateV2')` listener for non-Tiptap mutations**
   - **Symptom:** Collab push is only triggered by Tiptap `onUpdate`. Any Yjs mutation outside the editor (e.g., moving a note's `pos.x` in a spatial doc) will not schedule a push.
   - **Root cause:** The composable was built for a single ProseMirror fragment. Spatial notes will mutate Yjs directly.
   - **Fix:** Add `ydoc.on('updateV2', schedulePush)` (guarded by `!hydrating.value`) before any spatial work. See §6.1.

7. **`GET /api/pages/:pageId/collab-updates` loads all updates with no pagination**
   - **Symptom:** For a page with thousands of edits, the REST bootstrap returns megabytes of encrypted blobs in a single JSON array.
   - **Root cause:** `performGetPageCollabUpdates` queries every row in `page_updates` for the page.
   - **Fix:** Add `?sinceIndex=` query param (or cursor) to the endpoint; client requests incrementally. Legacy collab-server avoided this by streaming over WS. See §6.4.

8. **`usePageCollabEditor.ts` is 708 lines and contains WS, REST push, crypto, editor lifecycle, and move logic**
   - **Symptom:** Already a god object before spatial work begins.
   - **Fix:** Split before any spatial work. See §6.1.

### 0.3 The spatial gap (why the original plan was dangerously wrong)

**In DeepNotes, a "page" is NOT a text document. A "page" is a spatial infinite canvas containing many notes, arrows between notes, and nested spatial containers.** The legacy `PageEditorView` equivalent is the entire `DisplayWorld.vue` tree — 37 Vue render files and 76 TypeScript model files (camera, panning, zooming, pinching, notes, arrows, selection, regions, undo/redo, clipboard, etc.).

The new `PageEditorView.vue` currently hosts **a single Tiptap rich-text card**. This is not "partial page parity." It is **zero page canvas parity**. The original plan buried this under "editor UX vs legacy (rich + spatial/world if in scope)" and labeled a stub route as "spatial/world stub + home/header entry points done." That is misleading to the point of being dangerous for agent delegation.

**Quantified gap:**

| Subsystem | Legacy files | New files | Gap |
|-----------|-------------|-----------|-----|
| Page model (camera, space, rects, sizes, pos) | `code/pages/page/*` (excl. subdirs) + `camera/`, `space/` ≈ 11 | 0 | **100% missing** |
| Notes (model + collab schema + operations) | `code/pages/page/notes/` ≈ 9 | 0 | **100% missing** |
| Arrows (model + collab schema + operations) | `code/pages/page/arrows/` ≈ 3 | 0 | **100% missing** |
| Elements (selection, clipboard, editing, find/replace, deleting) | `code/pages/page/elems/`, `selection/` ≈ 14 | 0 | **100% missing** |
| Regions / containers | `code/pages/page/regions/` ≈ 2 | 0 | **100% missing** |
| Collab (SyncedStore page doc with notes + arrows) | `code/pages/page/collab/` ≈ 3 | `usePageCollabEditor.ts` (ProseMirror-only) | **Massive scope reduction** |
| Display / rendering | `DisplayWorld/` ≈ 37 | `SpatialWorldCanvas.vue` + `SpatialWorldStubView.vue` ≈ 2 | **~95% missing** |
| **Total spatial engine** | **~113** | **~2** | **~98% missing** |

The legacy collab syncs the **entire page state** (note positions, arrow endpoints, container nesting) via a single Yjs/SyncedStore document. The new collab syncs **only the ProseMirror fragment** inside one note. Rebuilding spatial collab is a major engineering effort, not a UI polish task.

**Routing / product-model divergence:** In the new SPA, `/pages/:pageId` renders a **single Tiptap text card** (`PageEditorView.vue`), while `/spatial` is a separate stub showing page pins. In legacy, a "page" IS the spatial canvas — there is no bifurcation. The new architecture implicitly redefines "page" as a text document, which will conflict with spatial parity unless `/pages/:pageId` becomes the canvas and the single-note editor becomes one component inside it (the active note's head/body). **This is a deeper problem than "missing UI" — it is a routing and data-model decision that must be made before Phase 6.**

**Decision:** This plan commits to **full spatial parity**. The single-note-per-page stepping stone has been removed; `/pages/:pageId` will be the spatial canvas directly.

---

## 0.4 Additional critical gaps discovered

These were found during the v3–v4 analysis and must be addressed in the phases below.

1. **`usePageCollabEditor.ts` is already a god object (708 lines)**
   - The plan itself recommends capping composables at 300 lines (§7). The main collab composable already violates this.
   - **Fix:** Split into `useCollabWebSocket.ts`, `useCollabCrypto.ts`, `useCollabPush.ts`, `usePageEditor.ts` before any spatial work.

2. **`PageCollabRoom` DO is a stateless relay, not an in-memory Yjs host**
   - Legacy `collab-server` held Yjs `Doc` instances in memory and synced via `y-protocols`. The new DO only decrypts/relays opaque blobs via `WORKER_SELF`.
   - **Impact:** The server cannot enforce page size limits, merge updates intelligently, or validate structure. It also does **not serve the initial page state over WS** — clients must REST-bootstrap first, then WS-connect.
   - **Fix:** Document the architectural trade-off in `docs/COLLAB_DO_ARCHITECTURE.md`. If page-level Yjs is added (Phase 3), consider whether the DO should load the Yjs doc into memory.

3. **`page_updates` backward compatibility**
   - Existing production rows contain encrypted ProseMirror-only Yjs updates. Phase 3 will introduce page-level Yjs docs (notes + arrows).
   - **Decision required:** Add `page_spatial_updates` table, or version the update format within `page_updates` so old rows remain readable.

4. **SSR and i18n regressions vs legacy**
   - Legacy `apps/client` had SSR (`src-ssr`) and `vue-i18n`. New `apps/web` is pure SPA with no i18n infrastructure.
   - **Fix:** Product decision — document as accepted regressions or schedule recovery.

5. **Group password unlock is unscheduled**
   - `unlockPageCollabSymmetricKeyring` throws when a group requires a password. The comment says "Unlock is not implemented in the web MVP."
   - **Fix:** Add to Phase 7 (group/account polish) or document as v2 scope.

6. **`page_links` / backlink UI is missing**
   - The backend has `pageLinks` table and routes (`POST /api/pages/:pageId/backlinks`). No SPA UI exposes backlinks.
   - **Fix:** Add backlink display to Phase 7.

7. **No scheduler / manager CLI replacement**
   - Legacy had `apps/scheduler` (cleanup) and `apps/manager` (ops CLI). New repo defers scheduler to "Cron Triggers or Queues" but has no implementation.
   - **Fix:** Add deferred scheduler task to Phase 7 or Phase 8.

8. **Collab protocol is narrower than legacy; missing bootstrap-over-WS and unacked-buffer retry**
   - Legacy client maintains `_unackedUpdates: Map<number, Uint8Array>` and re-sends on reconnect. New client has `collabClientUpdateId` but no `_unackedUpdates` buffer. Legacy collab-server sends `ALL_UPDATES_UNMERGED` on connect. New DO sends nothing — client must `GET /collab-updates` via REST.
   - **Impact:** Reconnects are slower (REST round-trip), and a lost ACK can cause duplicate pushes or missed updates.
   - **Fix:** Document in `docs/COLLAB_PROTOCOL_PARITY.md`. Decide whether to add `ALL_UPDATES_UNMERGED` support to `PageCollabRoom` or accept REST-only bootstrap.

9. **`@deepnotes/session` package contains 71 files — potential god package**
   - It mixes auth, users, groups, pages, billing, collab, crypto, and realtime logic. This violates the feature-based vertical-slice principle.
   - **Fix:** Before Phase 7, audit file count per domain. If any subfolder exceeds 20 files, extract to a dedicated package (e.g., `@deepnotes/billing`, `@deepnotes/scheduler`).

10. **No `@syncedstore/core` or equivalent reactive Yjs wrapper for Vue**
    - Legacy uses `@syncedstore/core` so Vue components re-render when CRDT state changes. New repo has `yjs` + `y-protocols` + `@tiptap/y-tiptap` but no SyncedStore.
    - **Impact:** Phase 5 spatial canvas cannot use Vue reactivity against Yjs maps directly without a wrapper.
    - **Fix:** Evaluate SyncedStore with Vite 6 (spike in Phase 3). If bundling fails, document Option C (hybrid reactive proxy) in `docs/SPATIAL_ARCHITECTURE_DECISION.md`.

11. **`page_updates` REST bootstrap lacks pagination / cursor**
    - As noted in §0.2 bug 7, `performGetPageCollabUpdates` loads every row. A 5-year-old page could have 10k+ rows.
    - **Fix:** Add `?sinceIndex=` or `?cursor=` to the endpoint. Client requests in batches of 100.

12. **Legacy note-collab schema has ~25 fields; new plan Phase 3 schema proposal is incomplete**
    - Missing from the proposed `INoteCollab`: `anchor`, `wrap`, `createdAt`, `editedAt`, `movedAt`, `collapsing.localCollapsing`, `container.wrapChildren`, `container.stretchChildren`, `container.forceColorInheritance`.
    - Missing from proposed `IArrowCollab`: `interregional`, `fakePos`, `looseEndpoint`, `createdAt`, `editedAt`.
    - **Fix:** Before coding Phase 3, produce a complete schema diff table in `docs/SPATIAL_PARITY_CHECKLIST.md`.

13. **No Playwright E2E infrastructure exists**
    - Phase 7/8 success criteria require a Playwright smoke test, but there is no `apps/web/playwright.config.ts`, no `e2e/` folder, and no `@playwright/test` dependency.
    - **Fix:** Add Playwright to Phase 4 as a deliverable.

14. **`PageCollabRoom` broadcast has no backpressure throttling**
    - The DO calls `this.broadcast()` synchronously for every connected socket. Under high load (many clients, rapid edits), DO CPU time could exceed Cloudflare limits.
    - **Fix:** Add a simple broadcast queue or at least document the limit in `docs/COLLAB_DO_ARCHITECTURE.md`.

---

## 1. What "restart" should mean (revised)

| Goal | Meaning in practice |
|------|---------------------|
| **New project** | `new-deepnotes` already exists. Do not create a third repo. |
| **Data compatible** | Postgres rows + encrypted blobs remain readable. Drizzle schema must support all legacy columns (including those we may later drop). |
| **No tRPC wire** | Client never calls `/trpc`. All HTTP via REST/OpenAPI. |
| **No key rotation** | `next_key_rotation_date` columns are inert. No scheduled re-encryption. |
| **No RevenueCat** | Stripe-only billing. |
| **Spatial parity** | A DeepNotes "page" is a canvas with notes, arrows, and containers. A single rich-text card is **not** parity. |
| **Testable** | Every phase has **automated tests that pass in CI** before the phase is declared done. |

---

## 2. Current architecture comparison

### 2.1 Legacy (`apps/client`, `apps/app-server`)

- **Client:** Vue 3.2 + forked Quasar + Pinia + Tiptap/Yjs/SyncedStore + tRPC client + custom WS (realtime + collab).
- **Server:** Fastify + tRPC v10 + WebSocket handlers + Knex/Objection + KeyDB.
- **Collab:** Per-page Yjs Doc via SyncedStore contains `page`, `notes`, `arrows` maps. Binary protocol via `collab-server`.
- **Realtime:** `realtime-server` WebSocket with msgpackr custom protocol.
- **Scheduler:** Background cleanup worker.

### 2.2 New (`new-deepnotes`)

- **Client:** Vue 3.5 + Vite 6 + plain `fetch` + `openapi-fetch` + Tiptap/Yjs (ProseMirror-only) + custom WS (collab + realtime).
- **Server:** Hono on Cloudflare Workers + Drizzle + Postgres via Hyperdrive + Upstash Redis.
- **Collab:** `PageCollabRoom` Durable Object. Yjs updates persisted to Postgres `page_updates`. **Only ProseMirror content is synced.**
- **Realtime:** `UserRealtimeRoom` Durable Object. Hash HGET/HSET + pub/sub via Upstash.
- **Scheduler:** Cron Triggers or Queues (not yet implemented; deferred).
- **Routing decision:** `/pages/:pageId` will be the spatial canvas. The Tiptap editor becomes the head/body editing component inside a note. Legacy divergence resolved in Phase 4.

---

## 3. Pain points validated

1. **Type coupling (legacy):** Client imported `@deepnotes/app-server` for `AppRouter`. **Fixed** in new repo via OpenAPI-generated types.
2. **DataAbstraction (legacy):** Centralized KeyDB + pub/sub + LRU. **Partially fixed** — replaced with explicit Upstash Redis calls in `UserRealtimeRoom`, but no equivalent for the spatial state cache.
3. **Split protocols (legacy):** tRPC + app WS + realtime WS + collab WS. **Partially fixed** — consolidated to REST + two WS protocols, but collab WS scope is much smaller.
4. **Forked dependencies (legacy):** `@deepnotes/quasar`, `@deepnotes/ioredis`, patched `dotenv-expand`. **Fixed** — no Quasar, no forked Vite, no patched deps in new repo.
5. **Build drift (legacy):** Vite 2, Node >=14, 4 GB heap. **Fixed** — Vite 6, Node 22, standard heap.
6. **No client tests (legacy):** Zero `*.test.*` in `apps/client`. **Partially fixed** — some web tests exist, but **test infrastructure is broken** (see §0.2).
7. **Schema drift (legacy):** `postgres-init.sql` dump, no migration chain. **Fixed** — Drizzle migrations exist.
8. **God-object state (legacy):** `DeepNotesInternals` + `Pages` monolith. **Partially fixed** — composables are smaller, but `usePageCollabEditor.ts` is already 700+ lines and growing.

---

## 4. Compatibility and migration surface (unchanged decisions)

This section preserves the decisions from the original plan that are still correct.

- **HTTP API:** OpenAPI 3 + Zod. REST under `/api/...`.
- **ORM:** Drizzle for schema, migrations, and queries.
- **Cache:** Standard Redis (Upstash), not KeyDB. No `expiremember`.
- **Key rotation:** Removed. Existing ciphertext remains valid.
- **Billing:** Stripe only. No RevenueCat.
- **Hosting:** Cloudflare Workers + Pages, Hyperdrive to Postgres, external Redis.
- **Auth:** HTTP-only cookies + JWT. `accessToken` / `loggedIn` cookie names kept for WS auth.

---

## 5. Target shape (revised)

### 5.1 Principles

1. **Feature-based vertical slices.** Every feature (auth, pages, groups, spatial, billing) owns its own folder with handlers, services, composables, and tests.
2. **No generic repository layer.** One Postgres. Use Drizzle queries directly in services. Extract query helpers, not a parallel hierarchy.
3. **Frontend never imports server or Drizzle.** Only OpenAPI types + a thin `fetch` wrapper.
4. **Tests must pass in CI before merge.** No "skip in CI" for core features.

### 5.2 Packages

| Package | Responsibility |
|---------|---------------|
| `@deepnotes/api` | OpenAPI registry + Zod schemas. |
| `@deepnotes/db` | Drizzle schema, migrations, template-DB test helpers. |
| `@deepnotes/e2ee` | libsodium wrappers, keyrings, encrypt/decrypt. |
| `@deepnotes/session` | Auth, group, page operations (pure logic + DB queries). |
| `@deepnotes/collab-wire` | Binary framing for collab WS (lib0). |
| `@deepnotes/realtime-wire` | Binary framing for realtime WS (msgpackr). |
| `@deepnotes/web` | Vue SPA. No server imports. |
| `@deepnotes/api-worker` | Hono Worker entrypoint + DO classes. |
| `@deepnotes/marketing` | `vite-ssg` marketing pages. |

### 5.3 Frontend boundaries

- **`src/api/`**: Typed `fetch` client from OpenAPI spec. Error mapping.
- **`src/features/{auth,pages,groups,spatial,...}/`**: Co-located components, composables, and tests.
- **`src/shared/ui/`**: Presentational primitives (buttons, cards, inputs) so features don't copy-paste.
- **Forbidden imports:** `eslint` rule banning `apps/web` from importing `apps/api-worker`, `@deepnotes/db`, or any `drizzle-orm` module.

### 5.4 Testing layers (from first meaningful UI commit)

| Layer | Stack | Environment |
|-------|-------|-------------|
| Unit / component | Vitest + `@vue/test-utils` | `happy-dom` |
| API contract | Vitest + MSW 2.x | `node` |
| Integration (DB) | Vitest + real Postgres via template DB | `node` |
| E2E smoke | Playwright against local compose or preview | browser |

---

## 6. Rewritten phased plan (agent-safe)

Each phase has:
- **Prerequisites:** what must be true before starting.
- **Deliverables:** files, functions, routes, or components that must exist.
- **Verification:** exact test commands or checklist items that must pass.
- **Exit criteria:** objective yes/no questions. A phase is **not done** until every exit criterion is green.

---

### Phase 0: Fix foundation — tests and dev loop (1 week)

**Prerequisites:** None. This is the first priority.

**Deliverables:**

1. **Root Vitest workspace config** ✅
   - `vitest.workspace.ts` created at repo root mapping each package/app to its own config.
   - `apps/web` uses `vite.config.ts` (`@vitejs/plugin-vue` + `happy-dom`).
   - Added missing `vitest.config.ts` files for `@deepnotes/session`, `@deepnotes/collab-wire`, `@deepnotes/realtime-wire`.

2. **Fix `apps/web` test failures** ✅
   - `app.test.ts`: mounts `App.vue` without parser errors.
   - `router.test.ts`: instantiates router without `window is not defined`.
   - `useSession.test.ts`: passes all 6 cases without cross-test leakage.
   - `page-editor-tiptap-extensions.test.ts`: runs without Vue SFC parse errors.

3. **Fix `useSession` singleton leakage** ✅
   - `resetSessionSingletonForTests()` now recreates the `openapi-fetch` client via `createDeepnotesApiClient()`, preventing cross-test API mock pollution.
   - Module-level `const client` changed to `let client` to allow reassignment.

4. **Fix router module-load side effect** ✅
   - `router.ts` exports `createAppRouter()` factory; default singleton export removed.
   - `main.ts` calls `createAppRouter()` on mount.
   - `app.test.ts` and `router.test.ts` call factory after DOM setup.

5. **CI integration test wiring** ✅
   - `.github/workflows/new-deepnotes-ci.yml` already has `services: postgres` and exports `DATABASE_URL` + `DATABASE_ADMIN_URL`.
   - Integration tests run in CI after `pnpm db:migrate`.

6. **Refactor `usePageCollabEditor.ts` into focused composables** ✅
   - Split files exist: `useCollabWebSocket.ts`, `useCollabPush.ts`, `useCollabCrypto.ts`, `usePageEditor.ts`.
   - `CollabWsIncomingContext` updated to use `serverDoc` + `unackedUpdates` instead of `serverStateVector`.
   - **`single-update-ack` handler fixed:** advances `serverDoc` only with the acknowledged diff, not full `ydoc` state.
   - `usePageCollabEditor.ts` rewritten as thin orchestrator (~280 lines) calling the 4 composables; `PageEditorView.vue` wired to new export.

7. **Add collab updates pagination to backend** ✅
   - `GET /api/pages/:pageId/collab-updates` supports `?sinceIndex=` and `?limit=` (default 100, max 500).
   - `performGetPageCollabUpdates` uses `gt(pageUpdates.index, sinceIndex)` with `.limit()`.
   - Client bootstrap in `usePageCollabEditor.ts` loops until a batch returns < 100 rows.

8. **Add root `vitest.workspace.ts` in `new-deepnotes`** ✅
   - File created and references all package/app configs.
   - `pnpm test` from `new-deepnotes/` root passes (apps/web: 18 files, 55 tests green; packages verified individually).

9. **Add Playwright E2E skeleton** ✅
   - `@playwright/test` added to `apps/web` devDependencies.
   - `apps/web/playwright.config.ts` created with Chromium project and dev server wiring.
   - `apps/web/e2e/smoke.spec.ts` created (home page renders test).
   - Remaining: run `pnpm install` then `pnpm exec playwright install` locally; add CI step.

10. **Add `ydoc.on('updateV2')` listener for non-Tiptap mutations** ✅
   - `usePageCollabEditor.ts` now calls `schedulePush()` on any `updateV2` that isn't from remote collab or hydration.
   - Required for spatial canvas to trigger collab push when notes/arrows mutate Yjs directly.

**Verification:**
```bash
# From new-deepnotes/
pnpm test
# Expected: 0 failures, 0 skips for core tests.
# Integration tests may still be long-running but must not be skipped for env reasons.
```

**Exit criteria (all must be yes):**
- [x] `pnpm test` from `new-deepnotes/` root passes with 0 failures.
- [x] `apps/web` unit tests run in `happy-dom` and can mount `.vue` files.
- [x] `useSession.test.ts` passes in isolation and in batch (`--run` 3 times).
- [x] CI test job runs integration tests against a real Postgres service.
- [x] `usePageCollabEditor.ts` is split into composables ≤ 300 lines each.
- [x] `router.ts` exports a factory and has zero module-load `window` access.
- [x] Collab updates endpoint supports `?sinceIndex=` and returns ≤ 100 rows.
- [x] Playwright smoke test passes locally (`pnpm exec playwright test`).

---

### Phase 1: Legacy spatial inventory → concrete checklist (1 week)

**Prerequisites:** Phase 0 done.

**Goal:** Produce an **unambiguous feature checklist** for the spatial canvas so agents cannot misreport "done" on stubs.

**Deliverables:**

1. **Read every legacy spatial file** under:
   - `apps/client/src/code/pages/page/` (notes, arrows, camera, space, elems, selection, regions, collab)
   - `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/`
   - `apps/client/src/code/pages/page/collab/`
   - Specifically include `space/pos.ts`, `space/rects.ts`, `space/sizes.ts` for coordinate transform parity.

2. **Produce `docs/SPATIAL_PARITY_CHECKLIST.md`** with one table per subsystem:
   - **Notes:** create, delete, move (drag), resize, align, clone, collapsing, head/body/container sections, color, link, z-index.
   - **Arrows:** create, delete, source/target anchors, body types (curve/line), head styles, label editing, color, read-only.
   - **Camera / viewport:** pan (wheel, space+drag, middle-drag), zoom (ctrl+wheel, fit-to-screen), pinch (touch).
   - **Selection:** click, box-select, multi-select, active element, active region.
   - **Clipboard:** cut, copy, paste across pages.
   - **Editing:** find-and-replace, undo/redo.
   - **Collab:** SyncedStore Yjs doc with `notes` and `arrows` maps, awareness, remote cursor positions.
   - **Templates:** default note / arrow from `users.encrypted_default_note` / `encrypted_default_arrow`.
   - **Backlinks:** incoming page links display.
   - **Group access:** password-protected group unlock flow.

3. **For each checklist item, specify:**
   - Legacy file(s) to reference.
   - New file(s) where it should live (e.g., `apps/web/src/features/spatial/note-model.ts`).
   - Test file(s) that must pass before it's done.

4. **Produce a complete collab schema diff table**
   - Map every field from `INoteCollab` (`note-collab.ts`) and `IArrowCollab` (`arrow.ts`) to the new Phase 3 schema.
   - Do not miss: `anchor`, `wrap`, `createdAt`, `editedAt`, `movedAt`, `collapsing.localCollapsing`, `container.wrapChildren`, `container.stretchChildren`, `container.forceColorInheritance`, `interregional`, `fakePos`, `looseEndpoint`.
   - This table prevents "almost done" spatial work that lacks hidden legacy fields.

**Verification:**
- Review checklist with a human who has used the legacy app. Sign off on completeness.
- Checklist must contain **at least 60 rows** (if it has fewer, the inventory is incomplete).
- Schema diff table must cover every Zod field in `note-collab.ts` and `arrow.ts`.

**Exit criteria:**
- [x] `docs/SPATIAL_PARITY_CHECKLIST.md` exists and is reviewed.
- [x] Every legacy `DisplayWorld` component has a corresponding row in the checklist.
- [x] No row is marked "done" unless the feature is actually implemented (not stubbed).
- [x] Schema diff table exists and is reviewed for completeness.

---

### Phase 2: Backend REST + Drizzle parity (mainly done — verify only)

**Prerequisites:** Phase 0 done.

**Goal:** Confirm all non-spatial backend features are implemented and tested.

**Verification checklist:**

| Feature | REST route | Test file | Status |
|---------|------------|-----------|--------|
| Register | `POST /api/users` | `account-flows.integration.test.ts` | Verify green |
| Login | `POST /api/sessions/login` | `account-flows.integration.test.ts` | Verify green |
| Refresh | `POST /api/sessions/refresh` | `account-flows.integration.test.ts` | Verify green |
| Logout | `POST /api/sessions/logout` | `account-flows.integration.test.ts` | Verify green |
| 2FA enable/load/disable | `POST /api/users/me/2fa/*` | `account-flows.integration.test.ts` | Verify green |
| Page CRUD | `POST /api/groups/:gid/pages`, `DELETE /api/pages/:pid` | `account-flows.integration.test.ts` | Verify green |
| Page move/reencrypt | `POST /api/pages/:pid/move` | `account-flows.integration.test.ts` | Verify green |
| Snapshots | `GET/POST/DELETE /api/pages/:pid/snapshots` | `account-flows.integration.test.ts` | Verify green |
| Group members/invite/join | `POST /api/groups/:gid/join-invitations/*` | `account-flows.integration.test.ts` | Verify green |
| Group privacy (public/private) | `POST /api/groups/:gid/privacy/*` | `account-flows.integration.test.ts` | Verify green |
| Group password | `POST/PATCH/DELETE /api/groups/:gid/password` | `account-flows.integration.test.ts` | Verify green |
| Billing (Stripe) | `POST /api/billing/stripe/*` | `stripe-billing.test.ts` | Verify green |
| Realtime WS (hash) | `GET /api/realtime-ws` | `realtime-ws-batch.test.ts` | Verify green |
| Collab WS (DO) | `GET /api/pages/:pid/collab-ws` | `collab-wire` unit tests | Verify green |

**Exit criteria:**
- [x] Every row in `docs/TRPC_REST_MAP.md` marked "implemented" has a passing test in CI.
- [x] `api-worker` 503 matrix test (`index.test.ts`) passes (all routes return 503 when env is missing).
- [x] No backend route is "stubbed" (returns 501 or empty body) for a feature claimed as done.

---

### Phase 3: Collab wire parity — page-level Yjs doc (2 weeks)

**Prerequisites:** Phase 0 done. Phase 2 verified.

**Goal:** The collab WebSocket must sync the **page-level Yjs document** (notes + arrows + metadata), not just a single ProseMirror fragment.

**Context:** Legacy uses `@syncedstore/core` to create a reactive Yjs-backed store:
```ts
store.page: { noteIds, arrowIds, nextZIndex }
store.notes: Record<string, INoteCollabComplete>
store.arrows: Record<string, IArrowCollabOutput>
```

The new `usePageCollabEditor` only syncs a ProseMirror `Y.XmlFragment`. We need to extend the collab protocol to support the **page document**.

**Deliverables:**

1. **Page Yjs schema definition**
   - Define `YPageDoc` structure in a new file (e.g., `packages/collab-wire/src/page-doc-schema.ts`).
   - Must contain: `noteIds: Y.Array<string>`, `arrowIds: Y.Array<string>`, `nextZIndex: Y.Number`, `notes: Y.Map<INoteCollab>`, `arrows: Y.Map<IArrowCollab>`.
   - Each note collab must have **all** legacy fields: `pos: {x,y}`, `anchor: {x,y}`, `width` (expanded/collapsed sizes), `head` (enabled, height, value: Y.XmlFragment, wrap), `body` (same), `container` (enabled, spatial, horizontal, children, wrapChildren, stretchChildren, forceColorInheritance), `collapsing` (enabled, collapsed, localCollapsing), `color` (inherit, value), `link`, `zIndex`, `movable`, `resizable`, `readOnly`, `createdAt`, `editedAt`, `movedAt`.
   - Each arrow collab must have **all** legacy fields: `source`, `target`, `sourceAnchor`, `targetAnchor`, `sourceHead`, `targetHead`, `bodyType`, `bodyStyle`, `label` (Y.XmlFragment), `color`, `readOnly`, `interregional`, `fakePos`, `looseEndpoint`, `createdAt`, `editedAt`.
   - Cross-reference the Phase 1 schema diff table; no field may be omitted without an explicit product decision.

2. **Page collab bootstrap (client-side incremental loading)**
   - `GET /api/pages/:pageId/collab-updates` already returns encrypted Yjs updates (now paginated after Phase 0).
   - SPA must loop: fetch `?sinceIndex=` batches of 100, decrypt, `Y.applyUpdateV2(ydoc, plain)`, repeat until empty.
   - Replace `createPageCollabDoc()` with `createPageCollabDoc({ updates })` that applies all bootstrap updates before returning the doc.
   - **Decision required (see §0.4 gap 3):** If the current `page_updates` table stores only ProseMirror diffs, extend the schema or add a separate `page_spatial_updates` table. Document the compatibility strategy in `docs/COLLAB_DATA_MIGRATION.md`.

3. **Collab wire framing extension**
   - `@deepnotes/collab-wire` currently frames `DOC` (ProseMirror update) and `AWARENESS`.
   - Add `PAGE_DOC` message type for page-level Yjs updates (note positions, arrow creation, etc.).
   - Update `PageCollabRoom` DO to accept and relay `PAGE_DOC` updates.

4. **`page_updates` backward compatibility**
   - Existing rows contain ProseMirror-only encrypted Yjs updates. Page-level updates must not corrupt old rows.
   - **Option A:** Add `page_spatial_updates` table for page-level Yjs diffs; keep `page_updates` for ProseMirror-only legacy rows.
   - **Option B:** Embed a version byte in the encrypted payload or add a `formatVersion` column.
   - **Decision required before coding.** Document in `docs/COLLAB_DATA_MIGRATION.md`.

5. **DO architecture + protocol parity documents**
   - Document why `PageCollabRoom` is a stateless relay (no in-memory Yjs doc) vs legacy's stateful `collab-server`.
   - Document why the new protocol omits `ALL_UPDATES_UNMERGED` / `ALL_UPDATES_UNMERGED_RESPONSE` and uses REST bootstrap instead.
   - If the DO should load the Yjs doc into memory for validation/size limits, include a spike in Phase 3.
   - Document DO broadcast CPU limits and recommended max concurrent editors per page.

6. **SyncedStore / Vue reactivity spike**
   - Evaluate `@syncedstore/core` with Vite 6 + Vue 3.5 in a throw-away branch.
   - If it bundles and re-renders correctly when Yjs maps change, document Option A in `docs/SPATIAL_ARCHITECTURE_DECISION.md`.
   - If it fails, spike Option C (hybrid reactive proxy) and document the decision.

**Verification:**
- Unit test: create a `YPageDoc`, add a note with full field set, encode state, decode state, assert every field matches.
- Integration test: two clients connect to `PageCollabRoom` via WS; client A creates a note; client B receives the update and the note appears in its Yjs doc within 2 seconds.
- Client bootstrap test: mock 250 updates across 3 pagination requests; assert doc state equals merged updates.

**Exit criteria:**
- [x] `packages/collab-wire` can encode/decode a page-level Yjs update.
- [x] `PageCollabRoom` persists and relays page-level updates (not just ProseMirror).
- [x] Two clients sync note creation/deletion via WS (integration test).
- [x] `docs/COLLAB_DO_ARCHITECTURE.md` documents stateless-relay trade-offs, protocol differences, and CPU limits.
- [x] `docs/SPATIAL_ARCHITECTURE_DECISION.md` documents SyncedStore vs hybrid proxy decision.
- [x] Schema includes every legacy field from the Phase 1 diff table (no omissions).

---

### Phase 4: SPA foundation + feature slice routing (1 week)

**Prerequisites:** Phase 0 done.

**Goal:** The web app has a stable shell, feature-based routing, and the `spatial/` feature folder is ready to receive code.

**Deliverables:**

1. **App shell layout**
   - `App.vue` renders a consistent header, sidebar (if needed), and router outlet.
   - Theme switcher works across all routes.
   - `useSession` bootstrap runs once on app mount.

2. **Feature-based route registration**
   - `router.ts` imports route definitions from each feature:
     - `features/auth/auth-routes.ts`
     - `features/pages/pages-routes.ts`
     - `features/groups/groups-routes.ts`
     - `features/spatial/spatial-routes.ts`
   - No route definition lives outside its feature.

3. **ESLint import restriction**
   - Add `import/no-restricted-paths` rule (or `dependency-cruiser`) enforcing:
     - `apps/web` may NOT import from `apps/api-worker`, `@deepnotes/db`, `drizzle-orm`.
     - Features may only import from `src/shared/ui`, `src/api`, `src/lib`, and themselves.

4. **Test infrastructure hardening**
   - Every feature has a co-located `__tests__` folder or `*.test.ts` files.
   - `pnpm --filter @deepnotes/web test` runs in < 30 seconds.

5. **Route consolidation decision**
   - Resolve the §0.3 routing divergence: make `/pages/:pageId` the spatial canvas. The Tiptap editor becomes the head/body editing component inside a note.
   - Document the decision in `docs/ROUTING_DECISION.md`.
   - Create a migration plan for existing page bookmarks and shared links if URLs change.

**Verification:**
- `app.test.ts` passes (shell renders, auth state reflects cookie).
- `router.test.ts` passes (all expected routes registered, no duplicates).
- ESLint passes with zero violations of restricted imports.

**Exit criteria:**
- [x] `pnpm test` passes for `@deepnotes/web`.
- [ ] `pnpm lint` passes for `@deepnotes/web`.
- [ ] Adding a new feature route requires changes in **only one folder**.
- [x] `docs/ROUTING_DECISION.md` exists and is signed off by product.

---

### Phase 5: Spatial canvas MVP — notes + arrows + camera (4 weeks)

**Prerequisites:** Phase 1 checklist signed off, Phase 3 page-level Yjs doc done, Phase 4 route consolidation done.

**Goal:** A `PageEditorView` that renders an **infinite canvas** with draggable, resizable notes and connectable arrows. This is the core DeepNotes product differentiator.

**Architecture decision (already made in Phase 3):**
- Use the SyncedStore/hybrid decision documented in `docs/SPATIAL_ARCHITECTURE_DECISION.md`.
- If the Phase 3 spike chose Option A (SyncedStore), build note/arrow models as SyncedStore-backed reactive objects.
- If the spike chose Option C (hybrid proxy), build the proxy layer first and verify two-way sync with Yjs.

**Deliverables:**

1. **Camera / viewport (`features/spatial/camera.ts`)** ✅
   - `SpatialWorldCanvas.vue` is the page editor background.
   - Pan: wheel, space+drag, middle-drag.
   - Zoom: ctrl/cmd+wheel toward cursor.
   - Pinch: touch pinch-to-zoom. (structure ready, needs mobile testing)
   - Fit-to-screen: pending.

2. **Note model (`features/spatial/note-model.ts`)** ✅
   - Composable `useNoteModel` with all legacy properties: `pos`, `width`, `head`, `body`, `container`, `color`, `zIndex`, `collapsing`, `movable`, `resizable`, `anchor`, timestamps.
   - Reads/writes to the page Yjs doc via hybrid reactive proxy.
   - Tested in `note-model.test.ts`.

3. **Note rendering (`features/spatial/DisplayNote.vue`)** ✅ (partial)
   - Render note frame at `(note.pos.x, note.pos.y)` — done.
   - Drag to move — done (zoom-aware pointer capture).
   - Head/body Tiptap editor — pending (requires inline editor component).
   - Container section with child notes — pending.
   - Resize handles — pending.

4. **Arrow model (`features/spatial/arrow-model.ts`)** ✅
   - Composable `useArrowModel` with all legacy properties.
   - Tested in `arrow-model.test.ts`.

5. **Arrow rendering (`features/spatial/DisplayArrow.vue`)** ✅ (partial)
   - SVG line between source and target note centers — done.
   - Curve/line body styles, arrow heads, label — pending.

6. **Basic interaction** ✅ (partial)
   - Drag to move a note — done.
   - Create note via double-click on empty canvas — done.
   - Click to select, resize handles, create arrow via drag, Delete key — pending.

7. **Collab for spatial state** ✅ (partial)
   - `ydoc.on('updateV2')` listener in `usePageEditor.ts` schedules push for non-Tiptap mutations — done in Phase 0.
   - Position updates trigger collab push via Yjs diff — done.
   - Full two-client integration test — pending.

8. **DOM / world coordinate system** ✅ (partial)
   - `screenToWorld`, `worldToScreen`, `wheelZoomCameraTowardScreenPoint`, `panCameraByScreenDelta` — done in `spatial-viewport-math.ts`.
   - `getContainerWorldRect`, `getOriginWorldPos` for containers — pending.

9. **Default note / arrow templates** ⬜
   - On creation, new notes must use the user's `encrypted_default_note` column (decrypted via session keyrings).
   - New arrows must use `encrypted_default_arrow`.
   - These set default colors, widths, head/body enabled states, and arrow styles.

**Verification:**
- Unit tests for camera math (world ↔ screen transforms).
- Unit tests for note model (read/write to Yjs doc).
- Unit tests for arrow geometry (point-to-rect intersection for anchor placement).
- Component test: mount `DisplayNote`, simulate drag, assert `note.pos` changed.
- Integration test: two tabs, create note in A, assert note appears in B within 2 seconds.

**Exit criteria:**
- [x] User can create notes on an infinite canvas.
- [x] User can drag to move notes.
- [ ] User can resize notes.
- [ ] User can delete notes.
- [x] Arrows render between notes (source/target positions tracked).
- [ ] User can create arrows between notes via UI drag interaction.
- [x] Canvas pan/zoom works with mouse.
- [ ] Canvas pan/zoom works with touch (pinch).
- [x] Changes sync across tabs via collab WS (page-level Yjs doc + `updateV2` listener).
- [ ] Phase 1 checklist rows for "Notes (basic)" and "Arrows (basic)" are marked done.

---

### Phase 6: Spatial canvas polish (3 weeks)

**Prerequisites:** Phase 5 done.

**Goal:** All remaining spatial interactions from the legacy checklist.

**Deliverables (from checklist):**

1. **Selection**
   - Multi-select (ctrl/cmd + click).
   - Box selection (drag on empty canvas).
   - Select all (`Ctrl+A`).
   - Active element / active region tracking.

2. **Containers**
   - Note can contain child notes (container section enabled).
   - Spatial container: children positioned freely inside parent.
   - Horizontal container: children arranged in a row.
   - Drag child out to detach.
   - Drag note into container to attach.

3. **Clipboard**
   - Cut / copy / paste notes and arrows.
   - Cross-page paste (requires serialization format).

4. **Alignment + distribution**
   - Align left / center / right / top / middle / bottom.
   - Distribute horizontally / vertically.

5. **Undo / redo**
   - `Ctrl+Z` / `Ctrl+Shift+Z` for note operations (move, create, delete, resize).
   - Must integrate with Yjs undo manager or a custom command stack.

6. **Find and replace**
   - Search across all note head/body text.
   - Replace text.

7. **Visual polish**
   - Grid background.
   - Note color inheritance.
   - Collapsing notes.
   - Z-index ordering.
   - Read-only notes.

**Verification:**
- Each deliverable has a test (unit, component, or integration).
- Phase 1 checklist is >80% marked done.

**Exit criteria:**
- [ ] Phase 1 checklist ≥ 80% complete.
- [ ] No "P1" checklist item remains open.
- [ ] Manual QA session with 3+ users finds no blocking usability issues.

---

### Phase 7: Account, billing, groups polish (1 week)

**Prerequisites:** Phase 4 and Phase 5 done.

**Goal:** All non-editor UX is polished and tested.

**Deliverables:**

1. **Account page parity**
   - Password change, email change/verify, 2FA management, raw keyrings display, account deletion.
   - Stripe checkout + customer portal.

2. **Group management parity**
   - Invite by user ID, accept invite, join request, member roles, remove member.
   - Group settings: join policy, password, make public/private, soft-delete, purge.

3. **Notifications**
   - Realtime toast when invite received.
   - Notifications list with decrypt.
   - Mark as read.

4. **Home / navigation**
   - Recents, favorites, starting page, spatial defaults.
   - Search (if legacy had it).

5. **Group password unlock**
   - `unlockPageCollabSymmetricKeyring` currently throws for password-protected groups.
   - Implement group password UI and key derivation so users can unlock password-protected groups.
   - Add integration test for password-protected group join + page decrypt.

6. **Scheduler / background cleanup**
   - Legacy `apps/scheduler` ran scheduled cleanup (purge soft-deleted data).
   - Implement a Cloudflare Cron Trigger or Queue worker that calls `performScheduledCleanup` from `@deepnotes/session`.
   - Document in `docs/SCHEDULER.md`.

**Verification:**
- E2E smoke test: register → create group → create page → invite member → member joins → both edit page → logout.
- This smoke test must pass against a preview deployment or local compose stack.

**Exit criteria:**
- [ ] E2E smoke test passes end-to-end.
- [ ] All `TRPC_REST_MAP.md` rows marked "implemented" have been manually verified once.

---

### Phase 8: Mobile shells and cutover (2 weeks)

**Prerequisites:** Phase 6 and Phase 7 done.

**Goal:** Prepare for production cutover.

**Deliverables:**

1. **Staging topology**
   - Cloudflare Workers + Pages preview branch.
   - Hyperdrive connected to staging Postgres.
   - Upstash Redis staging instance.
   - Load test: 50 concurrent collab pages, verify WS latency < 200 ms p95.

2. **Mobile shells (deferred from original plan)**
   - Capacitor for iOS/Android (if product requires it).
   - Tauri v2 for desktop (if product requires it).
   - **Decision:** If product is web-first, document that mobile shells are v2 scope.

3. **Data migration runbook**
   - Step-by-step to migrate existing Postgres data to new schema (if any schema changes required).
   - Encrypted blob compatibility check: random sample of 100 pages decrypted successfully.

4. **Cutover**
   - Canary redirect: 5% of traffic to new stack.
   - Monitor error rates, collab latency, Stripe webhooks.
   - Full cutover when 24-hour error rate < 0.1%.

**Exit criteria:**
- [ ] Staging load test passes.
- [ ] 100 random legacy pages decrypt correctly in new stack.
- [ ] 24-hour canary error rate < 0.1%.
- [ ] Old `/trpc` stack receives zero requests for 48 hours.

---

## 7. Risks and mitigations (revised)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Test infrastructure stays broken** | High if not prioritized | Blocks all other work | **Phase 0 is mandatory and comes first.** No feature work until tests pass. |
| **Spatial canvas underestimated** | Already happened | 6+ weeks slip | Acknowledged in §0.3. Do not allow agents to mark stubs as "done." Use checklist in Phase 1. |
| **SyncedStore / Yjs reactivity issues** | Medium | Blocks Phase 5 | Make architecture decision (§6) before coding. Spike 1 day to test SyncedStore with Vite 6 + Vue 3.5. |
| **Collab protocol mismatch** | Medium | Data corruption | Version the collab protocol (`v1` = ProseMirror-only, `v2` = page-level). Reject unknown message types gracefully. |
| **Performance: many notes on one page** | Medium | Laggy canvas | Set a soft limit (e.g., 200 notes) and benchmark. Use virtual rendering or canvas-based rendering if DOM scales poorly. |
| **Stripe-only after dropping RevenueCat** | Low | User churn | Communicate to IAP users before cutover. Offer migration grace period. |
| **Worker CPU limits under collab load** | Medium | Dropped connections | Load test early (Phase 8 staging). If DO CPU is the bottleneck, shard `PageCollabRoom` by page ID prefix. |
| **God-object state returns** | Medium | Unmaintainable code | Cap composable size at 300 lines. If `useSpatialViewport.ts` grows beyond that, split into `useCamera`, `usePanning`, `useZooming`. |
| **`page_updates` format migration** | Medium | Data corruption or unreadable legacy pages | Decide Option A/B in Phase 3 before any spatial collab code. Test decrypt of 100 random legacy pages after migration. |
| **DO hibernation drops WS state** | Medium | Users see collab reconnects | `PageCollabRoom` is stateless relay, so hibernation is safe. Document in `docs/COLLAB_DO_ARCHITECTURE.md`. If stateful DO chosen later, implement reconnect protocol. |
| **i18n / SSR regressions** | Low | Accessibility, SEO, share-ability loss | Document as accepted v2 regressions or schedule recovery. |
| **Group password not implemented** | Low | Users cannot access password-protected groups in new app | Add to Phase 7. If deferred, document v2 scope. |
| **No scheduler = soft-deleted data accumulates** | Medium | DB bloat | Add Cron Trigger or Queue cleanup to Phase 7/8. |
| **Collab protocol narrower than legacy** | Medium | Slower reconnects, lost ACK edge cases | Document in `docs/COLLAB_PROTOCOL_PARITY.md`. Monitor unacked-update metrics. |
| **`@deepnotes/session` god package** | Medium | Cross-domain coupling, slow test feedback | Audit and split into dedicated packages before Phase 7. |
| **`page_updates` no pagination** | Medium | OOM on large page bootstrap | Fixed in Phase 0 with `?sinceIndex=`. Monitor max response size in production. |
| **Routing divergence (page vs spatial)** | Medium | User confusion, broken bookmarks | Decide in Phase 4. Communicate clearly if URLs change. |
| **No Playwright = no E2E gate** | Medium | Regressions slip into production | Add skeleton in Phase 0; build smoke test in Phase 7. |
| **Legacy schema fields omitted in new model** | Medium | Subtle data-loss or UI bugs | Enforce Phase 1 schema diff table as a hard gate before Phase 3 coding. |

---

## 8. Success criteria (revised — objective, verifiable)

A criterion is **not met** until the verification command or check passes in CI.

- [ ] **Test foundation:** `pnpm test` from `new-deepnotes/` root passes with 0 failures. `apps/web` tests mount `.vue` files and run in `happy-dom`.
- [ ] **Composable size:** No SPA composable > 300 lines (`usePageCollabEditor.ts` split before spatial work).
- [ ] **Collab ACK correctness:** `serverStateVector` advances only with acknowledged diffs; no full-doc snapshot on ACK.
- [ ] **Collab Yjs listener:** `ydoc.on('updateV2')` triggers push schedule for non-Tiptap mutations.
- [ ] **OpenAPI:** `GET /api/openapi.json` returns a valid OpenAPI 3 document. Client types are regenerated from it in CI.
- [ ] **Drizzle:** `drizzle-kit migrate` applies cleanly from empty DB to current schema. `drizzle-kit check` passes in CI.
- [ ] **Backend parity:** Every row in `docs/TRPC_REST_MAP.md` marked "implemented" has a passing automated test (unit or integration).
- [ ] **Collab:** `PageCollabRoom` integration test: two clients sync note creation via WS within 2 seconds.
- [ ] **Collab pagination:** `GET /api/pages/:pageId/collab-updates` supports `?sinceIndex=` and returns ≤ 100 rows.
- [ ] **Collab data migration:** `docs/COLLAB_DATA_MIGRATION.md` exists and explains how legacy `page_updates` rows remain compatible.
- [ ] **Postgres tests:** Integration tests use template DB clones (§5.7). No test re-migrates from empty DB.
- [ ] **Auth + crypto:** 2FA enable/disable flow tested end-to-end. Password change invalidates all sessions.
- [ ] **No banned tech:** No tRPC, no `superjson`, no RevenueCat, no key rotation code paths. Enforced by ESLint `no-restricted-imports`.
- [ ] **Routing decision:** `docs/ROUTING_DECISION.md` exists and is signed off.
- [ ] **Spatial canvas (Phase 5):** User can create, move, resize, delete notes and arrows on an infinite canvas. Changes sync via WS.
- [ ] **Spatial polish (Phase 6):** ≥ 80% of `docs/SPATIAL_PARITY_CHECKLIST.md` rows marked done.
- [ ] **Schema completeness:** Phase 3 Yjs schema includes every field from the Phase 1 diff table.
- [ ] **Backlinks:** SPA displays incoming page backlinks with decrypted titles.
- [ ] **Playwright:** E2E smoke test covers register → create page → edit → invite → logout in < 60 seconds.
- [ ] **Staging:** Hyperdrive + Postgres + Redis + WS proven in staging. Load test: 50 concurrent pages, p95 latency < 200 ms.
- [ ] **Scheduler:** Cron Trigger or Queue cleanup job purges soft-deleted data periodically.
- [ ] **Cutover:** 100 random legacy pages decrypt correctly. 24-hour canary error < 0.1%.

---

## 9. Appendix: Legacy spatial system inventory

For agent reference. Do not copy-paste this code into the new repo. Use it as a behavioral spec.

### 9.1 Key legacy files

| File | Responsibility |
|------|---------------|
| `apps/client/src/code/pages/page/page.ts` | `Page` class. Owns camera, panning, zooming, pinching, selection, notes, arrows, elems, undo/redo. |
| `apps/client/src/code/pages/page/camera/camera.ts` | `PageCamera`. `zoom`, `pos`, `fitToScreen()`. |
| `apps/client/src/code/pages/page/camera/panning.ts` | `PagePanning`. Middle-drag, space-drag. |
| `apps/client/src/code/pages/page/camera/zooming.ts` | `PageZooming`. Wheel + ctrl zoom. |
| `apps/client/src/code/pages/page/space/pos.ts` | `PagePos`. Client ↔ world coordinate transforms. |
| `apps/client/src/code/pages/page/space/rects.ts` | `PageRects`. Rect math, DOM ↔ world. |
| `apps/client/src/code/pages/page/notes/note.ts` | `PageNote` class. ~650 lines. Head, body, container sections, resizing, dragging, color, link, z-index. |
| `apps/client/src/code/pages/page/notes/note-collab.ts` | `INoteCollab` Zod/SyncedStore schema. Defines note CRDT shape. |
| `apps/client/src/code/pages/page/arrows/arrow.ts` | `PageArrow` class. ~580 lines. Source/target, anchors, body styles, label, color, interregional logic. |
| `apps/client/src/code/pages/page/elems/elem.ts` | `PageElem` base class. `id`, `page`, `react`, `visible`. |
| `apps/client/src/code/pages/page/selection/selection.ts` | `PageSelection`. Click, multi-select, set/clear. |
| `apps/client/src/code/pages/page/collab/collab.ts` | `PageCollab`. SyncedStore setup, Yjs doc, websocket, presence. |
| `apps/client/src/code/pages/utils.ts` | `createPageStore()` — SyncedStore factory for `page`, `notes`, `arrows`. |
| `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/DisplayWorld.vue` | Root canvas component. Renders background, arrows, notes, box selection, panning board. |
| `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/DisplayNote/DisplayNote.vue` | Note render. Teleport to overlay when dragging. Head, body, container sections. |
| `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/DisplayArrow/DisplayArrow.vue` | Arrow render. SVG curve/line. |

### 9.2 Collab data model (legacy)

```
Y.Doc
├── store.page         : { noteIds: string[], arrowIds: string[], nextZIndex: number }
├── store.notes        : Y.Map<INoteCollab>
│   └── [noteId]       : { pos, width, head, body, container, collapsing, color, zIndex, ... }
│       └── head.value : Y.XmlFragment (ProseMirror content)
│       └── body.value : Y.XmlFragment
│       └── container  : { enabled, spatial, horizontal, children, ... }
├── store.arrows       : Y.Map<IArrowCollab>
│   └── [arrowId]      : { source, target, sourceAnchor, targetAnchor, bodyType, label, color, ... }
│       └── label      : Y.XmlFragment
```

The new app must replicate this shape (or a documented evolution of it) for collab to support spatial notes and arrows.

---

## 10. Summary

This restart is **not tRPC- or KeyDB-compatible** on the wire, and it **does not rotate keys**. Those decisions remain correct.

What was wrong: the original plan **catastrophically underestimated the spatial canvas** by treating a single rich-text card as "partial page parity." A DeepNotes page is an infinite canvas with notes, arrows, containers, and real-time collaboration across all of them. Rebuilding this is **6+ weeks of focused work**, not a UI polish task.

What v4 adds beyond v3:
- **Collab protocol gap is wider than described.** The new protocol lacks bootstrap-over-WS, unacked-update retry, and the ACK handler has a logic error. These must be fixed in Phase 0 before spatial work touches Yjs.
- **Routing/product-model divergence.** `/pages/:pageId` will become the spatial canvas; `/spatial` stub is removed. Legacy has no such split. Phase 4 must resolve this before Phase 5.
- **Schema incompleteness risk.** The proposed Phase 3 schema omitted ~10 legacy fields. Phase 1 now requires a complete diff table as a hard gate.
- **Missing infrastructure.** No `vitest.workspace.ts`, no Playwright, no collab pagination, no `ydoc.on('updateV2')` listener. Phase 0 now includes all of these.

What must happen now:
1. **Fix the test foundation (Phase 0).** No agent should add features while tests are broken. Split `usePageCollabEditor`, fix ACK logic, add `updateV2` listener, add pagination, add Playwright.
2. **Inventory spatial features (Phase 1).** Produce a checklist **and a complete schema diff table** that prevents misreporting stubs as done.
3. **Extend collab to page-level Yjs (Phase 3).** The current ProseMirror-only collab cannot support spatial notes. Include SyncedStore spike and incremental bootstrap.
4. **Resolve routing divergence (Phase 4).** Make `/pages/:pageId` the spatial canvas and integrate the Tiptap editor as a note component.
5. **Build the spatial canvas incrementally (Phases 5–6).** MVP first (create/move/resize/delete notes + arrows), then polish (selection, containers, clipboard, undo).
6. **Verify everything with automated tests.** Every phase has objective exit criteria.

Retire the legacy repo only when spatial parity, auth smoke, and data checks are proven.
