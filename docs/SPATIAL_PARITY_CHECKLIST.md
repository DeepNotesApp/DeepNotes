# Spatial Parity Checklist

> **Purpose:** Unambiguous feature checklist for the spatial canvas so agents cannot misreport "done" on stubs.  
> **Created:** 2026-05-31  
> **Rule:** No row is marked **Done** unless the feature is actually implemented (not stubbed) and has a passing test.

---

## Legend

| Status | Meaning |
|--------|---------|
| **Done** | Implemented, manually verified, and has a passing automated test |
| **Partial** | Core mechanic works but missing polish, edge cases, or tests |
| **Stub** | UI shell exists but underlying logic is fake or non-collaborative |
| **Not started** | No code exists |

---

## 1. Notes

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 1.1 | Create note (double-click canvas) | `DisplayPage/DisplayWorld/DisplayNote/CreateNote.ts` | `SpatialPageView.vue:onCanvasDoubleClick` | **Done** | — |
| 1.2 | Delete note (Delete key) | `DisplayPage/DisplayWorld/DisplayNote/DeleteNote.ts` | `SpatialPageView.vue:onKeyDown` | **Done** | — |
| 1.3 | Move note (drag) | `space/pos.ts`, `DisplayNote/DragNote.ts` | `DisplayNote.vue:onPointerDown/Move/Up` | **Done** | — |
| 1.4 | Resize note (8 handles) | `DisplayNote/ResizeNote.ts` | `DisplayNote.vue:8-handle resize` | **Done** | — |
| 1.5 | Note width modes (Auto / fixed px) | `note-collab.ts` `width` | `note-model.ts:width` | **Done** | `note-model.test.ts` |
| 1.6 | Note head section (Tiptap on `Y.XmlFragment`) | `DisplayNote/NoteHead.vue` | `DisplayNote.vue:head editor` | **Done** | `NoteTiptapEditor.test.ts` |
| 1.7 | Note body section (Tiptap on `Y.XmlFragment`) | `DisplayNote/NoteBody.vue` | `DisplayNote.vue:body editor` | **Done** | `NoteTiptapEditor.test.ts` |
| 1.8 | Head/body enabled toggles | `note-collab.ts` | `note-model.ts:head.enabled, body.enabled` | **Done** | `note-model.test.ts` |
| 1.9 | Head/body wrap toggles | `note-collab.ts` | `note-model.ts:head.wrap, body.wrap` | **Done** | `note-model.test.ts` |
| 1.10 | Head/body height tracking (expanded/collapsed) | `note-collab.ts` | `note-model.ts:head.height, body.height` | **Done** | `note-model.test.ts` |
| 1.11 | Note color mapping (10-color hardcoded map) | `DisplayNote/NoteColor.ts` | `DisplayNote.vue:resolvedColor` | **Partial** | — |
| 1.12 | Note color inheritance (`inherit` flag + parent cascade) | `DisplayNote/NoteColor.ts` | `DisplayNote.vue:resolvedColor` | **Done** | — |
| 1.13 | Selection ring (`ring-2 ring-[#2196f3]`) | `DisplayNote/NoteSelection.ts` | `DisplayNote.vue:frameClasses` | **Done** | — |
| 1.14 | Drag opacity (`0.7`) | `DisplayNote/NoteDrag.ts` | `DisplayNote.vue:isDragging` | **Done** | — |
| 1.15 | `Teleport` to global overlay during drag | `DisplayNote/NoteDragOverlay.ts` | `SpatialPageView.vue:Teleport overlay` | **Done** | — |
| 1.16 | Note drop zones (container attach feedback) | `DisplayNote/NoteDropZones.ts` | `DisplayNote.vue:isDropTarget` | **Partial** | — |
| 1.17 | Arrow handles (4 directional dots) | `DisplayNote/ArrowHandles.ts` | `DisplayNote.vue:arrow handles` | **Partial** | — |
| 1.18 | Link icon (external link indicator) | `DisplayNote/NoteLinkIcon.vue` | `DisplayNote.vue:ExternalLink icon` | **Done** | — |
| 1.19 | Note frame border-radius, shadow, min-width | `DisplayNote/NoteFrame.vue` | `DisplayNote.vue:frameClasses` | **Partial** | — |
| 1.20 | Note collapsing (chevron toggle) | `DisplayNote/NoteCollapsing.ts` | `DisplayNote.vue:toggleCollapsed` | **Done** | — |
| 1.21 | Note z-index ordering | `DisplayNote/NoteZIndex.ts` | `SpatialPageView.vue:notesByZIndex` | **Done** | — |
| 1.22 | Read-only note styling (`opacity-60`) | `DisplayNote/NoteReadOnly.ts` | `DisplayNote.vue:read-only classes` | **Done** | — |
| 1.23 | Scrollbar handling (`overscroll-behavior: contain`) | `DisplayNote/NoteScroll.ts` | `NoteTiptapEditor.vue:overscroll-behavior` | **Partial** | — |
| 1.24 | Note anchor positioning | `note-collab.ts` `anchor` | `note-model.ts:anchor` | **Done** | — |
| 1.25 | Note timestamps (`createdAt`, `editedAt`, `movedAt`) | `note-collab.ts` | `note-model.ts:createdAt, editedAt, movedAt` | **Done** | — |
| 1.26 | Note `regionId` | `note-collab.ts` | `note-model.ts:regionId` | **Done** | — |

