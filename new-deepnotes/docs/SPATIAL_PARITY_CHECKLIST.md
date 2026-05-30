# Spatial Parity Checklist

> **Status:** Inventory complete — 69 rows covering all legacy `DisplayWorld` components. Ready for review.
> **Goal:** Every row must have a passing test before it is marked done. Stubs do not count as done.

---

## 1. Notes

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 1.1 | Create note (double-click / button) | `code/pages/page/notes/notes.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.2 | Delete note (`Delete` key) | `code/pages/page/elems/deleting.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.3 | Move note (drag) | `code/pages/page/notes/dragging.ts` | `features/spatial/note-model.ts` | `note-model.test.ts`, `DisplayNote.vue` comp. test | ⬜ |
| 1.4 | Resize note (8 handles) | `code/pages/page/notes/resizing.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.5 | Clone note | `code/pages/page/notes/cloning.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.6 | Align notes (left/center/right/top/middle/bottom) | `code/pages/page/notes/aligning.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.7 | Distribute notes (horizontal/vertical) | `code/pages/page/notes/aligning.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.8 | Note head section (Tiptap, enabled, height, wrap) | `code/pages/page/notes/note-collab.ts` | `features/spatial/DisplayNote.vue` | `DisplayNote.test.ts` | ⬜ |
| 1.9 | Note body section (Tiptap, enabled, height, wrap) | `code/pages/page/notes/note-collab.ts` | `features/spatial/DisplayNote.vue` | `DisplayNote.test.ts` | ⬜ |
| 1.10 | Container section (enabled, spatial, horizontal) | `code/pages/page/notes/note-collab.ts` | `features/spatial/DisplayNote.vue` | `DisplayNote.test.ts` | ⬜ |
| 1.11 | Container wrap/stretch children | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.12 | Container force color inheritance | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.13 | Note collapsing (enabled, collapsed, localCollapsing) | `code/pages/page/notes/note-collab.ts` | `features/spatial/DisplayNote.vue` | `DisplayNote.test.ts` | ⬜ |
| 1.14 | Note color (inherit, value) | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.15 | Note link | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.16 | Note z-index | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.17 | Note anchor (x,y) | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.18 | Note width (expanded, collapsed) | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.19 | Note createdAt / editedAt / movedAt | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 1.20 | Note movable / resizable / readOnly | `code/pages/page/notes/note-collab.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |

---

## 2. Arrows

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 2.1 | Create arrow (drag from note edge) | `code/pages/page/arrows/arrow-creation.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.2 | Delete arrow | `code/pages/page/elems/deleting.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.3 | Source / target anchors | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.4 | Source / target head styles | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.5 | Body type (curve / line) | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.6 | Body style (solid / dashed / etc.) | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.7 | Arrow label (Tiptap Y.XmlFragment) | `code/pages/page/arrows/arrow.ts` | `features/spatial/DisplayArrow.vue` | `DisplayArrow.test.ts` | ⬜ |
| 2.8 | Arrow color | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.9 | Arrow readOnly | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.10 | Interregional flag | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.11 | fakePos / looseEndpoint | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.12 | Arrow createdAt / editedAt | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |
| 2.13 | Interregional arrow rendering | `layouts/.../DisplayWorld/InterregionalArrows.vue` | `features/spatial/DisplayArrow.vue` | `DisplayArrow.test.ts` | ⬜ |

---

## 3. Camera / Viewport

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 3.1 | Pan (wheel) | `code/pages/page/camera/panning.ts` | `features/spatial/camera.ts` | `camera.test.ts` | ⬜ |
| 3.2 | Pan (space + drag) | `code/pages/page/camera/panning.ts` | `features/spatial/camera.ts` | `camera.test.ts` | ⬜ |
| 3.3 | Pan (middle-drag) | `code/pages/page/camera/panning.ts` | `features/spatial/camera.ts` | `camera.test.ts` | ⬜ |
| 3.4 | Zoom (ctrl/cmd + wheel toward cursor) | `code/pages/page/camera/zooming.ts` | `features/spatial/camera.ts` | `camera.test.ts` | ⬜ |
| 3.5 | Pinch (touch) | `code/pages/page/camera/pinching.ts` | `features/spatial/camera.ts` | `camera.test.ts` | ⬜ |
| 3.6 | Fit-to-screen | `code/pages/page/camera/camera.ts` | `features/spatial/camera.ts` | `camera.test.ts` | ⬜ |
| 3.7 | World/client coordinate transforms | `code/pages/page/space/pos.ts` | `features/spatial/camera.ts` | `spatial-viewport-math.test.ts` (exists) | ⬜ |
| 3.8 | Rect math (DOM/world) | `code/pages/page/space/rects.ts` | `features/spatial/camera.ts` | `camera.test.ts` | ⬜ |
| 3.9 | Size helpers | `code/pages/page/space/sizes.ts` | `features/spatial/camera.ts` | `camera.test.ts` | ⬜ |
| 3.10 | Grid background | `layouts/.../DisplayWorld/DisplayGrid.vue` | `features/spatial/SpatialWorldCanvas.vue` | `SpatialWorldCanvas.test.ts` | ⬜ |
| 3.11 | Canvas background | `layouts/.../DisplayWorld/DisplayBackground.vue` | `features/spatial/SpatialWorldCanvas.vue` | `SpatialWorldCanvas.test.ts` | ⬜ |
| 3.12 | DOM + SVG rendering layers | `layouts/.../DisplayWorld/DOMDisplay.vue`, `SVGDisplay.vue` | `features/spatial/SpatialWorldCanvas.vue` | `SpatialWorldCanvas.test.ts` | ⬜ |

---

## 4. Selection

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 4.1 | Click to select note | `code/pages/page/selection/click-selection.ts` | `features/spatial/selection.ts` | `selection.test.ts` | ⬜ |
| 4.2 | Box selection (drag on empty canvas) | `code/pages/page/selection/box-selection.ts` | `features/spatial/selection.ts` | `selection.test.ts` | ⬜ |
| 4.3 | Multi-select (ctrl/cmd + click) | `code/pages/page/selection/selection.ts` | `features/spatial/selection.ts` | `selection.test.ts` | ⬜ |
| 4.4 | Select all (`Ctrl+A`) | `code/pages/page/selection/selection.ts` | `features/spatial/selection.ts` | `selection.test.ts` | ⬜ |
| 4.5 | Active element tracking | `code/pages/page/selection/active-elem.ts` | `features/spatial/selection.ts` | `selection.test.ts` | ⬜ |
| 4.6 | Active region tracking | `code/pages/page/selection/active-region.ts` | `features/spatial/selection.ts` | `selection.test.ts` | ⬜ |

---

## 5. Clipboard

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 5.1 | Cut notes/arrows | `code/pages/page/elems/clipboard.ts` | `features/spatial/clipboard.ts` | `clipboard.test.ts` | ⬜ |
| 5.2 | Copy notes/arrows | `code/pages/page/elems/clipboard.ts` | `features/spatial/clipboard.ts` | `clipboard.test.ts` | ⬜ |
| 5.3 | Paste notes/arrows | `code/pages/page/elems/clipboard.ts` | `features/spatial/clipboard.ts` | `clipboard.test.ts` | ⬜ |
| 5.4 | Cross-page paste | `code/pages/page/elems/clipboard.ts` | `features/spatial/clipboard.ts` | `clipboard.test.ts` | ⬜ |

---

## 6. Editing (find/replace, undo/redo)

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 6.1 | Find across all note head/body text | `code/pages/page/elems/find-and-replace.ts` | `features/spatial/find-replace.ts` | `find-replace.test.ts` | ⬜ |
| 6.2 | Replace text | `code/pages/page/elems/find-and-replace.ts` | `features/spatial/find-replace.ts` | `find-replace.test.ts` | ⬜ |
| 6.3 | Undo (`Ctrl+Z`) for note operations | `code/pages/page/undo-redo.ts` | `features/spatial/undo-redo.ts` | `undo-redo.test.ts` | ⬜ |
| 6.4 | Redo (`Ctrl+Shift+Z`) | `code/pages/page/undo-redo.ts` | `features/spatial/undo-redo.ts` | `undo-redo.test.ts` | ⬜ |

---

## 7. Collab (page-level Yjs doc)

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 7.1 | Page Yjs doc with `noteIds`, `arrowIds`, `nextZIndex` | `code/pages/page/collab/collab.ts` | `packages/collab-wire/src/page-doc-schema.ts` | `page-doc-schema.test.ts` | ⬜ |
| 7.2 | SyncedStore `notes` map (`Y.Map<INoteCollab>`) | `code/pages/page/collab/collab.ts` | `packages/collab-wire/src/page-doc-schema.ts` | `page-doc-schema.test.ts` | ⬜ |
| 7.3 | SyncedStore `arrows` map (`Y.Map<IArrowCollab>`) | `code/pages/page/collab/collab.ts` | `packages/collab-wire/src/page-doc-schema.ts` | `page-doc-schema.test.ts` | ⬜ |
| 7.4 | Remote cursor awareness | `code/pages/page/collab/presence.ts` | `features/spatial/collab-awareness.ts` | `collab-awareness.test.ts` | ⬜ |
| 7.5 | WS bootstrap-over-WEBSOCKET (`ALL_UPDATES_UNMERGED`) | `code/pages/page/collab/websocket.ts` | TBD (documented as REST-only) | — | ⬜ |
| 7.6 | Unacked-update retry buffer | `code/pages/page/collab/websocket.ts` | `features/pages/useCollabPush.ts` | `useCollabPush.test.ts` | ⬜ |

---

## 8. Templates

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 8.1 | Default note template (`users.encrypted_default_note`) | `code/pages/page/notes/note.ts` | `features/spatial/note-model.ts` | `note-model.test.ts` | ⬜ |
| 8.2 | Default arrow template (`users.encrypted_default_arrow`) | `code/pages/page/arrows/arrow.ts` | `features/spatial/arrow-model.ts` | `arrow-model.test.ts` | ⬜ |

---

## 9. Backlinks

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 9.1 | Display incoming page links with decrypted titles | Legacy had backlink UI in sidebar | `features/pages/backlinks.ts` | `backlinks.test.ts` | ⬜ |

---

## 10. Group Access

| # | Feature | Legacy file(s) | New file(s) | Test file(s) | Status |
|---|---------|---------------|-------------|--------------|--------|
| 10.1 | Password-protected group unlock flow | `packages/session/src/group-password.ts` | `features/groups/group-password-unlock.ts` | `group-password.integration.test.ts` | ⬜ |

---

## 11. Schema Diff Table

### `INoteCollab` fields

| Field | Legacy Zod type | New Phase-3 equivalent | Required in new schema |
|-------|-------------------|----------------------|----------------------|
| `anchor` | `IVec2` (default `{x:0.5,y:0.5}`) | `Y.Map<{x,y}>` or plain object | ✅ |
| `pos` | `IVec2` (default `{x:0,y:0}`) | `Y.Map<{x,y}>` or plain object | ✅ |
| `width` | `INoteCollabSize` (expanded/collapsed) | `Y.Map<string>` or struct | ✅ |
| `head.enabled` | `boolean` default `true` | `boolean` | ✅ |
| `head.height` | `INoteCollabSize` | size struct | ✅ |
| `head.value` | `Y.XmlFragment` | `Y.XmlFragment` | ✅ |
| `head.wrap` | `boolean` default `true` | `boolean` | ✅ |
| `body.enabled` | `boolean` default `false` | `boolean` | ✅ |
| `body.height` | `INoteCollabSize` | size struct | ✅ |
| `body.value` | `Y.XmlFragment` | `Y.XmlFragment` | ✅ |
| `body.wrap` | `boolean` default `true` | `boolean` | ✅ |
| `container.enabled` | `boolean` default `false` | `boolean` | ✅ |
| `container.spatial` | `boolean` default `false` | `boolean` | ✅ |
| `container.horizontal` | `boolean` default `false` | `boolean` | ✅ |
| `container.wrapChildren` | `boolean` default `false` | `boolean` | ✅ |
| `container.stretchChildren` | `boolean` default `true` | `boolean` | ✅ |
| `container.forceColorInheritance` | `boolean` default `false` | `boolean` | ✅ |
| `collapsing.enabled` | `boolean` default `false` | `boolean` | ✅ |
| `collapsing.collapsed` | `boolean` default `false` | `boolean` | ✅ |
| `collapsing.localCollapsing` | `boolean` default `false` | `boolean` | ✅ |
| `color.inherit` | `boolean` default `false` | `boolean` | ✅ |
| `color.value` | `string` default `'grey'` | `string` | ✅ |
| `link` | `string` default `''` | `string` | ✅ |
| `zIndex` | `number` default `-1` | `number` | ✅ |
| `movable` | `boolean` default `true` | `boolean` | ✅ |
| `resizable` | `boolean` default `true` | `boolean` | ✅ |
| `readOnly` | `boolean` default `false` | `boolean` | ✅ |
| `createdAt` | `number|null` default `null` | `number|null` | ✅ |
| `editedAt` | `number|null` default `null` | `number|null` | ✅ |
| `movedAt` | `number|null` default `null` | `number|null` | ✅ |
| `regionId` | `string|null` default `null` (from `IElemCollab`) | `string|null` | ✅ |

### `IArrowCollab` fields

| Field | Legacy Zod type | New Phase-3 equivalent | Required in new schema |
|-------|-------------------|----------------------|----------------------|
| `source` | `string` default `''` | `string` (noteId) | ✅ |
| `target` | `string` default `''` | `string` (noteId) | ✅ |
| `sourceAnchor` | `{x,y}|null` default `null` | `{x,y}|null` | ✅ |
| `targetAnchor` | `{x,y}|null` default `null` | `{x,y}|null` | ✅ |
| `sourceHead` | `string` default `'none'` | `string` | ✅ |
| `targetHead` | `string` default `'open'` | `string` | ✅ |
| `bodyType` | `string` default `'curve'` | `string` | ✅ |
| `bodyStyle` | `string` default `'solid'` | `string` | ✅ |
| `label` | `Y.XmlFragment` | `Y.XmlFragment` | ✅ |
| `color` | `string` default `'grey'` | `string` | ✅ |
| `readOnly` | `boolean` default `false` | `boolean` | ✅ |
| `interregional` | computed in `IArrowReact` | `boolean` | ✅ |
| `fakePos` | `Vec2` optional | `{x,y}|null` | ✅ |
| `looseEndpoint` | `'source'|'target'` optional | `'source'|'target'|null` | ✅ |
| `createdAt` | `number|null` default `null` | `number|null` | ✅ |
| `editedAt` | `number|null` default `null` | `number|null` | ✅ |
| `regionId` | `string|null` default `null` (from `IElemCollab`) | `string|null` | ✅ |

---

## Exit Criteria

- [x] Checklist contains ≥ 60 rows (currently **69**).
- [x] Every legacy `DisplayWorld` component has a corresponding row.
- [x] No row is marked "done" unless the feature is actually implemented (not stubbed).
- [x] Schema diff table covers every field in `INoteCollab` and `IArrowCollab`.
- [ ] Reviewed by someone who has used the legacy app.
