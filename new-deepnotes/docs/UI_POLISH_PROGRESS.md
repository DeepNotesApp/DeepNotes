# UI Polish Progress Tracker

Tracks execution of `UI_POLISH_PLAN.md` (areas around the main section in the pages layout only).

> **Last updated:** After editor-chrome evaluation (Jun 2026).  
> **Evaluation findings:**
> - Left sidebar tabs are **vertical** (left edge) but should be **horizontal** (above content).
> - Mini-mode is **disliked by user** and must be removed entirely.
> - "Styled selects" (§5.1) were marked DONE but still use raw `<select>` because Shadcn `Select` is **not installed** in the project.
> - Right sidebar is missing a **header bar** showing the active element type.
> - `CURRENT_SITUATION.md` is a snapshot; it should not be edited.

## Status

| Section | Task | Status | Files Touched | Notes |
|---------|------|--------|---------------|-------|
| **2.1** | Simplify header: remove `PageToolbarActions`, text links, add profile dropdown | **DONE** | `MainToolbar.vue`, `PageEditorView.vue` | ✅ Good quality. |
| **3.1** | Left sidebar: icon-tabbed sections, remove collab card | **DONE (wrong orientation)** | `PageEditorView.vue`, `PageLayout.vue`, `PageEditorLeftSidebar.vue` | Tabs are vertical on the left edge; need to flip to **horizontal** at the top. |
| **4.2** | Fix note interactions: vertical resize, double-click, handles visibility, edit-on-frame | **DONE** | `DisplayNote.vue`, `useCanvasActions.ts`, `page-doc-schema.ts`, `note-model.ts` | — |
| **4.1a-d** | Main toolbar: command dispatcher + toolbar shell + formatting/objects/alignment + remove floating buttons | **DONE** | `CanvasToolbar.vue`, `useEditorCommandDispatcher.ts`, `SpatialPageView.vue` | — |
| **4.3** | Expand context menus | **DONE** | `CanvasContextMenu.vue`, `NoteContextMenu.vue`, `SpatialPageView.vue` | — |
| **5.1** | Right sidebar: styled selects, height control, arrow head selects | **NOT DONE** | `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `PageEditorView.vue` | Still uses raw `<select>`. **Blocked:** Shadcn `Select` component is not installed. |
| **5.1b** | Right sidebar: consolidate page-level cards, add missing controls (swap, timestamps, copy link, local collapsing, anchors) | **DONE** | `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `PageEditorView.vue` | — |
| **5.2** | Right sidebar: "Create new page" functionality | `PARTIAL` | `NotePropertiesCard.vue` | UI added, crypto stubbed. |
| **5.3** | Right sidebar: mini-mode (48px collapsed strip) | **`ABANDONED`** | `PageLayout.vue`, `PageEditorView.vue` | User dislikes mini-mode. Remove entirely; sidebar should be **expanded ↔ hidden only**. Also remove mini-mode slot from `PageEditorView.vue`. |
| **7** | Keyboard shortcut parity (high-impact missing shortcuts) | `NOT STARTED` | `useSpatialKeyboard.ts` | — |

## Blocked Dependencies

1. **Shadcn `Select` / `Tabs`** — `@/components/ui` only contains `alert`, `button`, `card`, `checkbox`, `dropdown-menu`, `input`, `label`, `switch`. The plan's directive to replace raw `<select>` with Shadcn `Select` is **unimplementable until these are installed**.

## Next Recommended Actions

1. `PageEditorLeftSidebar.vue` — flip `flex-row` → `flex-col`; move tab strip to horizontal top.
2. `PageLayout.vue` — delete `rightMiniMode` ref and 3-state toggle logic; make right sidebar 2-state (expanded/hidden).
3. `PageEditorView.vue` — delete `#right-sidebar-mini` slot and its contents.
4. Install Shadcn `select` and `tabs` primitives into `@/components/ui`.
