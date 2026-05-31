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
| Fullscreen `PageEditorView.vue` shell | **Not started** | Still a `max-w-3xl` card stack in `DefaultLayout.vue` |
| `MainToolbar` (shadcn) | **Not started** | No page-specific toolbar exists |
| `LeftSidebar` (shadcn) — Recent, Favorites, Selected, Current path | **Not started** | Zero sidebar infrastructure on page route |
| `RightSidebar` (shadcn) — Note/Page/Arrow properties | **Not started** | No property panels exist |
| `TableContextMenu` (shadcn) — right-click on canvas | **Not started** | No context menu on canvas |
| `LoadingOverlay` during page bootstrap | **Partial** | Inline loading text in cards only |
| Global CSS for spatial routes (`user-select: none`, `overflow: hidden`, `touch-action: none`) | **Not started** | `DefaultLayout.vue` does the opposite |
| Remove `PageEditorTiptapCard.vue` from page route | **Not started** | Still rendered at bottom of card stack |
| Dedicated fullscreen state screens (8 total) | **Not started** | No `DisplayErrorScreen`, `DisplayNonExistentScreen`, etc. |

### 7. Note visual parity (legacy style, no Quasar)
| Item | Status | Notes |
|------|--------|-------|
| Background + border color from `note.color` | **Partial** | Hardcoded 10-color map with `/18` opacity tint |
| Selection ring | **Partial** | `ring-2 ring-primary` exists, but not legacy blue `#2196f3` |
| Drag opacity (`0.7`) | **Not started** | No opacity change during drag |
| `Teleport` to global overlay during drag/resize | **Not started** | Notes drag inside parent; no overlay portal |
| `NoteDropZones` | **Not started** | No invisible drop zones on container notes |
| `NoteArrowHandles` — 4 directional arrow handles | **Partial** | 4 small dots exist, but not full arrow-creation flow |
| `ArrowLinkZones` | **Not started** | No edge zones for arrow reconnection |
| `NoteLinkIcon` (external link indicator) | **Not started** | No link icon when `link.url` set |
| `NoteResizeHandles` — 8 handles | **Done** | NW, N, NE, E, SE, S, SW, W with correct cursors |
| Scrollbar handling in `NoteContent` | **Not started** | No pull-to-refresh prevention |
| Note frame `border-radius`, shadow, min-width | **Partial** | `rounded-md border shadow-sm` used; exact pixel parity untested |
| Container section — spatial layout | **Done** | Free child positioning inside parent |
| Container section — horizontal layout | **Not started** | No row layout |

### 8. Arrow visual parity (legacy style, no Quasar)
| Item | Status | Notes |
|------|--------|-------|
| Curve body (`CurveArrow.vue`) | **Not started** | Only straight SVG `<line>` exists |
| Line body (`LineArrow.vue`) | **Partial** | Straight line is default, but no `bodyType` switching |
| Arrow heads (`OpenHead.vue`) | **Not started** | No arrowheads rendered |
| Arrow label (editable `Y.XmlFragment`) | **Not started** | No label support |
| Hitbox (thick invisible stroke) | **Not started** | Thin `cursor-pointer` line only |
| Drag-to-reconnect | **Not started** | No endpoint grabbing |
| Color matching note color logic | **Not started** | Stroke uses `currentColor` or `var(--primary)` |

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
