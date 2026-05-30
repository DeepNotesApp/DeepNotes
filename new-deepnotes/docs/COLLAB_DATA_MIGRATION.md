# Collab Data Migration: `page_updates` Compatibility

> **Status:** Decided — Option A (separate table)  
> **Date:** 2026-05-30

## Problem

The `page_updates` table today stores encrypted Yjs updates. All existing rows were created by the single-note editor and contain **ProseMirror-only** updates (a single `Y.XmlFragment`).

Phase 3 introduces a **page-level Yjs document** with `page.noteIds`, `page.arrowIds`, `notes`, and `arrows` maps. Page-level updates (e.g., moving a note) produce a different Yjs update binary than ProseMirror-only updates.

We must ensure:
1. Old rows remain readable by both legacy and new clients.
2. New page-level updates do not corrupt old rows or confuse old clients.
3. Migration path is reversible and testable.

## Options

### Option A — Add `page_spatial_updates` table (chosen)

Create a new table `page_spatial_updates` with an identical schema to `page_updates`:

```sql
CREATE TABLE page_spatial_updates (
  id SERIAL PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id),
  index INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  encrypted_data BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_spatial_page_index ON page_spatial_updates(page_id, index);
```

- **Pros:**
  - Complete isolation between ProseMirror-only legacy data and spatial data.
  - Old clients never see spatial updates; new clients can query both tables.
  - Easy to backfill: legacy `page_updates` rows stay untouched.
- **Cons:**
  - Two tables to query during bootstrap.
  - Slightly more complex pagination (`?sinceIndex` needs to query both tables and merge).

### Option B — Version the payload inside `page_updates`

Add a `format_version` column (or a version byte inside the encrypted payload) to `page_updates`:

```sql
ALTER TABLE page_updates ADD COLUMN format_version INTEGER DEFAULT 1;
```

- `1` = ProseMirror-only (legacy)
- `2` = Page-level spatial doc

- **Pros:**
  - Single table; simpler schema.
  - Pagination remains straightforward.
- **Cons:**
  - Old clients that query `page_updates` directly (e.g., legacy app-server) may not understand `format_version`.
  - Encrypted payload must be decrypted to inspect version byte, which wastes CPU on irrelevant rows.
  - Harder to drop legacy rows later (no clean separation).

## Decision

**Adopt Option A (separate `page_spatial_updates` table).**

Rationale:
1. Clean separation prevents any chance of old clients misinterpreting spatial updates.
2. The bootstrap endpoint can query both tables, merge by `index`, and return a unified response — the complexity is isolated to one endpoint.
3. If we ever need to deprecate legacy ProseMirror-only pages, we can simply stop reading `page_updates` for spatial-enabled pages.

## Implementation Plan

1. **Schema change (Phase 3):**
   - Add `page_spatial_updates` table via Drizzle migration.
   - Add `performAppendPageSpatialCollabUpdate` and `performGetPageSpatialCollabUpdates` in `@deepnotes/session`.

2. **Bootstrap endpoint:**
   - `GET /api/pages/:pageId/collab-updates` currently reads `page_updates`.
   - After spatial launch, it will read **both** `page_updates` and `page_spatial_updates`, merge by `index`, and return unified rows.
   - The client applies all updates to a single `Y.Doc` (ProseMirror fragment + page-level maps coexist).

3. **Client-side handling:**
   - New pages use `createPageYDoc()` which has `page`, `notes`, `arrows` maps.
   - Legacy pages that only have ProseMirror updates will bootstrap into a doc with empty `page.noteIds` and `notes`/`arrows` maps, but the ProseMirror fragment will still be present.
   - **Routing decision (Phase 4):** If `/pages/:pageId` becomes the spatial canvas, the client must convert legacy single-note pages into spatial pages by creating a default note and migrating the ProseMirror content into `notes[defaultNoteId].head.value`.

4. **Backward compatibility:**
   - Legacy `page_updates` rows are **never modified**.
   - Legacy clients (old app-server) continue to read `page_updates` and work correctly.
   - New clients read both tables.

## Exit Criteria

- [x] Migration strategy documented.
- [ ] `page_spatial_updates` Drizzle migration created.
- [ ] `performAppendPageSpatialCollabUpdate` + `performGetPageSpatialCollabUpdates` implemented.
- [ ] Bootstrap endpoint merges both tables.
- [ ] 100 random legacy pages decrypt and bootstrap correctly after the change.
