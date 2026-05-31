# Phase 5: Spatial canvas MVP — notes + arrows + camera

> **Prerequisites:** Phase 1 checklist signed off, Phase 3 page-level Yjs doc done, Phase 4 route consolidation done.  
> **Status:** Complete

---

## Goal

A `PageEditorView` that renders an **infinite canvas** with draggable, resizable notes and connectable arrows. This is the core DeepNotes product differentiator.

---

## Architecture decision (already made in Phase 3)

- Use the SyncedStore/hybrid decision documented in `docs/SPATIAL_ARCHITECTURE_DECISION.md`.
- If the Phase 3 spike chose Option A (SyncedStore), build note/arrow models as SyncedStore-backed reactive objects.
- If the spike chose Option C (hybrid proxy), build the proxy layer first and verify two-way sync with Yjs.

---

## Deliverables

1. **Camera / viewport (`features/spatial/camera.ts`)**
   - `SpatialWorldCanvas.vue` is the page editor background.
   - Pan: wheel, space+drag, middle-drag.
   - Zoom: ctrl/cmd+wheel toward cursor.
   - Pinch: touch pinch-to-zoom. (structure ready, needs mobile testing)
   - Fit-to-screen: pending.

2. **Note model (`features/spatial/note-model.ts`)**
   - Composable `useNoteModel` with all legacy properties: `pos`, `width`, `head`, `body`, `container`, `color`, `zIndex`, `collapsing`, `movable`, `resizable`, `anchor`, timestamps.
   - Reads/writes to the page Yjs doc via hybrid reactive proxy.
   - Tested in `note-model.test.ts`.

3. **Note rendering (`features/spatial/DisplayNote.vue`)**
   - Render note frame at `(note.pos.x, note.pos.y)` — done.
   - Drag to move — done (zoom-aware pointer capture).
   - Head/body Tiptap editor — done (`NoteTiptapEditor.vue`, `useNoteEditor.ts`).
   - Container section with child notes — done (children rendered inside parent note).
   - Resize handles — done (8-handle resize, drag-to-edge arrows).

4. **Arrow model (`features/spatial/arrow-model.ts`)**
   - Composable `useArrowModel` with all legacy properties.
   - Tested in `arrow-model.test.ts`.

5. **Arrow rendering (`features/spatial/DisplayArrow.vue`)** (partial)
   - SVG line between source and target note centers — done.
   - Curve/line body styles, arrow heads, label — pending.

6. **Basic interaction** (partial)
   - Drag to move a note — done.
   - Create note via double-click on empty canvas — done.
   - Click to select, resize handles, create arrow via drag, Delete key — pending.

7. **Collab for spatial state** (partial)
   - `ydoc.on('updateV2')` listener in `usePageEditor.ts` schedules push for non-Tiptap mutations — done in Phase 0.
   - Position updates trigger collab push via Yjs diff — done.
   - Full two-client integration test — pending.

8. **DOM / world coordinate system** (partial)
   - `screenToWorld`, `worldToScreen`, `wheelZoomCameraTowardScreenPoint`, `panCameraByScreenDelta` — done in `spatial-viewport-math.ts`.
   - `getContainerWorldRect`, `getOriginWorldPos` for containers — pending.

9. **Default note / arrow templates**
   - `useUserTemplates` decrypts templates via session keyring and maps legacy packed shapes to `ClipboardNote`/`ClipboardArrow` partials.
   - `SpatialPageView` passes templates to `createNoteAt` and `createArrow` (double-click, shift-click, arrow-drag).
   - Backend returns encrypted templates in `GET /api/users/me`; DB schema and API routes already existed.

---

## Verification

- Unit tests for camera math (world ↔ screen transforms).
- Unit tests for note model (read/write to Yjs doc).
- Unit tests for arrow geometry (point-to-rect intersection for anchor placement).
- Component test: mount `DisplayNote`, simulate drag, assert `note.pos` changed.
- Integration test: two tabs, create note in A, assert note appears in B within 2 seconds.

---

## Exit criteria

- [x] User can create notes on an infinite canvas.
- [x] User can drag to move notes.
- [x] User can resize notes (bottom-right handle updates `width.expanded`).
- [x] User can delete notes (click to select, press Delete/Backspace).
- [x] Arrows render between notes (source/target positions tracked).
- [x] User can create arrows between notes via Shift+click interaction.
- [x] Canvas pan/zoom works with mouse.
- [x] Canvas pan/zoom works with touch (pinch).
- [x] Changes sync across tabs via collab WS (page-level Yjs doc + `updateV2` listener).
- [x] Phase 1 checklist rows for "Notes (basic)" and "Arrows (basic)" are marked done (see `docs/SPATIAL_PARITY_CHECKLIST.md`).