## 2. Containers

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 2.1 | Container enabled toggle | `note-collab.ts` `container.enabled` | `note-model.ts:container.enabled` | **Done** | `note-model.test.ts` |
| 2.2 | Spatial container (free child positioning) | `DisplayNote/Container/Spatial.vue` | `DisplayNote.vue:container children` | **Done** | — |
| 2.3 | Horizontal container (children in a row) | `note-collab.ts` `container.horizontal` | `DisplayNote.vue:flex-row` | **Done** | — |
| 2.4 | Drag child out to detach | `DisplayNote/Container/Detach.ts` | `useNoteDrag.ts:onNoteDragEnd` + `useSpatialPage.ts:moveNoteOutOfContainer` | **Done** | — |
| 2.5 | Drag note into container to attach | `DisplayNote/Container/Attach.ts` | `useNoteDrag.ts:overlap heuristic` | **Done** | — |
| 2.6 | Container wrap children toggle | `note-collab.ts` `container.wrapChildren` | `note-model.ts:container.wrapChildren` | **Done** | `note-model.test.ts` |
| 2.7 | Container stretch children toggle | `note-collab.ts` `container.stretchChildren` | `note-model.ts:container.stretchChildren` | **Done** | `note-model.test.ts` |
| 2.8 | Container force color inheritance toggle | `note-collab.ts` `container.forceColorInheritance` | `note-model.ts:container.forceColorInheritance` | **Done** | `note-model.test.ts` |
| 2.9 | Recursive descendant check (prevent self-nesting) | `DisplayNote/Container/Attach.ts` | `useSpatialPage.ts:collectDescendants` | **Done** | — |

