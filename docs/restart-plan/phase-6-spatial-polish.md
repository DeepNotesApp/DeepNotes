# Phase 6: Spatial canvas polish

> **Prerequisites:** Phase 5 done.  
> **Status:** Complete

---

## Goal

All remaining spatial interactions from the legacy checklist.

---

## Deliverables

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

6. **Immersive page layout and state screens**
   - Rebuild `PageEditorView.vue` as a full-screen spatial shell (no scrolling card stack):
     - `MainToolbar` (shadcn): breadcrumb path, zoom controls, undo/redo, share, find/replace toggle.
     - `LeftSidebar` (shadcn): Recent pages, Favorites, Selected elements, Current path.
     - `RightSidebar` (shadcn): Page properties, Snapshots, Management, Backlinks, Collab status — collapsible panels.
     - `TableContextMenu` (shadcn): right-click context menu on canvas.
     - `LoadingOverlay`: centered spinner during page bootstrap.
   - Global CSS for spatial routes: `user-select: none`, `overflow: hidden`, `touch-action: none`, `position: fixed` on body.
   - Dedicated fullscreen state screens replacing inline error cards:
     - `DisplayErrorScreen`, `DisplayNonExistentScreen`, `DisplayPageDeletedScreen`, `DisplayGroupDeletedScreen`, `DisplayInvitedScreen`, `DisplayRejectedScreen`, `DisplayUnauthorizedScreen`, `DisplayPasswordScreen`.
   - Remove `PageEditorTiptapCard.vue` from the page route. The Tiptap rich-text editor becomes the head/body editing surface inside `DisplayNote.vue` only.

7. **Note visual parity (legacy style, no Quasar)**
   - `DisplayNote.vue` must match legacy visual behavior using Tailwind/shadcn primitives:
     - Background color + border color from `note.color` (or hardcoded legacy color map), with subtle transparency (`/10` tint or legacy equivalent).
     - Selection ring: `ring-2 ring-primary` or legacy blue `#2196f3`.
     - Drag opacity: `0.7` during drag/resize.
     - `Teleport` to a global `.display-overlay` during drag/resize to avoid parent clipping.
     - `NoteDropZones`: invisible zones on container notes for drag-to-attach.
     - `NoteArrowHandles`: 4 directional handles on selected notes to initiate arrow creation.
     - `ArrowLinkZones`: zones on note edges for arrow reconnection.
     - `NoteLinkIcon`: external-link indicator when `link.url` is set.
     - `NoteResizeHandles`: 8 handles (nw, n, ne, e, se, s, sw, w) with correct cursors.
     - Scrollbar handling in `NoteContent`: allow touch scroll inside notes, prevent pull-to-refresh on body.
     - Note frame `border-radius` (`rounded-md` or legacy `7px`), shadow, and min-width matching legacy.
   - Container section: spatial and horizontal layouts with correct child note positioning and offset math.

8. **Arrow visual parity (legacy style, no Quasar)**
   - `DisplayArrow.vue` must support:
     - **Curve body** (`CurveArrow.vue`) and **line body** (`LineArrow.vue`).
     - **Arrow heads**: `OpenHead.vue` at source/target with rotation.
     - **Arrow label**: editable `Y.XmlFragment` rendered as an SVG `foreignObject` or HTML overlay positioned along the curve.
     - **Hitbox**: invisible thick stroke (`stroke-width: 20`, `stroke-opacity: 0`) for easy grabbing.
     - Drag-to-reconnect: grab an arrow endpoint and drop it onto another note.
     - Color matching note color logic.
   - All arrow SVG must use `overflow: visible` and absolute positioning within the world coordinate system.

9. **Find and replace**
   - Search across all note head/body text.
   - Replace text.

10. **Visual polish**
    - Grid background.
    - Note color inheritance.
    - Collapsing notes.
    - Z-index ordering.
    - Read-only notes.

---

## Verification

- Each deliverable has a test (unit, component, or integration).
- Phase 1 checklist is >80% marked done.

---

## Exit criteria

- [ ] Phase 1 checklist ≥ 80% complete.
- [ ] No "P1" checklist item remains open.
- [ ] `PageEditorView.vue` renders as a full-screen immersive shell (no scrolling card page).
- [ ] All 8 dedicated page-state screens exist and are reachable (error, nonexistent, deleted, group-deleted, invited, rejected, unauthorized, password).
- [ ] `DisplayNote.vue` matches legacy note visuals: colors, borders, selection ring, drag opacity, Teleport overlay, drop zones, arrow handles, link icon, 8 resize handles.
- [ ] `DisplayArrow.vue` supports curve + line bodies, arrow heads, labels, hitboxes, and drag-to-reconnect.
- [ ] `MainToolbar`, `LeftSidebar`, `RightSidebar`, and `TableContextMenu` are implemented with shadcn and visible on `/pages/:pageId`.
- [ ] Manual QA session with 3+ users finds no blocking usability issues.
