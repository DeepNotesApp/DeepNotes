# UI Polish Progress Tracker

Tracks execution of `UI_POLISH_PLAN.md` (areas around the main section in the pages layout only).

> **Last updated:** Jun 2026 — after thorough editor-chrome evaluation.  
> **Evaluation findings:**
> - ✅ Left sidebar tabs are now **horizontal** (above content).
> - ✅ Mini-mode has been removed entirely; right sidebar is 2-state only.
> - ✅ Shadcn `Select` installed; raw `<select>` replaced in property cards.
> - ✅ Keyboard shortcut parity: canvas-mode (F2, arrows, Ctrl+D, Ctrl+H, Backspace undo) + editing-mode (Tiptap extension with 20 shortcuts).
> - ✅ **Notification button now opens inline popup via `NotificationsPopover.vue`.** Replaced `RouterLink` in `MainToolbar.vue` with a `DropdownMenu`-based popup.
> - ✅ **Right sidebar "Page/Note/Arrow Properties" header is now fixed.** Restructured `PageLayout.vue` `<aside>` with a `shrink-0` header strip above `flex-1 overflow-y-auto` content pane.
> - ✅ **"N items selected" is now `absolute bottom-3 right-3 pointer-events-none`.** No longer shifts canvas layout.
> - ✅ **Canvas toolbar is now floating (`absolute top-2 left-14 right-14`).** Zoom buttons removed from toolbar; `FloatingCameraButtons.vue` replicates legacy right-side stack (Reset zoom, Fit, Zoom%, Undo, Redo).
> - ✅ **Left sidebar tab contents are now plain (no Card borders).** Removed `<Card>` wrappers from Path, Recent, Favorites, Selected tabs.
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
| **5.1d** | Right sidebar: width/height explicit px combos, ColorPalette, note export | **DONE** | `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `ColorPalette.vue` | Width/height now support Custom (numeric) mode. ColorPalette extracted to reusable component using legacy 12-color palette. Note export UI added (copy/download MD stubs). |
| **5.1e** | Right sidebar: arrow body type/style to Shadcn Select | **DONE** | `ArrowPropertiesCard.vue` | Button toggles replaced with `Select` components. |
| **5.2** | Right sidebar: "Create new page" functionality | **DONE** | `NotePropertiesCard.vue`, `PageEditorView.vue` | Full crypto flow: unwraps group content keyring, creates page keyring, encrypts titles, calls `POST /api/groups/{groupId}/pages`, sets note link to new page. |
| **5.3** | Right sidebar: mini-mode (48px collapsed strip) | **REMOVED** | `PageLayout.vue`, `PageEditorView.vue` | ✅ 2-state only (expanded ↔ hidden). |
| **7** | Keyboard shortcut parity (high-impact missing shortcuts) | **DONE** | `useSpatialKeyboard.ts`, `tiptap-keyboard-shortcuts.ts`, `note-editor-tiptap-extensions.ts`, `SpatialPageView.vue` | Canvas: F2, arrows, Ctrl+D, Ctrl+H, Backspace undo. Editing: 20 Tiptap shortcuts (formatting, objects, tables, math). |
| **2.1b** | Header: notification inline popup (not page nav) | **DONE** | `MainToolbar.vue`, new `NotificationsPopover.vue` | `DropdownMenu`-based popup with compact notification list, mark-all-read, and link to full page. |
| **3.1b** | Left sidebar: remove Card panel borders from tab contents | **DONE** | `PageEditorView.vue`, `RecentPagesCard.vue`, `FavoritePagesCard.vue`, `SelectedPagesCard.vue` | Removed `<Card>` wrappers; content is now plain with simple header + list. |
| **4.1e** | Canvas toolbar: floating position + remove zoom buttons | **DONE** | `CanvasToolbar.vue`, `SpatialPageView.vue`, new `FloatingCameraButtons.vue` | Toolbar is `absolute top-2 left-14 right-14`; View group removed. Right-side floating buttons replicate legacy `DisplayRightBtns`. |
| **5.1c** | Right sidebar: fix properties header to stay fixed above scrollable content | **DONE** | `PageLayout.vue`, `PageEditorView.vue` | `<aside>` restructured to `flex-col` with `shrink-0` header strip + `flex-1 overflow-y-auto` content pane. |
| **Floating UI** | "N items selected" should be absolute positioned | **DONE** | `SpatialPageView.vue` | Changed to `absolute bottom-3 right-3 pointer-events-none`; no longer affects layout. |
| **1.1** | Marketing: pricing layout fix | **DONE** | `PricingPage.vue` | Badge moved above toggle; feature list tightened to `space-y-1.5`; card titles reduced to `text-xl`. |
| **1.2** | Marketing: scroll-driven index | **DONE** | `DocumentIndexLayout.vue`, `WhitepaperPage.vue`, `PrivacyPolicyPage.vue`, `TermsOfServicePage.vue` | New reusable `DocumentIndexLayout` with `IntersectionObserver` scroll-spy and `marked` heading extraction. Ported to all three legal pages. |
| **1.3** | Marketing: scroll reset on route change | **DONE** | `marketing/src/main.ts` | Added `scrollBehavior` to `ViteSSG` config. |
| **6.1** | Account page restructure with sidebar navigation | **DONE** | `AccountLayout.vue`, `AccountGeneral.vue`, `AccountSecurity.vue`, `AccountBilling.vue`, `account-routes.ts` | Split monolithic `AccountView.vue` into nested routes (`/account/general`, `/account/security`, `/account/billing`) with left sidebar layout matching legacy. Removed dev-facing hints (`emailChangeDevHint`, `code` subtitles). |
| **5.2b** | Set as default note/arrow style serialization + encryption | **DONE** | `PageEditorView.vue`, `note-editor-registry.ts` | Full crypto flow: unwraps session symmetric keyring, serializes selected note/arrow to msgpack, encrypts with `UserDefaultNote`/`UserDefaultArrow` AAD, calls `PATCH /api/users/me/defaults/{note,arrow}`. |
| **5.1f** | Note export: head/body HTML -> markdown via Turndown | **DONE** | `NotePropertiesCard.vue`, `note-editor-registry.ts` | New `getNoteEditor(noteId, section)` helper. Export uses editor registry to get head/body Tiptap instances, converts HTML to markdown with legacy-aligned Turndown rules (math, strikethrough, tables). |

| **Container** | Reverse children + import children from files | **DONE** | `container-ops.ts`, `useSpatialPage.ts`, `NotePropertiesCard.vue`, `PageEditorView.vue`, `note-content-utils.ts` | `reverseChildren()` reverses the container's `children` Y.Array in a single transaction. `importChildrenFromFiles()` creates child notes, populates head Y.XmlFragment with HTML via temporary Tiptap `Editor`, and moves them into the container. Markdown parsed with `marked` (added to web app deps). Plain text escaped and wrapped in `<p>`. |
| **Spatial parity** | Note model reactivity tests (head, body, container, anchor, link, width, timestamps) | **DONE** | `note-model.test.ts`, `note-model.ts` | Added 11 new tests covering head wrap/height, body enabled/wrap/height, container spatial/horizontal/stretchChildren/forceColorInheritance, anchor x/y, link mutations, width collapsed, and createdAt/editedAt/movedAt mutations. Fixed `anchor` reactivity bug: now reads nested `x`/`y` from Y.Map via `useYMapNumber` instead of returning raw Y.Map. |
| **Spatial parity** | Clone note (dedicated function + test) | **DONE** | `clipboard.ts`, `useSpatialPage.ts`, `useSpatialPage.test.ts` | Exported `serializeNote`/`serializeArrow` from `clipboard.ts`. Added `cloneSelection()` that bypasses clipboard indirection. Added `cloneNotes()` to `useSpatialPage` return object. Test verifies cloned notes are offset and arrows remapped to new note IDs. |

## Next Recommended Actions

1. Implement remaining arrow model parity (source/target anchors, heads, body type/style, label, color, interregional, fakePos/looseEndpoint).
2. Implement camera/viewport parity (fit-to-screen, coordinate transforms, rect math, canvas background).
3. Implement collab parity (page-level Yjs doc structure, remote cursor awareness, WS bootstrap, retry buffer).
