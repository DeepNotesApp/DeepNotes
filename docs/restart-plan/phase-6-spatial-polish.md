# Phase 6: Spatial canvas polish

> **Prerequisites:** Phase 5 done.  
> **Status:** In progress (2026-05-31 — `SpatialPageView.vue` refactored. Box selection, arrow drag, arrow reconnect, and note drag extracted into dedicated composables. `note-geometry.ts` and `useBoxSelection.test.ts` added. `useSpatialEditing`, `bringToTop`, line-body arrow geometry, and `useSpatialKeyboard` were extracted in prior work. **New:** `DisplayArrow.test.ts` (12 tests) and expanded `DisplayNote.test.ts` (19 tests) added. `selection.test.ts` now covers `bringToTop` explicitly.)

---

## Goal

Achieve parity with the legacy `/pages/:pageId` immersive spatial canvas experience. A DeepNotes page is **not** a card stack — it is a fullscreen application shell with an infinite canvas at its center, surrounded by toolbars, sidebars, and floating UI.

---

## Deliverables

### 1. Selection
| Item | Status | Notes |
|------|--------|-------|
| Multi-select (ctrl/cmd + click) | **Done** | `SpatialPageView.vue` handles toggle via Ctrl+click |
| Box selection (drag on empty canvas) | **Done** | Extracted to `useBoxSelection.ts`; threshold-based drag-to-box-select with world-space intersection. Tested in `useBoxSelection.test.ts`. |
| Select all (`Ctrl+A`) | **Done** | `onKeyDown` in `SpatialPageView.vue` |
| Active element / active region tracking | **Partial** | `useSpatialSelection` has `activeId` and `activeRegionId` ref but no real active-region UI or keyboard navigation |
| `bringToTop` on selection | **Done** | `useSpatialSelection` bumps selected note `zIndex` above other selected notes |
| `editing` state management | **Done** | `useSpatialEditing.ts` tracks editing note/arrow; Escape and canvas click stop editing; Delete suppressed while editing |

### 2. Containers
| Item | Status | Notes |
|------|--------|-------|
| Note can contain child notes | **Done** | `container.enabled` and `container.children` wired in Yjs |
| Spatial container (free child positioning) | **Done** | Children rendered with world offset inside parent |
| Horizontal container (children in a row) | **Done** | `container.horizontal` flag + `flex-row` class in `DisplayNote.vue` |
| Drag child out to detach | **Done** | `useNoteDrag.ts:onNoteDragEnd` + `moveNoteOutOfContainer` |
| Drag note into container to attach | **Done** | Overlap-area heuristic in `useNoteDrag.ts` |

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
| `MainToolbar` (shadcn) | **Partial** | Standalone `MainToolbar.vue` extracted from `PageLayout.vue`. Still missing: page action buttons, insert dialogs, zoom other than reset/fit-to-screen |
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
| Selection ring | **Done** | `ring-2 ring-[#2196f3]` matches legacy blue |
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
| Line body (`LineArrow.vue`) | **Done** | Straight line when `bodyType === 'line'`; rectangle-edge intersection via `arrow-geometry.ts` |
| Arrow heads (`OpenHead.vue`) | **Done** | SVG `<marker>` chevron heads; `sourceHead`/`targetHead` supported |
| Arrow label (editable `Y.XmlFragment`) | **Done** | `NoteTiptapEditor` at midpoint. Proper collaborative rich-text editing on `Y.XmlFragment` |
| Hitbox (thick invisible stroke) | **Done** | `stroke="transparent" stroke-width="20"` pointer-events-auto hitbox |
| Drag-to-reconnect | **Done** | Extracted to `useArrowReconnect.ts`. Connection zones + world-space note detection on pointer move. |
| Arrow source/target anchor positioning | **Done** | `DisplayArrow.vue` geometry uses `sourceAnchor`/`targetAnchor` when provided; line body falls back to rectangle-edge intersection |
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

- [ ] Each deliverable has a test (unit, component, or integration). **Partially improved.** New tests: `note-geometry.test.ts` (8 tests), `useBoxSelection.test.ts` (6 tests), `arrow-geometry.test.ts` (5 tests), `useSpatialEditing.test.ts` (4 tests), `DisplayArrow.test.ts` (12 tests), `DisplayNote.test.ts` (19 tests). Major gaps remain: `SpatialPageView.vue` (no component/integration tests), drag/resize end-to-end interaction tests, arrow creation flow tests, sidebar/toolbar integration tests.
- [ ] Phase 1 checklist is >80% marked done. **NOT MET.** Strict enforcement of the checklist's "Done = implemented + passing test" rule drops the true completion rate well below 80%.

---

## Exit criteria

- [x] `docs/SPATIAL_PARITY_CHECKLIST.md` exists and is reviewed for completeness.
- [ ] Phase 1 checklist ≥ 80% complete. **NOT MET.**
- [ ] No "P1" checklist item remains open.
- [x] `PageEditorView.vue` renders as a full-screen immersive shell (no scrolling card page).
- [x] All 8 dedicated page-state screens exist and are reachable. (`page-deleted`/`group-deleted`/`invited`/`rejected` are indistinguishable without richer API error codes.)
- [ ] `DisplayNote.vue` matches legacy note visuals. **PARTIAL.** Colors use hardcoded 10-color map instead of legacy `colorNameToColorHex` with `lightenByRatio`. Drop zones, arrow handles, and frame styling are simplified. No custom scrollbar handling.
- [ ] `DisplayArrow.vue` supports full legacy arrow behavior. **PARTIAL.** Curve/line bodies and heads work; line body now has rectangle-edge intersection. Interregional arrows don't transform coordinate spaces; `fakePos`/`looseEndpoint` are not rendered.
- [x] `MainToolbar`, `LeftSidebar`, `RightSidebar`, and `TableContextMenu` are implemented as standalone shadcn components and visible on `/pages/:pageId`.
- [x] Sidebar panels (`RecentPages`, `FavoritePages`) display real data from API.
- [x] Arrow geometry reads actual note heights instead of hardcoding `80px`.
- [ ] `SpatialPageView.vue` is refactored to avoid god-component anti-pattern. **Partial.** Keyboard shortcuts extracted to `useSpatialKeyboard.ts`; box selection extracted to `useBoxSelection.ts`; arrow drag extracted to `useArrowDrag.ts`; arrow reconnect extracted to `useArrowReconnect.ts`; note drag extracted to `useNoteDrag.ts`; note geometry extracted to `note-geometry.ts`. Component reduced from ~740 to ~365 lines. Remaining inline: context menu handlers, fit-to-screen, canvas double-click.
- [x] Selection implements `bringToTop`. Formatting integration and active element/region navigation remain missing.
- [ ] Container rendering enforces `stretchChildren`, `wrapChildren`, and spatial vs non-spatial layout modes.
- [ ] Manual QA session with 3+ users finds no blocking usability issues.
