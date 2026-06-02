# UI Polish Progress Tracker

Tracks execution of `UI_POLISH_PLAN.md` (areas around the main section in the pages layout only).

> **Last updated:** Jun 2026 — after thorough editor-chrome evaluation.  
> **Evaluation findings:**
> - ✅ Left sidebar tabs are now **horizontal** (above content).
> - ✅ Mini-mode has been removed entirely; right sidebar is 2-state only.
> - ✅ Shadcn `Select` installed; raw `<select>` replaced in property cards.
> - ✅ Keyboard shortcut parity: canvas-mode (F2, arrows, Ctrl+D, Ctrl+H, Backspace undo) + editing-mode (Tiptap extension with 20 shortcuts).
> - ❌ **Notification button navigates to `/notifications` page instead of opening inline popup.** No `NotificationPopup` component exists. Severe UX regression from legacy.
> - ❌ **Right sidebar "Page/Note/Arrow Properties" header scrolls away with content.** It is rendered inside the scrollable content area instead of as a fixed sibling. Direct regression from legacy `q-toolbar` behavior.
> - ❌ **"N items selected" indicator is in normal document flow.** It shrinks the canvas when it appears. Legacy used `position: absolute`. Layout bug, not tracked.
> - ❌ **Canvas toolbar is stuck to top as `border-b` flex item.** User feedback: should be floating with margins from left/top/right. Zoom buttons should be removed and replaced with legacy-style right-side floating buttons.
> - ❌ **Left sidebar tab contents are wrapped in Card panels with borders.** User feedback: should be plain content without panel borders, closer to legacy.
> - `CURRENT_SITUATION.md` is a snapshot; it should not be edited.

## Status

| Section | Task | Status | Files Touched | Notes |
|---------|------|--------|---------------|-------|
| **2.1** | Simplify header: remove `PageToolbarActions`, text links, add profile dropdown | **DONE** | `MainToolbar.vue`, `PageEditorView.vue` | ✅ Good quality. |
| **3.1** | Left sidebar: icon-tabbed sections, remove collab card | **DONE** | `PageEditorView.vue`, `PageLayout.vue`, `PageEditorLeftSidebar.vue` | ✅ Tabs now horizontal at top. |
| **4.2** | Fix note interactions: vertical resize, double-click, handles visibility, edit-on-frame | **DONE** | `DisplayNote.vue`, `useCanvasActions.ts`, `page-doc-schema.ts`, `note-model.ts` | — |
| **4.1a-d** | Main toolbar: command dispatcher + toolbar shell + formatting/objects/alignment + remove floating buttons | **DONE** | `CanvasToolbar.vue`, `useEditorCommandDispatcher.ts`, `SpatialPageView.vue` | — |
| **4.3** | Expand context menus | **DONE** | `CanvasContextMenu.vue`, `NoteContextMenu.vue`, `SpatialPageView.vue` | — |
| **5.1** | Right sidebar: styled selects, height control, arrow head selects | **DONE** | `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `PageEditorView.vue`, `components/ui/select/*` | Shadcn `Select` installed; all raw `<select>` replaced. |
| **5.1b** | Right sidebar: consolidate page-level cards, add missing controls (swap, timestamps, copy link, local collapsing, anchors) | **DONE** | `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `PageEditorView.vue` | — |
| **5.2** | Right sidebar: "Create new page" functionality | `PARTIAL` | `NotePropertiesCard.vue` | UI added, crypto stubbed. |
| **5.3** | Right sidebar: mini-mode (48px collapsed strip) | **REMOVED** | `PageLayout.vue`, `PageEditorView.vue` | ✅ 2-state only (expanded ↔ hidden). |
| **7** | Keyboard shortcut parity (high-impact missing shortcuts) | **DONE** | `useSpatialKeyboard.ts`, `tiptap-keyboard-shortcuts.ts`, `note-editor-tiptap-extensions.ts`, `SpatialPageView.vue` | Canvas: F2, arrows, Ctrl+D, Ctrl+H, Backspace undo. Editing: 20 Tiptap shortcuts (formatting, objects, tables, math). |
| **2.1b** | Header: notification inline popup (not page nav) | **NOT STARTED** | `MainToolbar.vue`, new `NotificationsPopover.vue` | No `NotificationPopup` component exists in new app. |
| **3.1b** | Left sidebar: remove Card panel borders from tab contents | **NOT STARTED** | `PageEditorView.vue`, `RecentPagesCard.vue`, `FavoritePagesCard.vue`, `SelectedPagesCard.vue` | User feedback: contents should be plain, not inside panel borders. |
| **4.1e** | Canvas toolbar: floating position + remove zoom buttons | **NOT STARTED** | `CanvasToolbar.vue`, `SpatialPageView.vue`, new `FloatingCameraButtons.vue` | User feedback: toolbar should float with margins; zoom buttons should be legacy-style right-side floating buttons. |
| **5.1c** | Right sidebar: fix properties header to stay fixed above scrollable content | **NOT STARTED** | `PageLayout.vue`, `PageEditorView.vue` | Header scrolls away with content; legacy had fixed `q-toolbar`. |
| **Floating UI** | "N items selected" should be absolute positioned | **NOT STARTED** | `SpatialPageView.vue` | Layout bug: indicator shrinks canvas when visible. |

## Next Recommended Actions

1. **Fix notification popup regression** — Build `NotificationsPopover.vue` using Radix `Popover` or `DropdownMenu`; replace `RouterLink` in `MainToolbar.vue`.
2. **Fix left sidebar Card panels** — Remove `<Card>` wrappers from Path, Recent, Favorites, Selected tab contents; make plain like legacy sections.
3. **Fix canvas toolbar positioning** — Make `CanvasToolbar` floating (absolute with margins); remove View group (ZoomIn/ZoomOut/Fit); create `FloatingCameraButtons.vue` with Reset zoom, Fit to screen, Zoom %, Undo, Redo on the right side.
4. **Fix right sidebar fixed header** — Restructure `PageLayout.vue` `<aside>` so the properties header is a fixed-height sibling above a scrollable content pane.
5. **Fix "N items selected" layout** — Move the indicator into the `floating-overlay` slot or make it `absolute bottom-3 right-3 pointer-events-none`.
6. Add remaining right sidebar controls: anchor numeric inputs, explicit width/height combos, ColorPalette, note export.
7. Implement full "Create new page" crypto flow (§5.2).
