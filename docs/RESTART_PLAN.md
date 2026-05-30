# DeepNotes — Restart (greenfield) plan — v2

> **Last updated:** 2026-05-29  
> **Status:** Phase 2–3 backend largely complete. Phase 4–5 SPA partially complete. **Foundation bugs and spatial canvas NOT started.**  
> **This document replaces all prior restart plan versions.** If a prior statement conflicts with this one, this version wins.

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
| **Spatial / world canvas** | `apps/web/src/features/spatial/*` | **Stub only** | `SpatialWorldStubView` shows page pins on a pan/zoom canvas. **No interactive notes, arrows, or containers.** |

### 0.2 Critical bugs that block everything else

These must be fixed **before any agent adds new features**. They are root-cause failures in the dev/test loop, not feature gaps.

1. **`apps/web` Vitest configuration is broken for monorepo runs**
   - **Symptom:** Running `pnpm vitest run` from repo root fails on `.vue` SFC parsing (`Install @vitejs/plugin-vue`), `window is not defined` (router), and `document is not defined` (useSession).
   - **Root cause:** Root-level `pnpm vitest run` does **not** resolve `apps/web/vite.config.ts`. The web app’s `test: { environment: "happy-dom" }` and `@vitejs/plugin-vue` are ignored when tests are discovered from the root.
   - **Fix:** Add a root `vitest.workspace.ts` (or `vitest.config.ts` with workspace projects) that explicitly maps `apps/web` to its `vite.config.ts`. See §6.1.

2. **`useSession` singleton state leaks between tests**
   - **Symptom:** All `useSession.test.ts` cases fail in batch even though individual assertions are correct.
   - **Root cause:** `useSession` uses module-level `ref()` singletons. `resetSessionSingletonForTests()` resets the refs but does not clear the `bootstrapInFlight` promise or any other module-level caches. Concurrent test execution + module caching in Vitest causes cross-test pollution.
   - **Fix:** Make `useSession` accept an optional `createClient` override in test mode, or refactor to a factory pattern. See §6.2.

3. **`router.ts` executes `createWebHistory()` at module load time**
   - **Symptom:** `router.test.ts` crashes with `window is not defined` before any test body runs.
   - **Root cause:** `const router = createRouter({ history: createWebHistory(...) })` runs on `import`, which is before `happy-dom` installs `window`.
   - **Fix:** Export a `createRouter()` factory function instead of a singleton router instance. Mount the router in `main.ts` and in tests after the DOM environment is ready. See §6.3.

4. **Integration tests silently skip in CI when `DATABASE_URL` is absent**
   - **Symptom:** `template-db.test.ts` and `account-flows.integration.test.ts` skip with `describe.skipIf(ctx == null)`.
   - **Root cause:** No CI job sets `DATABASE_URL` + `DATABASE_ADMIN_URL`.
   - **Fix:** Add a GitHub Actions job (or local `docker-compose up` step) that exports DB URLs before `pnpm test`. See §6.4.

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

**Decision required:** Do we commit to full spatial parity, or do we ship a **single-note-per-page** product first and add the canvas later? This plan assumes **full spatial parity is required** because the legacy product is defined by it. If product wants to defer spatial canvas to a v2, rewrite §0.3 and all Phase 6+ references accordingly.

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

1. **Root Vitest workspace config**
   - Create `vitest.workspace.ts` at repo root mapping each package/app to its own `vitest.config.ts` or `vite.config.ts`.
   - `apps/web` must use its `vite.config.ts` (which has `@vitejs/plugin-vue` + `happy-dom`).
   - All other packages use their own `vitest.config.ts` or a default node environment.

2. **Fix `apps/web` test failures**
   - `app.test.ts`: must mount `App.vue` without parser errors.
   - `router.test.ts`: must instantiate router without `window is not defined`.
   - `useSession.test.ts`: must pass all 6 cases without cross-test leakage.
   - `page-editor-tiptap-extensions.test.ts`: must run without Vue SFC parse errors.

