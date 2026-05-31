# Phase 6: Spatial canvas polish

> **Prerequisites:** Phase 5 done.  
> **Status:** In progress (2026-05-31 — status corrected after evaluation. Multiple "Done" items were over-reported; see notes below.)

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
| Active element / active region tracking | **Partial** | `useSpatialSelection` has `activeId` and `activeRegionId` ref but no real active-region UI or keyboard navigation |

### 2. Containers
| Item | Status | Notes |
|------|--------|-------|
| Note can contain child notes | **Done** | `container.enabled` and `container.children` wired in Yjs |
| Spatial container (free child positioning) | **Done** | Children rendered with world offset inside parent |
| Horizontal container (children in a row) | **Done** | `container.horizontal` flag + `flex-row` class in `DisplayNote.vue` |
| Drag child out to detach | **Done** | `onNoteDragEnd` + `moveNoteOutOfContainer` |
| Drag note into container to attach | **Done** | Overlap-area heuristic in `SpatialPageView.vue` |

### 3. Clipboard
| Item | Status | Notes |
|------|--------|-------|
| Cut / copy / paste notes and arrows | **Done** | `copySelection`, `pastePayload` implemented |
| Cross-page paste | **Done** | System clipboard API with localStorage fallback |

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
| `MainToolbar` (shadcn) | **Partial** | `PageLayout.vue` inline header has logo, breadcrumb, global nav, sidebar toggles. No standalone `MainToolbar.vue`. Missing: page action buttons, insert dialogs, zoom other than reset, fit-to-screen |
| `LeftSidebar` (shadcn) — Recent, Favorites, Selected, Current path | **Partial** | Resizable collapsible sidebar shell exists. `CurrentPath` and `CollabStatus` wired. `RecentPagesCard` and `FavoritePagesCard` now load real data via `useUserPageLists` composable. `SelectedPagesCard` remains client-side only |
| `RightSidebar` (shadcn) — Note/Page/Arrow properties | **Partial** | `NotePropertiesCard`, `ArrowPropertiesCard`, `PagePropertiesCard` are wired and visible. Many legacy fields (wrap, anchor, z-index, timestamps) not exposed. Snapshots, management, backlinks exist |
| `TableContextMenu` (shadcn) — right-click on canvas | **Partial** | `CanvasContextMenu.vue` exists for canvas background. No per-note context menu |
| `LoadingOverlay` during page bootstrap | **Partial** | `PageStateScreens.vue` handles loading/error. No dedicated `LoadingOverlay` component over the canvas |
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
| `NoteDropZones` | **Partial** | `isDropTarget` prop + `ring-accent` feedback exists. No dedicated `NoteDropZones` component |
| `NoteArrowHandles` — 4 directional arrow handles | **Partial** | 4 small dots exist and emit `arrowDragStart`. Drag-to-create-arrow flow is wired in `SpatialPageView.vue` |
| `ArrowLinkZones` | **Partial** | Connection zones (SVG circles) at endpoints exist. "Link zones" proper (hover-to-preview-link) not implemented |
| `NoteLinkIcon` (external link indicator) | **Done** | `ExternalLink` icon shown in header when `link.value` set |
| `NoteResizeHandles` — 8 handles | **Done** | NW, N, NE, E, SE, S, SW, W with correct cursors |
| Scrollbar handling in `NoteContent` | **Partial** | `overscroll-behavior: contain` added. No custom scrollbar styling or legacy scroll behaviors |
| Note frame `border-radius`, shadow, min-width | **Partial** | `rounded-md border shadow-sm` used. Exact pixel parity with legacy not tested |
| Container section — spatial layout | **Done** | Free child positioning inside parent |
| Container section — horizontal layout | **Done** | Container children can render horizontally or vertically |

### 8. Arrow visual parity (legacy style, no Quasar)
| Item | Status | Notes |
|------|--------|-------|
| Curve body (`CurveArrow.vue`) | **Done** | Quadratic bezier with perpendicular offset; `bodyType === 'curve'` |
| Line body (`LineArrow.vue`) | **Done** | Straight line when `bodyType === 'line'` |
| Arrow heads (`OpenHead.vue`) | **Done** | SVG `<marker>` chevron heads; `sourceHead`/`targetHead` supported |
| Arrow label (editable `Y.XmlFragment`) | **Done** | `NoteTiptapEditor` at midpoint. Proper collaborative rich-text editing on `Y.XmlFragment` |
| Hitbox (thick invisible stroke) | **Done** | `stroke="transparent" stroke-width="20"` pointer-events-auto hitbox |
| Drag-to-reconnect | **Done** | Connection zones + `onReconnectPointerMove/Up` in `SpatialPageView.vue` wired |
| Color matching note color logic | **Partial** | Same hardcoded 10-color map used, but `inherit` logic may not cascade correctly for arrows |

### 9. Find and replace
| Item | Status | Notes |
|------|--------|-------|
| Search across note head/body | **Partial** | `FindReplaceDialog.vue` searches `Y.XmlFragment.toString()`. No rich-text-aware search (e.g., ignoring formatting marks) |
| Replace text | **Done** | Replace current and replace all implemented |

### 10. Visual polish
| Item | Status | Notes |
|------|--------|-------|
| Grid background | **Done** | CSS `linear-gradient` grid in `SpatialWorldCanvas.vue` |
| Note color inheritance | **Done** | `inherit` flag + parent color cascade |
| Collapsing notes | **Done** | Chevron toggle + collapsed state wired |
| Z-index ordering | **Done** | `notesByZIndex` computed sort |
| Read-only notes | **Done** | `opacity-60 cursor-not-allowed` styling added |

---

## Verification

- [ ] Each deliverable has a test (unit, component, or integration). (Missing: `DisplayNote.vue`, `DisplayArrow.vue`, `SpatialPageView.vue`, sidebar/toolbar integration tests.)
- [ ] Phase 1 checklist is >80% marked done. (`docs/SPATIAL_PARITY_CHECKLIST.md` created with 82 rows; count Done vs Partial/Stub/Not started.)

---

## Exit criteria

- [x] `docs/SPATIAL_PARITY_CHECKLIST.md` exists and is reviewed for completeness.
- [ ] Phase 1 checklist ≥ 80% complete.
- [ ] No "P1" checklist item remains open.
- [ ] `PageEditorView.vue` renders as a full-screen immersive shell (no scrolling card page).
- [ ] All 8 dedicated page-state screens exist and are reachable. (`page-deleted`/`group-deleted`/`invited`/`rejected` are indistinguishable without richer API error codes.)
- [ ] `DisplayNote.vue` matches legacy note visuals: colors, borders, selection ring (`#2196f3` not `ring-primary`), drag opacity, Teleport overlay, drop zones, arrow handles, link icon, 8 resize handles.
- [x] `DisplayArrow.vue` supports curve + line bodies, arrow heads, labels (Tiptap on `Y.XmlFragment`), hitboxes, and drag-to-reconnect.
- [ ] `MainToolbar`, `LeftSidebar`, `RightSidebar`, and `TableContextMenu` are implemented as standalone shadcn components and visible on `/pages/:pageId`.
- [x] Sidebar panels (`RecentPages`, `FavoritePages`) display real data from API.
- [x] Arrow geometry reads actual note heights instead of hardcoding `80px`.
- [ ] Manual QA session with 3+ users finds no blocking usability issues.
