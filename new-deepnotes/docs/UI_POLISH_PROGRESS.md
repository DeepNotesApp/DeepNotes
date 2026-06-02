# UI Polish Progress Tracker

Tracks execution of `UI_POLISH_PLAN.md` (areas around the main section in the pages layout only).

## Status

| Section | Task | Status | Files Touched |
|---------|------|--------|---------------|
| **2.1** | Simplify header: remove `PageToolbarActions`, text links, add profile dropdown | **DONE** | `MainToolbar.vue`, `PageEditorView.vue` |
| **3.1** | Left sidebar: icon-tabbed sections, remove collab card | **DONE** | `PageEditorView.vue`, `PageLayout.vue`, `PageEditorLeftSidebar.vue` |
| **4.2** | Fix note interactions: vertical resize, double-click, handles visibility, edit-on-frame | **DONE** | `DisplayNote.vue`, `useCanvasActions.ts`, `page-doc-schema.ts`, `note-model.ts` |
| **4.1a-d** | Main toolbar: command dispatcher + toolbar shell + formatting/objects/alignment + remove floating buttons | **DONE** | `CanvasToolbar.vue`, `useEditorCommandDispatcher.ts`, `SpatialPageView.vue` |
| **4.3** | Expand context menus | **DONE** | `CanvasContextMenu.vue`, `NoteContextMenu.vue`, `SpatialPageView.vue` |
| **5.1** | Right sidebar: styled selects, height control, arrow head selects | **DONE** | `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `PageEditorView.vue` |
| **5.2** | Right sidebar: "Create new page" functionality | `NOT STARTED` | `NotePropertiesCard.vue` |
| **7** | Keyboard shortcut parity (high-impact missing shortcuts) | `NOT STARTED` | `useSpatialKeyboard.ts` |