3. **Fix `useSession` singleton leakage**
   - Option A: Convert `useSession` to a factory that returns fresh state per call, with a `provide/inject` or app-level singleton in production.
   - Option B: Keep module singleton but add `destroySessionSingletonForTests()` that nulls `bootstrapInFlight` and clears any `Promise` caches.

4. **Fix router module-load side effect**
   - Change `router.ts` to export `createAppRouter()` factory.
   - Update `main.ts` to call the factory.
   - Update `app.test.ts` and any test that needs a router to call the factory after DOM setup.

5. **CI integration test wiring**
   - Add `services: postgres` to the GitHub Actions `test` job (or use `docker-compose up -d` in a step).
   - Export `DATABASE_URL`, `DATABASE_ADMIN_URL`, `TEST_DB_TEMPLATE_NAME` so `template-db.test.ts` and `account-flows.integration.test.ts` run instead of skipping.

**Verification:**
```bash
pnpm test
# Expected: 0 failures, 0 skips for core tests.
# Integration tests may still be long-running but must not be skipped for env reasons.
```

**Exit criteria (all must be yes):**
- [ ] `pnpm test` from repo root passes with 0 failures.
- [ ] `apps/web` unit tests run in `happy-dom` and can mount `.vue` files.
- [ ] `useSession.test.ts` passes in isolation and in batch (`--run` 3 times).
- [ ] CI test job runs integration tests against a real Postgres service.

---

### Phase 1: Legacy spatial inventory → concrete checklist (1 week)

**Prerequisites:** Phase 0 done.

**Goal:** Produce an **unambiguous feature checklist** for the spatial canvas so agents cannot misreport "done" on stubs.

**Deliverables:**

1. **Read every legacy spatial file** under:
   - `apps/client/src/code/pages/page/` (notes, arrows, camera, space, elems, selection, regions, collab)
   - `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/`
   - `apps/client/src/code/pages/page/collab/`

2. **Produce `docs/SPATIAL_PARITY_CHECKLIST.md`** with one table per subsystem:
   - **Notes:** create, delete, move (drag), resize, align, clone, collapsing, head/body/container sections, color, link, z-index.
   - **Arrows:** create, delete, source/target anchors, body types (curve/line), head styles, label editing, color, read-only.
   - **Camera / viewport:** pan (wheel, space+drag, middle-drag), zoom (ctrl+wheel, fit-to-screen), pinch (touch).
   - **Selection:** click, box-select, multi-select, active element, active region.
   - **Clipboard:** cut, copy, paste across pages.
   - **Editing:** find-and-replace, undo/redo.
   - **Collab:** SyncedStore Yjs doc with `notes` and `arrows` maps, awareness, remote cursor positions.

3. **For each checklist item, specify:**
   - Legacy file(s) to reference.
   - New file(s) where it should live (e.g., `apps/web/src/features/spatial/note-model.ts`).
   - Test file(s) that must pass before it's done.

**Verification:**
- Review checklist with a human who has used the legacy app. Sign off on completeness.
- Checklist must contain **at least 50 rows** (if it has fewer, the inventory is incomplete).

**Exit criteria:**
- [ ] `docs/SPATIAL_PARITY_CHECKLIST.md` exists and is reviewed.
- [ ] Every legacy `DisplayWorld` component has a corresponding row in the checklist.
- [ ] No row is marked "done" unless the feature is actually implemented (not stubbed).

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
- [ ] Every row in `docs/TRPC_REST_MAP.md` marked "implemented" has a passing test in CI.
- [ ] `api-worker` 503 matrix test (`index.test.ts`) passes (all routes return 503 when env is missing).
- [ ] No backend route is "stubbed" (returns 501 or empty body) for a feature claimed as done.

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
   - Each note collab must have `pos: {x,y}`, `width`, `head` (Y.XmlFragment), `body` (Y.XmlFragment), `container` (enabled, spatial, horizontal, children), etc.
   - Each arrow collab must have `source`, `target`, `sourceAnchor`, `targetAnchor`, `bodyType`, `label` (Y.XmlFragment), etc.