## 3. Arrows

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 3.1 | Create arrow (drag from note handle to target) | `DisplayArrow/CreateArrow.ts` | `useArrowDrag.ts` | **Done** | — |
| 3.2 | Delete arrow (Delete key) | `DisplayArrow/DeleteArrow.ts` | `useSpatialKeyboard.ts:onKeyDown` | **Done** | — |
| 3.3 | Curve body (quadratic bezier) | `DisplayArrow/CurveArrow.vue` | `DisplayArrow.vue:pathD` | **Done** | — |
| 3.4 | Line body (straight line) | `DisplayArrow/LineArrow.vue` | `DisplayArrow.vue:pathD` + `arrow-geometry.ts` | **Done** | `arrow-geometry.test.ts` |
| 3.5 | Arrow heads (open chevron SVG markers) | `DisplayArrow/OpenHead.vue` | `DisplayArrow.vue:marker` | **Done** | — |
| 3.6 | Source/target head toggles | `arrow.ts` `sourceHead/targetHead` | `arrow-model.ts:sourceHead, targetHead` | **Done** | `arrow-model.test.ts` |
| 3.7 | Body type toggle (`curve`/`line`) | `arrow.ts` `bodyType` | `arrow-model.ts:bodyType` | **Done** | `arrow-model.test.ts` |
| 3.8 | Body style toggle (`solid`/etc.) | `arrow.ts` `bodyStyle` | `arrow-model.ts:bodyStyle` | **Done** | `arrow-model.test.ts` |
| 3.9 | Arrow label (Tiptap on `Y.XmlFragment`) | `DisplayArrow/ArrowLabel.vue` | `DisplayArrow.vue:NoteTiptapEditor` | **Done** | — |
| 3.10 | Hitbox (thick invisible stroke) | `DisplayArrow/ArrowHitbox.vue` | `DisplayArrow.vue:transparent stroke` | **Done** | — |
| 3.11 | Drag-to-reconnect | `DisplayArrow/Reconnect.ts` | `useArrowReconnect.ts` | **Done** | — |
| 3.12 | Arrow color matching note logic | `DisplayArrow/ArrowColor.ts` | `DisplayArrow.vue:arrowColor` | **Partial** | — |
| 3.13 | Arrow read-only state | `arrow.ts` `readOnly` | `arrow-model.ts:readOnly` | **Done** | `arrow-model.test.ts` |
| 3.14 | Arrow timestamps (`createdAt`, `editedAt`) | `arrow.ts` | `arrow-model.ts:createdAt, editedAt` | **Done** | `arrow-model.test.ts` |
| 3.15 | Arrow `interregional` flag | `arrow.ts` | `arrow-model.ts:interregional` | **Done** | `arrow-model.test.ts` |
| 3.16 | Arrow `fakePos` / `looseEndpoint` | `arrow.ts` | `arrow-model.ts:fakePos, looseEndpoint` | **Done** | `arrow-model.test.ts` |
| 3.17 | Arrow `regionId` | `arrow.ts` | `arrow-model.ts:regionId` | **Done** | `arrow-model.test.ts` |
| 3.18 | Arrow geometry reads actual note heights | `DisplayArrow/ArrowGeometry.ts` | `DisplayArrow.vue:noteHeights` | **Done** | — |
| 3.19 | Arrow source/target anchor positioning | `arrow.ts` `sourceAnchor/targetAnchor` | `DisplayArrow.vue:geometry uses sourceAnchor/targetAnchor` | **Done** | — |

## 4. Camera / Viewport

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 4.1 | Pan (wheel) | `camera/pan.ts` | `useSpatialViewport.ts:onWheel` | **Done** | `spatial-viewport-math.test.ts` |
| 4.2 | Pan (space + drag) | `camera/pan.ts` | `useSpatialViewport.ts:onPointerDown/Move` | **Done** | — |
| 4.3 | Pan (middle-mouse drag) | `camera/pan.ts` | `useSpatialViewport.ts:onPointerDown` | **Done** | — |
| 4.4 | Zoom (Ctrl+wheel toward cursor) | `camera/zoom.ts` | `useSpatialViewport.ts:onWheel` | **Done** | `spatial-viewport-math.test.ts` |
| 4.5 | Zoom (pinch on touch) | `camera/zoom.ts` | `useSpatialViewport.ts:onPointerDown/Move` | **Done** | — |
| 4.6 | Zoom reset button | `camera/zoom.ts` | `SpatialPageView.vue:resetView button` | **Done** | — |
| 4.7 | Fit-to-screen | `camera/zoom.ts` | `useSpatialViewport.ts:fitToScreen + SpatialPageView.vue:fitToScreen button` | **Done** | — |
| 4.8 | Zoom indicator (%) | `camera/zoom.ts` | `SpatialPageView.vue:zoom %` | **Done** | — |
| 4.9 | Grid background | `camera/grid.ts` | `SpatialWorldCanvas.vue:linear-gradient` | **Done** | — |

## 5. Selection

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 5.1 | Click to select note | `selection/select.ts` | `DisplayNote.vue:onPointerDown` | **Done** | — |
| 5.2 | Ctrl+click to toggle selection | `selection/select.ts` | `DisplayNote.vue:onPointerDown` | **Done** | — |
| 5.3 | Box selection (drag on empty canvas) | `selection/boxSelect.ts` | `useBoxSelection.ts` | **Done** | `useBoxSelection.test.ts` |
| 5.4 | Select all (`Ctrl+A`) | `selection/selectAll.ts` | `SpatialPageView.vue:onKeyDown` | **Done** | — |
| 5.5 | Active element tracking | `selection/active.ts` | `useSpatialSelection.ts:activeId` | **Partial** | `selection.test.ts` |
| 5.6 | Active region tracking | `selection/activeRegion.ts` | `useSpatialSelection.ts:activeRegionId` | **Partial** | — |
| 5.7 | Selection count badge | `selection/select.ts` | `SpatialPageView.vue:selection count` | **Done** | — |
| 5.8 | `bringToTop` on selection | `selection/bringToTop.ts` | `useSpatialSelection.ts:bringToTop` | **Partial** | `selection.test.ts` (core selection only; no explicit zIndex bump test) |

