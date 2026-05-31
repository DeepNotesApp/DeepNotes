# Phase 3: Collab wire parity — page-level Yjs doc

> **Prerequisites:** Phase 0 done. Phase 2 verified.  
> **Status:** Complete

---

## Goal

The collab WebSocket must sync the **page-level Yjs document** (notes + arrows + metadata), not just a single ProseMirror fragment.

---

## Context

Legacy uses `@syncedstore/core` to create a reactive Yjs-backed store:
```ts
store.page: { noteIds, arrowIds, nextZIndex }
store.notes: Record<string, INoteCollabComplete>
store.arrows: Record<string, IArrowCollabOutput>
```

The new `usePageCollabEditor` only syncs a ProseMirror `Y.XmlFragment`. We need to extend the collab protocol to support the **page document**.

---

## Deliverables

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
   - **Decision required (see gap 3 in index):** If the current `page_updates` table stores only ProseMirror diffs, extend the schema or add a separate `page_spatial_updates` table. Document the compatibility strategy in `docs/COLLAB_DATA_MIGRATION.md`.

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

7. **Update squashing / buffering mechanism**
   - Select and implement one of the options from gap 15 (DO alarm, Redis buffer, or Postgres batching).
   - If using DO alarm: `PageCollabRoom` stores updates in `this.ctx.storage`, calls `this.ctx.storage.setAlarm()` after first buffered update, and flushes on alarm callback. Flush merges all buffered updates into one squashed `page_updates` row and clears the buffer.
   - If using Postgres batching: `performTrustedAppendNextPageCollabUpdate` accumulates N updates or waits T seconds before inserting.
   - **Goal:** Reduce row creation rate from one-per-keystroke to one-per-30–60-seconds of sustained editing.
   - Document the chosen strategy in `docs/COLLAB_DO_ARCHITECTURE.md`.

8. **Per-message auth revocation check in `PageCollabRoom`**
   - Before processing any `SINGLE_UPDATE`, call a lightweight auth check: `assertStillAllowed(userId, pageId)`.
   - Cache the result in DO state with a 30-second TTL to avoid DB round-trips per keystroke.
   - On failure, close the socket with code `1008` and log the revocation reason.
   - Unit test: simulate WS connect → mock auth success → emit update → mock auth failure → assert socket closed.

9. **DO broadcast backpressure / chunking**
   - `PageCollabRoom.broadcast()` must chunk socket iteration into batches (e.g., 10 sockets per `Promise.all`) to stay under Cloudflare DO CPU limits.
   - Document the recommended max concurrent editors per page (e.g., 50) in `docs/COLLAB_DO_ARCHITECTURE.md`.
   - Unit test: mock 20 sockets, verify `send()` is chunked into two batches.

10. **DO testing strategy**
    - Extract DO logic into pure functions where possible (e.g., `handleCollabMessage(sockets, message) → actions[]`) so the core logic can be unit-tested in Vitest without Cloudflare DO mocking.
    - For WS lifecycle tests, use `workerd` / `miniflare` to spin up `PageCollabRoom` and `UserRealtimeRoom` in-process.
    - If DO mocking is too complex for the current tooling, document the gap in `docs/COLLAB_DO_ARCHITECTURE.md` and require that all non-WS-glue logic have ≥ 80% unit test coverage.

---

## Verification

- Unit test: create a `YPageDoc`, add a note with full field set, encode state, decode state, assert every field matches.
- Integration test: two clients connect to `PageCollabRoom` via WS; client A creates a note; client B receives the update and the note appears in its Yjs doc within 2 seconds.
- Client bootstrap test: mock 250 updates across 3 pagination requests; assert doc state equals merged updates.

---

## Exit criteria

- [x] `packages/collab-wire` can encode/decode a page-level Yjs update.
- [x] `PageCollabRoom` persists and relays page-level updates (not just ProseMirror).
- [x] Two clients sync note creation/deletion via WS (integration test).
- [x] `docs/COLLAB_DO_ARCHITECTURE.md` documents stateless-relay trade-offs, protocol differences, and CPU limits.
- [x] `docs/SPATIAL_ARCHITECTURE_DECISION.md` documents SyncedStore vs hybrid proxy decision.
- [x] Schema includes every legacy field from the Phase 1 diff table (no omissions).
- [ ] Update squashing mechanism implemented and tested: 50 rapid edits produce ≤ 2 `page_updates` rows.
- [ ] `PageCollabRoom` closes socket (code `1008`) when auth is revoked mid-session (unit test).
- [ ] `PageCollabRoom` broadcast chunks into batches of ≤ 10 sockets (unit test).
- [ ] DO logic extracted into pure functions with ≥ 80% unit test coverage, or gap documented with `workerd` / `miniflare` spike.
