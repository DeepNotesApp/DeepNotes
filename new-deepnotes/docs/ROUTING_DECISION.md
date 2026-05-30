# Routing Decision: `/pages/:pageId` as Spatial Canvas

> **Status:** Decided — Option A (spatial canvas at `/pages/:pageId`)  
> **Date:** 2026-05-30  
> **Context:** Phase 4 of RESTART_PLAN.md

## Problem

In the legacy DeepNotes app, a "page" is an **infinite spatial canvas** containing notes, arrows, and containers. The URL `/pages/:pageId` renders this canvas.

In the new SPA, `/pages/:pageId` currently renders a **single Tiptap rich-text card** (`PageEditorView.vue`), while `/spatial` is a separate stub route showing page pins. This redefines the product concept of "page" and breaks parity with legacy.

## Options

### Option A — `/pages/:pageId` becomes the spatial canvas (chosen)

- `/pages/:pageId` renders the full spatial canvas (`SpatialWorldCanvas.vue` + `DisplayNote` / `DisplayArrow` tree).
- The single-note Tiptap editor becomes a component **inside** the spatial canvas: it edits the active note's `head.value` Yjs fragment.
- `/spatial` is removed or redirected to `/pages/:pageId`.

**Pros:**
- Product parity with legacy; a "page" is a canvas.
- No URL migration for existing bookmarks and shared links.
- The Phase 3 page-level Yjs doc (`createPageYDoc`) is the natural data model for this route.

**Cons:**
- Requires completing Phase 6 (spatial canvas MVP) before `/pages/:pageId` is usable.
- During development, the text-only editor must be accessible at a temporary route (e.g., `/dev/pages/:pageId/text`).

### Option B — Keep `/pages/:pageId` as text-only, defer spatial canvas to v2

- `/pages/:pageId` continues to show the single-note editor.
- `/spatial` becomes the canvas route when Phase 6 is done.

**Pros:**
- Text editor ships earlier without waiting for Phase 6.
- Lower risk of breaking the existing editor flow during spatial development.

**Cons:**
- Legacy users visiting `/pages/:pageId` expect a canvas, not a single card.
- Existing shared links and bookmarks point to a different product concept.
- Two separate "page" concepts confuse users and complicate documentation.
- The Phase 3 page-level Yjs doc would be underutilized (only `/spatial` uses it).

## Decision

**Adopt Option A.**

`/pages/:pageId` will become the spatial canvas. This is a non-negotiable requirement for legacy parity. The text-only single-note editor is a stepping stone, not the final product.

## Implementation Plan

1. **Phase 5 completion:**
   - Keep the single-note editor functional at a temporary dev route (`/dev/pages/:pageId/text`).
   - Continue improving Tiptap extensions, snapshots, backlinks, and page management.

2. **Phase 6 transition:**
   - Replace `PageEditorView.vue` with a root `SpatialPageView.vue` that hosts the canvas.
   - Inside the canvas, the active note renders its head/body with the existing Tiptap editor component.
   - Delete `/spatial` stub route; redirect to `/pages/:pageId`.
   - Remove `/dev/pages/:pageId/text` dev route.

3. **Legacy page migration:**
   - Pages that only have ProseMirror updates in `page_updates` will be auto-converted on first open:
     - Create a default note in the page-level Yjs doc.
     - Migrate the ProseMirror content into `notes[defaultNoteId].head.value`.
   - Documented in `docs/COLLAB_DATA_MIGRATION.md` §3.

4. **URL compatibility:**
   - No URL changes required. `/pages/:pageId` continues to work for all existing bookmarks.
   - The only change is what UI renders at that URL.

## Exit Criteria

- [ ] `/pages/:pageId` renders an infinite canvas with draggable notes and arrows (Phase 6).
- [ ] `/spatial` returns 404 or redirects to `/pages/:pageId`.
- [ ] No route outside `features/spatial/` and `features/pages/` references spatial canvas components.
- [ ] All existing shared `/pages/:pageId` links load a canvas (not a 404 or blank editor).