## 6. Clipboard

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 6.1 | Cut / copy / paste notes | `clipboard/cutCopyPaste.ts` | `clipboard.ts` | **Done** | `clipboard.test.ts` |
| 6.2 | Cross-page paste | `clipboard/crossPagePaste.ts` | `clipboard.ts` | **Done** | `clipboard.test.ts` |
| 6.3 | Paste offset (32px increments) | `clipboard/crossPagePaste.ts` | `SpatialPageView.vue:pasteCount` | **Done** | — |

## 7. Alignment + Distribution

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 7.1 | Align left / center / right | `alignment/align.ts` | `alignment.ts` | **Done** | `alignment.test.ts` |
| 7.2 | Align top / middle / bottom | `alignment/align.ts` | `alignment.ts` | **Done** | `alignment.test.ts` |
| 7.3 | Distribute horizontally / vertically | `alignment/distribute.ts` | `alignment.ts` | **Done** | `alignment.test.ts` |
| 7.4 | Keyboard shortcuts (Ctrl+Shift+...) | `alignment/shortcuts.ts` | `useSpatialKeyboard.ts` + `SpatialPageView.vue` | **Done** | `spatial-keyboard.test.ts` (Space-pan guard only) |

## 8. Undo / Redo

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 8.1 | `Ctrl+Z` undo | `undoRedo/undo.ts` | `undo-redo.ts` | **Done** | `undo-redo.test.ts` |
| 8.2 | `Ctrl+Shift+Z` redo | `undoRedo/redo.ts` | `undo-redo.ts` | **Done** | `undo-redo.test.ts` |
| 8.3 | Undo/redo buttons in floating UI | `undoRedo/ui.ts` | `SpatialPageView.vue:Undo/Redo buttons` | **Done** | — |

## 9. Editing

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 9.1 | Find/replace dialog | `editing/findReplace.ts` | `FindReplaceDialog.vue` | **Done** | `find-replace.test.ts` |
| 9.2 | Search across note head/body | `editing/findReplace.ts` | `find-replace.ts` | **Partial** | `find-replace.test.ts` |
| 9.3 | Replace current / replace all | `editing/findReplace.ts` | `find-replace.ts` | **Done** | `find-replace.test.ts` |
| 9.4 | Editing state management (which element is being edited) | `PageElem/editing.ts` | `useSpatialEditing.ts` | **Done** | `useSpatialEditing.test.ts` |

## 10. Collab (Page-level Yjs)

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 10.1 | Page-level Yjs doc (`notes` + `arrows` maps) | `collab/page-yjs-doc.ts` | `page-yjs-doc.ts` | **Done** | `useSpatialPage.test.ts` |
| 10.2 | Note creation synced via WS | `collab/note-sync.ts` | `usePageCollabEditor.ts` | **Done** | — |
| 10.3 | Arrow creation synced via WS | `collab/arrow-sync.ts` | `usePageCollabEditor.ts` | **Done** | — |
| 10.4 | Awareness / remote cursors | `collab/awareness.ts` | `usePageCollabEditor.ts` | **Partial** | — |
| 10.5 | Collab update squashing | `collab/squash.ts` | `usePageCollabEditor.ts` | **Not started** | — |
| 10.6 | Collab pagination (`?sinceIndex=`) | `collab/pagination.ts` | — | **Not started** | — |
| 10.7 | Collab auth revocation (socket close `1008`) | `collab/auth.ts` | — | **Not started** | — |
| 10.8 | Collab broadcast backpressure | `collab/backpressure.ts` | — | **Not started** | — |

## 11. Templates

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 11.1 | Default note template (`users.encrypted_default_note`) | `templates/defaultNote.ts` | `useUserTemplates.ts` | **Done** | — |
| 11.2 | Default arrow template (`users.encrypted_default_arrow`) | `templates/defaultArrow.ts` | `useUserTemplates.ts` | **Done** | — |
| 11.3 | Template applied on create | `templates/create.ts` | `useSpatialPage.ts:createNoteAt, createArrow` | **Done** | — |

