# UI Polish Progress Tracker

Tracks execution of `UI_POLISH_PLAN.md` (areas around the main section in the pages layout only).

> **Last updated:** Jun 2026 — after keyboard shortcut parity pass.  
> **Evaluation findings:**
> - ✅ Left sidebar tabs are now **horizontal** (above content).
> - ✅ Mini-mode has been removed entirely; right sidebar is 2-state only.
> - ✅ Shadcn `Select` installed; raw `<select>` replaced in property cards.
> - ✅ Right sidebar header bar shows active element type.
> - ✅ Keyboard shortcut parity: canvas-mode (F2, arrows, Ctrl+D, Ctrl+H, Backspace undo) + editing-mode (Tiptap extension with 20 shortcuts).
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

## Next Recommended Actions

1. Add remaining right sidebar controls: anchor numeric inputs, explicit width/height combos, ColorPalette, note export.
2. Implement full "Create new page" crypto flow (§5.2).