2. **Page collab bootstrap**
   - `GET /api/pages/:pageId/collab-updates` already returns encrypted Yjs updates.
   - Verify that the server can persist and serve **page-level updates** (not just ProseMirror).
   - If the current `page_updates` table stores only ProseMirror diffs, extend the schema or add a separate `page_state_updates` table. **Decision required.**

3. **SPA page document loader**
   - Replace `createPageCollabDoc()` (which creates a bare `Y.Doc`) with a function that loads the page structure from the server bootstrap and initializes `Y.Map`s for notes and arrows.

4. **Collab wire framing extension**
   - `@deepnotes/collab-wire` currently frames `DOC` (ProseMirror update) and `AWARENESS`.
   - Add `PAGE_DOC` message type for page-level Yjs updates (note positions, arrow creation, etc.).
   - Update `PageCollabRoom` DO to accept and relay `PAGE_DOC` updates.

**Verification:**
- Unit test: create a `YPageDoc`, add a note, encode state, decode state, assert note position matches.
- Integration test: two clients connect to `PageCollabRoom` via WS; client A creates a note; client B receives the update and the note appears in its Yjs doc within 2 seconds.

**Exit criteria:**
- [ ] `packages/collab-wire` can encode/decode a page-level Yjs update.
- [ ] `PageCollabRoom` persists and relays page-level updates (not just ProseMirror).
- [ ] Two browser tabs can sync note creation/deletion via WS (integration test or manual QA with sign-off).

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

**Verification:**
- `app.test.ts` passes (shell renders, auth state reflects cookie).
- `router.test.ts` passes (all expected routes registered, no duplicates).
- ESLint passes with zero violations of restricted imports.

**Exit criteria:**
- [ ] `pnpm test` passes for `@deepnotes/web`.
- [ ] `pnpm lint` passes for `@deepnotes/web`.
- [ ] Adding a new feature route requires changes in **only one folder**.

---

### Phase 5: Single-note editor parity (2 weeks)

**Prerequisites:** Phase 0 and Phase 4 done.

**Goal:** The `PageEditorView` is a fully functional **single-note** editor with all rich-text features from legacy. This is a **stepping stone** to the spatial canvas, not the final state.

**Deliverables:**

1. **Rich-text feature completeness**
   - Verify every Tiptap extension from legacy is present:
     - StarterKit (bold, italic, bullet, ordered, blockquote, hard break, heading, horizontal rule)
     - Link, underline, placeholder
     - Table (resizable), image (inline + base64), task list
     - Highlight, text align, subscript, superscript
     - Code block (lowlight), inline math, math block, YouTube embed
   - Styling matches legacy (or deliberate product decision documents differences).

2. **Editor management**
   - Snapshots: list, save, load, delete.
   - Path breadcrumb with decrypted titles.
   - Bump, favorite, recent, starting page.

3. **Collab in single-note mode**
   - WS awareness (caret colors, selection) works.
   - WS fallback to REST `POST /collab-updates` works.
   - Demo mode uses local-only Yjs (no WS, no REST push).

**Verification:**
- `page-editor-tiptap-extensions.test.ts` passes.
- Manual QA: open a page in two tabs, type in both, verify text syncs within 1 second.
- Snapshot save/load integration test passes.

**Exit criteria:**
- [ ] All Tiptap extensions listed above are present and tested.
- [ ] Collab syncs text + awareness in real time across tabs.
- [ ] Page management (bump, favorite, snapshots, soft-delete) works end-to-end.

---

### Phase 6: Spatial canvas MVP — notes + arrows + camera (4 weeks)

**Prerequisites:** Phase 1 checklist signed off, Phase 3 page-level Yjs doc done, Phase 5 done.

**Goal:** A `PageEditorView` that renders an **infinite canvas** with draggable, resizable notes and connectable arrows. This is the core DeepNotes product differentiator.