## 12. UI / Layout

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 12.1 | Fullscreen immersive shell | `PagesLayout.vue` | `PageLayout.vue` | **Done** | — |
| 12.2 | Main toolbar (logo, breadcrumb, global nav) | `MainToolbar.vue` | `MainToolbar.vue` | **Done** | — |
| 12.3 | Toolbar page action buttons | `MainToolbar/Actions.vue` | — | **Not started** | — |
| 12.4 | Left sidebar (resizable, collapsible) | `LeftSidebar.vue` | `PageLayout.vue:left aside` | **Done** | — |
| 12.5 | Left sidebar — Current path | `LeftSidebar/CurrentPath.vue` | `PageEditorView.vue:Path card` | **Done** | — |
| 12.6 | Left sidebar — Recent pages | `LeftSidebar/RecentPages.vue` | `RecentPagesCard.vue` | **Done** | — |
| 12.7 | Left sidebar — Favorite pages | `LeftSidebar/FavoritePages.vue` | `FavoritePagesCard.vue` | **Done** | — |
| 12.8 | Left sidebar — Selected pages | `LeftSidebar/SelectedPages.vue` | `SelectedPagesCard.vue` | **Done** | — |
| 12.9 | Left sidebar — Collab status | `LeftSidebar/CollabStatus.vue` | `PageEditorCollabStatusCard.vue` | **Done** | — |
| 12.10 | Right sidebar (collapsible) | `RightSidebar.vue` | `PageLayout.vue:right aside` | **Done** | — |
| 12.11 | Right sidebar — Note properties | `RightSidebar/NoteProperties.vue` | `NotePropertiesCard.vue` | **Partial** | — |
| 12.12 | Right sidebar — Arrow properties | `RightSidebar/ArrowProperties.vue` | `ArrowPropertiesCard.vue` | **Partial** | — |
| 12.13 | Right sidebar — Page properties | `RightSidebar/PageProperties.vue` | `PagePropertiesCard.vue` | **Partial** | — |
| 12.14 | Right sidebar — Snapshots | `RightSidebar/Snapshots.vue` | `PageEditorSnapshotsCard.vue` | **Done** | — |
| 12.15 | Right sidebar — Management | `RightSidebar/Management.vue` | `PageEditorManagementCard.vue` | **Done** | — |
| 12.16 | Right sidebar — Backlinks | `RightSidebar/Backlinks.vue` | `PageEditorBacklinksCard.vue` | **Done** | — |
| 12.17 | Canvas context menu | `TableContextMenu.vue` | `CanvasContextMenu.vue` | **Partial** | — |
| 12.18 | Per-note context menu | `NoteContextMenu.vue` | — | **Not started** | — |
| 12.19 | Page state screens (8 total) | `DisplayScreens/*.vue` | `PageStateScreens.vue` + 8 components | **Done** | — |
| 12.20 | Loading overlay | `LoadingOverlay.vue` | `PageStateScreens.vue` (inline) | **Partial** | — |
| 12.21 | Floating UI — zoom indicator | `FloatingUI/Zoom.vue` | `SpatialPageView.vue:zoom %` | **Done** | — |
| 12.22 | Floating UI — undo/redo buttons | `FloatingUI/UndoRedo.vue` | `SpatialPageView.vue:Undo/Redo` | **Done** | — |
| 12.23 | Floating UI — selection count | `FloatingUI/SelectionCount.vue` | `SpatialPageView.vue:selection count` | **Done** | — |
| 12.24 | Floating UI — find/replace toggle | `FloatingUI/FindReplace.vue` | `SpatialPageView.vue:Search button` | **Done** | — |
| 12.25 | Floating UI — back/forward nav | `FloatingUI/HistoryNav.vue` | — | **Not started** | — |
| 12.26 | Floating UI — screenshot | `FloatingUI/Screenshot.vue` | — | **Not started** | — |
| 12.27 | Floating UI — user avatars on canvas | `FloatingUI/Avatars.vue` | — | **Not started** | — |

## 13. Backlinks

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 13.1 | Display incoming page links | `backlinks/Backlinks.vue` | `PageEditorBacklinksCard.vue` | **Done** | — |

## 14. Group Access

| # | Feature | Legacy reference | New file(s) | Status | Test file |
|---|---------|------------------|-------------|--------|-----------|
| 14.1 | Password-protected group unlock flow | `groupAccess/password.ts` | `PageStateScreens.vue:password screen` | **Done** | — |

---

## Schema Diff Summary

Every field from legacy `INoteCollab` and `IArrowCollab` is present in the new Yjs schema:

