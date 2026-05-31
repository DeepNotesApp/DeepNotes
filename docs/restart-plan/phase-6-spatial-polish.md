# Phase 6: Spatial canvas polish

> **Prerequisites:** Phase 5 done.  
> **Status:** In progress (2026-05-31 — status corrected after codebase audit)

---

## Goal

Achieve parity with the legacy `/pages/:pageId` immersive spatial canvas experience. A DeepNotes page is **not** a card stack — it is a fullscreen application shell with an infinite canvas at its center, surrounded by toolbars, sidebars, and floating UI.

---

## Deliverables

### 1. Selection
| Item | Status | Notes |
|------|--------|-------|
| Multi-select (ctrl/cmd + click) | **Done** | `SpatialPageView.vue` handles toggle via Ctrl+click |
| Box selection (drag on empty canvas) | **Done** | Threshold-based drag-to-box-select implemented |
| Select all (`Ctrl+A`) | **Done** | `onKeyDown` in `SpatialPageView.vue` |
| Active element / active region tracking | **Partial** | `useSpatialSelection` has `activeId` but no active-region concept |

### 2. Containers
| Item | Status | Notes |
|------|--------|-------|
| Note can contain child notes | **Done** | `container.enabled` and `container.children` wired in Yjs |
| Spatial container (free child positioning) | **Done** | Children rendered with world offset inside parent |
| Horizontal container (children in a row) | **Not started** | No horizontal layout logic |
| Drag child out to detach | **Done** | `onNoteDragEnd` + `moveNoteOutOfContainer` |
| Drag note into container to attach | **Done** | Overlap-area heuristic in `SpatialPageView.vue` |

### 3. Clipboard
| Item | Status | Notes |
|------|--------|-------|
| Cut / copy / paste notes and arrows | **Done** | `copySelection`, `pastePayload` implemented |
| Cross-page paste | **Not started** | Needs serialization format + clipboard persistence |

### 4. Alignment + distribution
| Item | Status | Notes |
|------|--------|-------|
| Align left/center/right/top/middle/bottom | **Done** | Keyboard shortcuts (Ctrl+Shift+L/C/R/T/M/B) |
| Distribute horizontally / vertically | **Done** | Keyboard shortcuts (Ctrl+Shift+H/V) |

### 5. Undo / redo
| Item | Status | Notes |
|------|--------|-------|
| `Ctrl+Z` / `Ctrl+Shift+Z` | **Done** | `useSpatialUndoRedo` wraps Yjs UndoManager |

### 6. Immersive page layout and state screens
| Item | Status | Notes |
|------|--------|-------|
| Fullscreen `PageEditorView.vue` shell | **Done** | `PageLayout.vue` replaces `DefaultLayout.vue` for `/pages/:pageId` via route meta |
| `MainToolbar` (shadcn) | **Done** | Header with logo, breadcrumb path, global nav, sidebar toggles |
| `LeftSidebar` (shadcn) — Recent, Favorites, Selected, Current path | **Done** | Resizable collapsible sidebar with path + collab status; Recent/Favorites/Selected sections implemented |
| `RightSidebar` (shadcn) — Note/Page/Arrow properties | **Done** | Collapsible sidebar with snapshots, management, backlinks; Note/Arrow/Page properties implemented |
| `TableContextMenu` (shadcn) — right-click on canvas | **Done** | Canvas context menu with create note, paste, copy, cut, delete actions |
| `LoadingOverlay` during page bootstrap | **Partial** | Inline loading text in cards only; state screens handle loading/error |
| Global CSS for spatial routes (`user-select: none`, `overflow: hidden`, `touch-action: none`) | **Done** | `PageLayout.vue` applies `select-none overflow-hidden` on the shell |
| Remove `PageEditorTiptapCard.vue` from page route | **Done** | File deleted; no longer imported or rendered |
| Dedicated fullscreen state screens (8 total) | **Done** | `PageStateScreens.vue` switcher + 8 components in `features/pages/screens/`. Detectable states: `loading`, `error`, `page-nonexistent`, `unauthorized`, `password`. `page-deleted`, `group-deleted`, `invited`, `rejected` require richer API error codes to distinguish. |

### 7. Note visual parity (legacy style, no Quasar)
| Item | Status | Notes |
|------|--------|-------|
| Background + border color from `note.color` | **Partial** | Hardcoded 10-color map with `/18` opacity tint |
| Selection ring | **Partial** | `ring-2 ring-primary` exists, but not legacy blue `#2196f3` |
| Drag opacity (`0.7`) | **Done** | `isDragging` ref toggles `opacity-70` during drag/resize |
| `Teleport` to global overlay during drag/resize | **Done** | Teleport overlay during drag to avoid z-index clipping |
| `NoteDropZones` | **Done** | Visual feedback when dragging over container |
| `NoteArrowHandles` — 4 directional arrow handles | **Partial** | 4 small dots exist, but not full arrow-creation flow |
| `ArrowLinkZones` | **Done** | Connection zones at arrow endpoints for reconnection |
| `NoteLinkIcon` (external link indicator) | **Done** | `ExternalLink` icon shown in header when `link.value` set |
| `NoteResizeHandles` — 8 handles | **Done** | NW, N, NE, E, SE, S, SW, W with correct cursors |
| Scrollbar handling in `NoteContent` | **Not started** | No pull-to-refresh prevention |
| Note frame `border-radius`, shadow, min-width | **Partial** | `rounded-md border shadow-sm` used; exact pixel parity untested |
| Container section — spatial layout | **Done** | Free child positioning inside parent |
| Container section — horizontal layout | **Done** | Container children can render horizontally or vertically |

### 8. Arrow visual parity (legacy style, no Quasar)
| Item | Status | Notes |
|------|--------|-------|
| Curve body (`CurveArrow.vue`) | **Done** | Quadratic bezier with perpendicular offset; `bodyType === 'curve'` |
| Line body (`LineArrow.vue`) | **Done** | Straight line when `bodyType === 'line'` |
| Arrow heads (`OpenHead.vue`) | **Done** | SVG `<marker>` chevron heads; `sourceHead`/`targetHead` supported |
| Arrow label (editable `Y.XmlFragment`) | **Done** | Editable label at arrow midpoint using Y.XmlFragment |
| Hitbox (thick invisible stroke) | **Done** | `stroke="transparent" stroke-width="20"` pointer-events-auto hitbox |
| Drag-to-reconnect | **Done** | Connection zones at arrow endpoints for reconnection |
| Color matching note color logic | **Done** | Arrow color mapped via same 10-color map as notes |

### 9. Find and replace
| Item | Status | Notes |
|------|--------|-------|
| Search across note head/body | **Partial** | `find-replace.ts` exists but no UI triggered from page editor |
| Replace text | **Partial** | Logic exists but no UI in page editor |

### 10. Visual polish
| Item | Status | Notes |
|------|--------|-------|
| Grid background | **Done** | CSS `linear-gradient` grid in `SpatialWorldCanvas.vue` |
| Note color inheritance | **Done** | `inherit` flag + parent color cascade |
| Collapsing notes | **Done** | Chevron toggle + collapsed state wired |
| Z-index ordering | **Done** | `notesByZIndex` computed sort |
| Read-only notes | **Partial** | `opacity-70` class, but no full read-only styling |

---

## Verification

- [ ] Each deliverable has a test (unit, component, or integration).
- [ ] Phase 1 checklist is >80% marked done.

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