**Architecture decision required before coding:**
- **Option A (legacy-like):** Use SyncedStore or a custom reactive wrapper around Yjs maps so Vue components re-render when CRDT state changes.
- **Option B (explicit):** Read Yjs state into plain objects on every frame or interaction, and write back explicitly. Simpler but less "live."
- **Option C (hybrid):** Keep Yjs as the collab source of truth, but maintain a plain reactive proxy for Vue reactivity, syncing bidirectionally.

**Recommendation:** Option A (SyncedStore) if it works with modern Vite/Vue. Option C if SyncedStore has bundling issues. **Document the decision in `docs/SPATIAL_ARCHITECTURE_DECISION.md`.**

**Deliverables:**

1. **Camera / viewport (`features/spatial/camera.ts`)**
   - `SpatialWorldCanvas.vue` becomes the actual page editor background.
   - Pan: wheel, space+drag, middle-drag.
   - Zoom: ctrl/cmd+wheel toward cursor.
   - Pinch: touch pinch-to-zoom.
   - Fit-to-screen: button that centers on all notes.

2. **Note model (`features/spatial/note-model.ts`)**
   - Class or composable representing a note on the page.
   - Properties: `id`, `pos: Vec2`, `width`, `head: { enabled, height, value: Y.XmlFragment }`, `body: { enabled, height, value: Y.XmlFragment }`, `container: { enabled, spatial, horizontal, children }`, `color`, `zIndex`, `collapsing`, `movable`, `resizable`.
   - Must read from / write to the page Yjs doc.

3. **Note rendering (`features/spatial/DisplayNote.vue`)**
   - Render note frame at `(note.pos.x, note.pos.y)`.
   - Head section: Tiptap editor (using existing Tiptap extensions) bound to `note.head.value`.
   - Body section: Tiptap editor bound to `note.body.value`.
   - Container section: renders child notes inside (if `container.enabled`).
   - Resize handles (8 corners/sides).
   - Drag handle on note frame.

4. **Arrow model (`features/spatial/arrow-model.ts`)**
   - Properties: `id`, `source`, `target`, `sourceAnchor`, `targetAnchor`, `bodyType`, `bodyStyle`, `sourceHead`, `targetHead`, `label: Y.XmlFragment`, `color`.

5. **Arrow rendering (`features/spatial/DisplayArrow.vue`)**
   - SVG overlay on top of notes.
   - Curve or line body between source and target note edges.
   - Arrow heads at source/target.
   - Label near midpoint.

6. **Basic interaction**
   - Click to select a note.
   - Drag to move a note.
   - Drag resize handles to resize.
   - Create note: double-click on empty canvas (or button).
   - Create arrow: drag from note edge handle to another note.
   - Delete: `Delete` key when note selected.

7. **Collab for spatial state**
   - When a note is moved, the position update syncs via collab WS within 200 ms.
   - When an arrow is created, it appears on remote clients within 1 second.
   - Remote cursor awareness shows which user is editing which note.

**Verification:**
- Unit tests for camera math (world ↔ screen transforms).
- Unit tests for note model (read/write to Yjs doc).
- Unit tests for arrow geometry (point-to-rect intersection for anchor placement).
- Component test: mount `DisplayNote`, simulate drag, assert `note.pos` changed.
- Integration test: two tabs, create note in A, assert note appears in B within 2 seconds.

**Exit criteria:**
- [ ] User can create, move, resize, and delete notes on an infinite canvas.
- [ ] User can create arrows between notes.
- [ ] Canvas pan/zoom works with mouse and touch.
- [ ] Changes sync across tabs via collab WS.
- [ ] Phase 1 checklist rows for "Notes (basic)" and "Arrows (basic)" are marked done.

---

### Phase 7: Spatial canvas polish (3 weeks)

**Prerequisites:** Phase 6 done.

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

### Phase 8: Account, billing, groups polish (1 week)

**Prerequisites:** Phase 5 done.

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