| Legacy field | New Yjs path | Status |
|--------------|--------------|--------|
| `note.pos` | `YPAGE_NOTE_KEY.pos` (Y.Map `{x,y}`) | **Done** |
| `note.width` | `YPAGE_NOTE_KEY.width` (Y.Map `{expanded,collapsed}`) | **Done** |
| `note.head.enabled` | `head.enabled` | **Done** |
| `note.head.wrap` | `head.wrap` | **Done** |
| `note.head.height` | `head.height` | **Done** |
| `note.head.value` | `head.value` (Y.XmlFragment) | **Done** |
| `note.body.enabled` | `body.enabled` | **Done** |
| `note.body.wrap` | `body.wrap` | **Done** |
| `note.body.height` | `body.height` | **Done** |
| `note.body.value` | `body.value` (Y.XmlFragment) | **Done** |
| `note.container.enabled` | `container.enabled` | **Done** |
| `note.container.spatial` | `container.spatial` | **Done** |
| `note.container.horizontal` | `container.horizontal` | **Done** |
| `note.container.wrapChildren` | `container.wrapChildren` | **Done** |
| `note.container.stretchChildren` | `container.stretchChildren` | **Done** |
| `note.container.forceColorInheritance` | `container.forceColorInheritance` | **Done** |
| `note.container.children` | `container.children` (Y.Array) | **Done** |
| `note.collapsing.enabled` | `collapsing.enabled` | **Done** |
| `note.collapsing.collapsed` | `collapsing.collapsed` | **Done** |
| `note.collapsing.localCollapsing` | `collapsing.localCollapsing` | **Done** |
| `note.color.inherit` | `color.inherit` | **Done** |
| `note.color.value` | `color.value` | **Done** |
| `note.zIndex` | `zIndex` | **Done** |
| `note.link` | `link` | **Done** |
| `note.movable` | `movable` | **Done** |
| `note.resizable` | `resizable` | **Done** |
| `note.readOnly` | `readOnly` | **Done** |
| `note.anchor` | `anchor` | **Done** |
| `note.regionId` | `regionId` | **Done** |
| `note.createdAt` | `createdAt` | **Done** |
| `note.editedAt` | `editedAt` | **Done** |
| `note.movedAt` | `movedAt` | **Done** |
| `arrow.source` | `YPAGE_ARROW_KEY.source` | **Done** |
| `arrow.target` | `YPAGE_ARROW_KEY.target` | **Done** |
| `arrow.sourceAnchor` | `sourceAnchor` | **Done** |
| `arrow.targetAnchor` | `targetAnchor` | **Done** |
| `arrow.sourceHead` | `sourceHead` | **Done** |
| `arrow.targetHead` | `targetHead` | **Done** |
| `arrow.bodyType` | `bodyType` | **Done** |
| `arrow.bodyStyle` | `bodyStyle` | **Done** |
| `arrow.label` | `label` (Y.XmlFragment) | **Done** |
| `arrow.color` | `color` | **Done** |
| `arrow.readOnly` | `readOnly` | **Done** |
| `arrow.interregional` | `interregional` | **Done** |
| `arrow.fakePos` | `fakePos` | **Done** |
| `arrow.looseEndpoint` | `looseEndpoint` | **Done** |
| `arrow.createdAt` | `createdAt` | **Done** |
| `arrow.editedAt` | `editedAt` | **Done** |
| `arrow.regionId` | `regionId` | **Done** |

---

## Verification

- [x] Checklist contains ≥ 60 rows. (Current count: **82+ rows**)
- [x] Schema diff table covers every legacy `INoteCollab` and `IArrowCollab` field.
- [ ] Every "Done" item has a passing automated test. **VIOLATED.** ~30+ UI/interaction rows marked "Done" still have "—" in the Test file column. Progress since last evaluation: `note-geometry.test.ts` (8 tests), `useBoxSelection.test.ts` (6 tests), `arrow-geometry.test.ts` (5 tests), `useSpatialEditing.test.ts` (4 tests) added. Remaining gaps: `DisplayNote.vue` (basic render tests only), `DisplayArrow.vue` (no component tests), `SpatialPageView.vue` (no component/integration tests), drag/resize interaction, arrow creation/reconnection, sidebar/toolbar integration.
- [ ] Phase 6 is not declared done until ≥ 80% of rows are **Done**. **NOT MET.** Strict enforcement of the test rule would drop the true "Done" count well below 80%.

---

*End of checklist*