**Verification:**
- E2E smoke test: register → create group → create page → invite member → member joins → both edit page → logout.
- This smoke test must pass against a preview deployment or local compose stack.

**Exit criteria:**
- [ ] E2E smoke test passes end-to-end.
- [ ] All `TRPC_REST_MAP.md` rows marked "implemented" have been manually verified once.

---

### Phase 9: Mobile shells and cutover (2 weeks)

**Prerequisites:** Phase 7 and Phase 8 done.

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
| **SyncedStore / Yjs reactivity issues** | Medium | Blocks Phase 6 | Make architecture decision (§6) before coding. Spike 1 day to test SyncedStore with Vite 6 + Vue 3.5. |
| **Collab protocol mismatch** | Medium | Data corruption | Version the collab protocol (`v1` = ProseMirror-only, `v2` = page-level). Reject unknown message types gracefully. |
| **Performance: many notes on one page** | Medium | Laggy canvas | Set a soft limit (e.g., 200 notes) and benchmark. Use virtual rendering or canvas-based rendering if DOM scales poorly. |
| **Stripe-only after dropping RevenueCat** | Low | User churn | Communicate to IAP users before cutover. Offer migration grace period. |
| **Worker CPU limits under collab load** | Medium | Dropped connections | Load test early (Phase 9 staging). If DO CPU is the bottleneck, shard `PageCollabRoom` by page ID prefix. |
| **God-object state returns** | Medium | Unmaintainable code | Cap composable size at 300 lines. If `useSpatialViewport.ts` grows beyond that, split into `useCamera`, `usePanning`, `useZooming`. |

---

## 8. Success criteria (revised — objective, verifiable)

A criterion is **not met** until the verification command or check passes in CI.

- [ ] **Test foundation:** `pnpm test` from repo root passes with 0 failures. `apps/web` tests mount `.vue` files and run in `happy-dom`.
- [ ] **OpenAPI:** `GET /api/openapi.json` returns a valid OpenAPI 3 document. Client types are regenerated from it in CI.
- [ ] **Drizzle:** `drizzle-kit migrate` applies cleanly from empty DB to current schema. `drizzle-kit check` passes in CI.
- [ ] **Backend parity:** Every row in `docs/TRPC_REST_MAP.md` marked "implemented" has a passing automated test (unit or integration).
- [ ] **Collab:** `PageCollabRoom` integration test: two clients sync note creation via WS within 2 seconds.
- [ ] **Postgres tests:** Integration tests use template DB clones (§5.7). No test re-migrates from empty DB.
- [ ] **Auth + crypto:** 2FA enable/disable flow tested end-to-end. Password change invalidates all sessions.
- [ ] **No banned tech:** No tRPC, no `superjson`, no RevenueCat, no key rotation code paths. Enforced by ESLint `no-restricted-imports`.
- [ ] **Spatial canvas (Phase 6):** User can create, move, resize, delete notes and arrows on an infinite canvas. Changes sync via WS.
- [ ] **Spatial polish (Phase 7):** ≥ 80% of `docs/SPATIAL_PARITY_CHECKLIST.md` rows marked done.
- [ ] **E2E smoke:** Playwright test covers register → create page → edit → invite → logout in < 60 seconds.
- [ ] **Staging:** Hyperdrive + Postgres + Redis + WS proven in staging. Load test: 50 concurrent pages, p95 latency < 200 ms.
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

What must happen now:
1. **Fix the test foundation (Phase 0).** No agent should add features while tests are broken.
2. **Inventory spatial features (Phase 1).** Produce a checklist that prevents misreporting stubs as done.
3. **Extend collab to page-level Yjs (Phase 3).** The current ProseMirror-only collab cannot support spatial notes.
4. **Build the spatial canvas incrementally (Phases 6–7).** MVP first (create/move/resize/delete notes + arrows), then polish (selection, containers, clipboard, undo).
5. **Verify everything with automated tests.** Every phase has objective exit criteria.

Retire the legacy repo only when spatial parity, auth smoke, and data checks are proven.
