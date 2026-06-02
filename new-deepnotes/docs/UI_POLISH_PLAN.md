# UI Polish Plan — Legacy vs New Comparison & Roadmap

> **Source:** `docs/CURRENT_SITUATION.md` product feedback translated into a concrete engineering plan.  
> **Status:** v3 — updated after deep codebase audit (33 files read across both codebases).  
> **Key audit findings:**
> 1. **Tiptap extensions already exist** in both `note-editor-tiptap-extensions.ts` and `page-editor-tiptap-extensions.ts`. The missing piece is a **command dispatcher** that routes toolbar/shortcut actions to the correct note editor instance(s).
> 2. **Note vertical resize requires a mandatory Yjs schema migration** — add a `height` field to `page-doc-schema.ts`, `note-model.ts`, and provide a runtime fallback for persisted docs that lack it.
> 3. **~20 high-impact keyboard shortcuts are missing** compared to legacy `use-keyboard-shortcuts.ts`. A toolbar without shortcut parity is a degraded experience.
> 4. **Right-sidebar mini-mode is a parallel UI surface** requiring `PageLayout.vue` structural changes and ~321+ lines of mini-mode logic (legacy `NoteMiniProperties.vue` alone), not a cosmetic afterthought.

---

## 1. Marketing App

### 1.1 Pricing page — card sizing and toggle layout

- **Legacy:** Quasar `PlanCard` components, compact vertical layout, billing toggle sits above cards without shifting elements. Feature lists are dense with minimal vertical spacing (`space-y-1` equivalent).
- **New:** `PricingPage.vue` (`@/apps/marketing/.../PricingPage.vue:94-124`) uses `Card` with `flex flex-col` and `md:grid-cols-2`. The billing toggle row contains Monthly / Switch / Yearly / "Save 20%" badge inline; when Yearly is selected the badge appears and pushes layout. Feature list uses `space-y-3`, which makes cards feel oversized even before width is considered.
- **Problem:** Cards are too big (heavy padding, large text). Toggle row shifts left because the badge is injected into the same flex container. The real issue is also **low content density** — the feature list wastes vertical space.
- **Fix:**
  1. Reduce `Card` padding and title sizes on pricing cards (e.g. `text-xl` instead of `text-2xl`, tighten `CardHeader` spacing).
  2. **Tighten feature-list spacing** from `space-y-3` to `space-y-1.5` or `space-y-2` to increase content density to legacy levels.
  3. Move the "Save 20%" badge **above** the toggle or into a dedicated subtitle so the switch itself never moves.
  4. Consider making cards narrower (e.g. `max-w-sm`) or switching to a more compact flex layout on desktop.

### 1.2 Scroll-driven index highlighting (Whitepaper, Privacy Policy, Terms of Service)

- **Legacy:** Static nav lists. The user clicks an item to scroll; there is no scroll-spy. The CURRENT_SITUATION requests this enhancement.
- **New:** `WhitepaperPage.vue` (`@/apps/marketing/.../WhitepaperPage.vue:186-210`) already has an `activeHeading` ref and a sticky sidebar, but `activeHeading` is only set **on click**, not by scroll. `PrivacyPolicyPage.vue` and `TermsOfServicePage.vue` have sidebars but no active-state tracking **and** no `marked.lexer` heading extraction logic (unlike Whitepaper, which extracts headings manually at line 186).
- **Problem:** No visual feedback for reading position. Privacy Policy and Terms of Service pages are even further behind because they lack heading extraction entirely.
- **Fix:**
  1. Add a scroll listener (via `IntersectionObserver` or `scroll` event) that watches heading elements and updates `activeHeading`.
  2. Extract the sticky-sidebar + scroll-spy into a reusable `DocumentIndexLayout` component used by Whitepaper, PrivacyPolicy, and TermsOfService.
  3. **Port the `marked.lexer` heading extraction** from `WhitepaperPage.vue` to `PrivacyPolicyPage.vue` and `TermsOfServicePage.vue` so they can generate their index dynamically instead of hard-coding it.

### 1.3 Reset scroll on route change

- **Legacy:** Quasar's `q-page-container` + `router-view` naturally resets scroll because each route is a full page mount.
- **New:** `ViteSSG` with `createApp = ViteSSG(App, { routes })` in `marketing/main.ts` (`@/apps/marketing/.../main.ts:8`). There is **no `scrollBehavior`** configured in the router. Navigating from Home → Privacy Policy preserves the previous scroll position.
- **Fix:**
  1. Since `main.ts` uses `ViteSSG`, pass a `scrollBehavior` in the options:
     ```ts
     export const createApp = ViteSSG(App, { 
       routes,
       scrollBehavior(_to, _from, savedPosition) {
         return savedPosition ?? { top: 0 };
       },
     });
     ```
  2. Verify on all marketing route transitions.

---

## 2. Web App — Header (`MainToolbar.vue`)

### 2.1 Reduce global nav to essential icons

- **Legacy:** `MainToolbar.vue` (`@/apps/client/.../MainToolbar.vue:50-88`) contains the **full canvas toolbar** (`ToolbarContent.vue`) with cut/copy/paste/formatting/objects/alignment buttons. On the far right it has: Home icon (conditional on SPA/SSR mode), Notifications icon button, Pages settings (cog), Account icon button with `AccountPopup`. There are **no text links** for Pages, Groups, or Account.
- **New:** `MainToolbar.vue` (`@/apps/web/.../MainToolbar.vue:80-124`) has: sidebar toggles, logo, breadcrumb center slot, `PageToolbarActions` (Note/Arrow/Zoom/Fit), global text nav (Pages, Groups, Notifications, Account), theme switcher, sign in/out button.
- **Problem:** User explicitly dislikes Note, Arrow, Zoom, Pages, Groups, Notifications, and Account text buttons in the header.
- **Fix:**
  1. **Remove** `PageToolbarActions` from the header entirely (they belong in the main canvas toolbar, see §4.1). This requires deleting the `toolbar-actions` slot usage in `PageEditorView.vue` (`@/apps/web/.../PageEditorView.vue:364-372`) that currently injects them into `MainToolbar.vue` via the `PageLayout` slot.
  2. **Remove** text links for Pages, Groups, Account.
  3. Keep **Notifications** as an **icon button** (bell icon) with the unread badge.
  4. Keep **theme toggle**.
  5. Replace Sign out text button with a **profile icon button** that opens a dropdown menu containing:
     - Settings → `/account`
     - Logout
  6. Resulting header layout:
     - Left: sidebar toggle + DeepNotes logo
     - Center: breadcrumb path (unchanged)
     - Right: Notifications (icon) | ThemeSwitcher | Profile (icon dropdown) | sidebar toggle

---

## 3. Web App — Left Sidebar

### 3.1 Replace stacked cards with icon-tabbed sections

- **Legacy:** `LeftSidebar.vue` (`@/apps/client/.../LeftSidebar.vue:1-71`) uses `q-drawer` with collapsible sections: `CurrentPath`, `RecentPages`, `FavoritePages`, `SelectedPages`. Sections are resizable via weights and can be expanded/collapsed individually. No tabs.
- **New:** `PageEditorView.vue` (`@/apps/web/.../PageEditorView.vue:403-494`) left sidebar renders `Path` Card, `RecentPagesCard`, `FavoritePagesCard`, `SelectedPagesCard`, and `PageEditorCollabStatusCard` stacked vertically. The "Server collab" card is disliked.
- **Problem:** Stacked cards feel cluttered. The collab debug card is developer-facing, not user-facing.
- **Fix:**
  1. **Remove** `PageEditorCollabStatusCard` from the left sidebar (move it to a dev-only overlay or remove entirely; collab status can be shown subtly, e.g. a small dot in the header).
  2. Implement a **vertical icon tab bar** on the left edge of the sidebar, similar to legacy's concept but with each section as a tab:
     - Tabs (icon only): Path, Recent, Favorites, Selected
     - Clicking a tab shows only that section in the sidebar body.
     - Keep the section contents as Shadcn `Card` components but show one at a time.
  3. **Structural note:** `PageLayout.vue` (`@/apps/web/.../PageLayout.vue:70-87`) currently renders the left sidebar as a single scrollable `<aside>` with no tab infrastructure. Tabs require either a tab strip inside the existing slot or redesigning `PageLayout.vue` to support a two-part left sidebar (fixed `40px` tab strip + resizable content pane). Keep the outer resizable sidebar width behavior, but the inner content pane must share that width with the tab strip.

---

## 4. Web App — Main Canvas (Highest Priority)

### 4.1 Restore the main toolbar

- **Legacy:** `ToolbarContent.vue` (`@/apps/client/.../ToolbarContent.vue:1-706`) is a comprehensive, responsive toolbar with groups:
  - **Basic:** cut, copy, paste, duplicate, select all, delete
  - **Formatting:** bold, italic, strikethrough, underline, clear formatting, align left/center/right/justify, highlight, subscript, superserscript, link, code, headings H1/2/3
  - **Objects:** ordered/bullet/checklist lists, inline math, math block, blockquote, codeblock, horizontal rule, image, YouTube video
  - **Tables:** insert/remove table, columns, rows, merge/split cells
  - **Alignment:** align left/center/right/top/center-vertical/bottom/horizontal-center/distribute-vertically/distribute-horizontally
  - **Overflow logic:** buttons that don't fit collapse into a `…` menu driven by `ResizeObserver`.
- **New:** **No main toolbar exists.** `PageToolbarActions.vue` in the header has only Note, Arrow, Zoom, Fit. Floating buttons on the right side of the canvas (`SpatialPageView.vue` `@/apps/web/.../SpatialPageView.vue:370-484`) have: zoom %, reset zoom, fit to screen, **back, forward**, find/replace, screenshot, undo, redo. Legacy `DisplayRightBtns.vue` (`@/apps/client/.../DisplayRightBtns.vue:1-97`) only had 5 buttons (reset zoom, fit, zoom %, undo, redo). The new floating panel has nearly doubled the count because the main toolbar disappeared.
- **Critical finding:** `note-editor-tiptap-extensions.ts` (`@/apps/web/.../note-editor-tiptap-extensions.ts:1-100`) and `page-editor-tiptap-extensions.ts` (`@/apps/web/.../page-editor-tiptap-extensions.ts:1-109`) **already import** `StarterKit`, `Underline`, `TextAlign`, `Subscript`, `Superscript`, `Link`, `Highlight`, `Image`, `TaskList`, `TaskItem`, `Table` (+ `TableRow`, `TableHeader`, `TableCell`), `CodeBlockLowlight`, `InlineMathTipTapExtension`, `MathBlockTipTapExtension`, `YoutubeVideoTipTapExtension`, `HorizontalRule`, `Placeholder`, and `Collaboration`. **The extensions are present; the missing piece is the command dispatcher.**
- **Problem:** The rich text editing experience is completely broken without formatting tools. The floating right-side buttons are too many and crowd the canvas. A toolbar built without keyboard shortcuts will be a mouse-only degraded experience.
- **Fix:**
  1. **Build a new `CanvasToolbar.vue`** positioned directly above the canvas area (inside `PageLayout` main slot, top edge) or fixed at the top of the canvas.
  2. Replicate legacy toolbar groups but with **Shadcn/Tailwind** styling and **Lucide icons** instead of MDI.
  3. **Command dispatcher (mandatory prerequisite):** Before wiring buttons, build a dispatcher that, given a command name (e.g. `toggleBold`), finds the active Tiptap editor(s) for the currently selected note(s) and calls `editor.chain().toggleBold().run()`. Legacy uses `page.selection.toggleMark('bold')` and `page.selection.format((chain) => chain.toggleBulletList())` which abstracts over single/multi-note selection. The new app needs an equivalent abstraction because `useSpatialKeyboard.ts` (`@/apps/web/.../useSpatialKeyboard.ts:1-263`) already iterates over selected notes and applies commands to each editor.
  4. Implement responsive overflow: if the toolbar doesn't fit, collapse overflow groups into a `…` dropdown menu.
     > **Note:** This is likely underestimated as "Large". Legacy `ToolbarContent.vue` is ~706 lines with dynamic `ResizeObserver`-driven overflow, ~30 Tiptap-integrated buttons, and table operations. Consider splitting into phases:
     > - **4.1a** Command dispatcher + toolbar shell + overflow logic
     > - **4.1b** Basic & Formatting groups + shortcut wiring
     > - **4.1c** Objects, Tables, and Alignment groups + shortcut wiring
  5. **Remove** the floating right-side buttons currently in `SpatialPageView.vue` and move them into the toolbar or eliminate:
     - Zoom % label → keep, but make it smaller or move to bottom-left.
     - Reset zoom / Fit to screen → move into a "View" group in the toolbar.
     - Back/Forward → remove from canvas (browser nav is sufficient).
     - Find/Replace → keep as `Ctrl+F` shortcut, optionally add a toolbar button.
     - Screenshot → keep as `Alt+Shift+S` shortcut, optionally add a toolbar button.
     - Undo/Redo → move into Basic group in the toolbar.
  6. Keep the **Note / Arrow insert** buttons in the toolbar (they are currently in `PageToolbarActions` which should be removed from header).

### 4.2 Fix note interaction bugs

- **Legacy:** `DisplayNote.vue` (legacy) handles double-click to enter edit mode, has proper resize handles that appear only on selection, supports vertical resizing, and has sophisticated drag/selection logic.
- **New:** `DisplayNote.vue` (`@/apps/web/.../DisplayNote.vue:1-403`) has the following problems identified in `CURRENT_SITUATION`:
  1. **Can't resize vertically at all** — `onResizePointerMove` (`@/apps/web/.../DisplayNote.vue:211-229`) only computes `dx` and updates `widthMap.set("expanded", ...)` and `posMap.set("x", ...)`. It never computes `dy` or updates a height property.
  2. **Double-clicking creates another note** — `useCanvasActions.ts:onCanvasDoubleClick` (`@/apps/web/.../useCanvasActions.ts:27-46`) calls `createNoteAt(world.x, world.y, ...)` unconditionally. It does not check `e.target` or `e.composedPath()` to see if the double-click originated on a note.
  3. **Resize handles are always visible** — Handles are rendered whenever `model.resizable.value && !model.readOnly.value` (`@/apps/web/.../DisplayNote.vue:332`), regardless of selection state. Legacy shows handles only when the note is selected.
  4. **Missing edit mode activation on frame click** — `DisplayNote.vue` only emits `edit-start` on `@focusin` of the head/body editors (lines 304, 320). Clicking the note border or empty frame never enters edit mode. Legacy likely handled this via `NoteFrame.vue` or the editing composable.
- **Schema finding:** `page-doc-schema.ts` (`@/packages/collab-wire/.../page-doc-schema.ts:148-168`) defines `createNoteMap()` which sets `width` to `createDefaultSize()` (expanded/collapsed) but there is **no `height` key anywhere**. `note-model.ts` (`@/apps/web/.../note-model.ts:1-172`) defines `headHeight` and `bodyHeight` but not a top-level `height` for the entire note. A vertical resize feature requires schema support.
- **Fix:**
  1. **Vertical resize (schema migration required):**
     - Add `height` to `YPAGE_NOTE_KEY` in `page-doc-schema.ts`.
     - Add `createDefaultSize()` for `height` inside `createNoteMap()` (same shape as `width`).
     - Add `height` reactivity to `note-model.ts` (read/write reactive proxies similar to `width`).
     - Extend `onResizePointerMove` in `DisplayNote.vue` to compute `dy` from `e.clientY`, update the height map for south handles, and update `pos.y` for north handles.
     - **Migration:** Persisted Yjs docs that lack the `height` key must have it backfilled on load (e.g., set `height.expanded = "Auto"` if missing). This is **not optional** — existing docs will crash or ignore the key if it is absent.
  2. **Double-click to edit:** Two viable fixes:
     - In `useCanvasActions.ts`, check `e.target` or `e.composedPath()` and bail out if a note is in the path.
     - In `DisplayNote.vue`, add `@dblclick.stop` on the note frame so the event never reaches the canvas handler.
     > Note: `DisplayNote.vue` already emits `edit-start` on `@focusin` of the head/body editors, so the Tiptap focus mechanism is already wired; the issue is purely the canvas creating a new note before the note can react.
  3. **Resize handles visibility:** Change the handle render condition from `model.resizable.value && !model.readOnly.value` to `model.resizable.value && !model.readOnly.value && props.selected`. Only selected notes show handles.
  4. **Edit mode on frame click:** Add a `@dblclick` handler on the note frame (or an invisible overlay) that emits `edit-start` targeting the head editor (or whichever section is enabled).
  5. **Pointer capture on resize:** Ensure resize handles call `setPointerCapture` on pointerdown and `releasePointerCapture` on pointerup (currently they do at lines 193-210). Verify the event target is the handle, not the note body.

### 4.3 Keep UI close to legacy

- **Colors:** Legacy uses a dark grey (`#181818`) canvas with white text. New uses `bg-background` (light/dark via Tailwind). The user wants light/dark support but UI behavior close to legacy.
- **Selection:** Legacy uses a blue-ish selection ring. New uses `ring-2 ring-[#2196f3]`. This is fine; keep it.
- **Context menus:** Legacy has table context menu, note context menu, and canvas context menu. New has `CanvasContextMenu.vue` (`@/apps/web/.../CanvasContextMenu.vue:65-104`: Create note, Paste, Copy, Cut, Delete) and `NoteContextMenu.vue` (`@/apps/web/.../NoteContextMenu.vue:59-98`: Bring to front, Send to back, Copy, Cut, Delete) but they are basic.
- **UI polish:** `NotePropertiesCard.vue` (`@/apps/web/.../NotePropertiesCard.vue:180-202`) and `ArrowPropertiesCard.vue` use raw HTML `<select>` elements for anchor and width inputs instead of Shadcn `Select` components. This breaks visual consistency and contributes to the "ugly" feel.
- **Fix:**
  - Replace raw `<select>` elements in `NotePropertiesCard.vue` (anchor X/Y, width) and `ArrowPropertiesCard.vue` (body type, body style) with Shadcn `Select` / `SelectItem` components.
  - Expand `CanvasContextMenu` to include full legacy operations: paste, duplicate, select all, cut, copy, delete.
  - Expand `NoteContextMenu` to include: paste, duplicate, select all, cut, copy, delete, bring to front, send to back.
  - Add a `TableContextMenu` for table operations (insert/remove rows/columns, merge/split cells) to match legacy.

---

## 5. Web App — Right Sidebar

### 5.1 Port legacy property panels to Shadcn

- **Legacy:** `RightSidebar.vue` has a mini-mode (icon buttons, `48px` collapsed strip) and expanded mode. 
  - `NoteProperties.vue` (`@/apps/client/.../NoteProperties.vue:1-766`) is ~766 lines with rich controls: LinkURL input, **Create new page** split button (`DeepBtnDropdown`), Head/Body enabled toggles, **swap head/body** button, timestamps (createdAt, editedAt, movedAt), copy link to note, set as default note style, anchor X/Y numeric inputs, width/head-height/body-height/container-height combos (Auto / Minimum / explicit px), `ColorPalette` component, Collapsible/Collapsed/Local collapsing/Locally collapsed toggles, `NoteContainerProperties` sub-component (enabled, spatial, horizontal, wrap children, stretch children, force color inheritance), Movable/Resizable/Wrap head/Wrap body/Read-only toggles, `NoteExport` sub-component.
  - `ArrowProperties.vue` (`@/apps/client/.../ArrowProperties.vue:1-385`) is ~385 lines with: mini-mode (`MiniSidebarBtn` icons for backward, swap, forward, dashed, color palette), Source/Target anchor selects (Auto/Left/Top/Right/Bottom), Source/Target head selects (`none`/`open`), **swap arrowheads** button, Body type/style selects, `ColorPalette`, copy link, set as default, timestamps.
  - `PageProperties.vue` (`@/apps/client/.../PageProperties.vue:1-229`) is ~229 lines with: relative/absolute title inputs, page ID + copy link, **group settings** button, **move page** button, favorite/unfavorite, **delete page**, `PageSelection` sub-component, `VersionHistory` sub-component, `PageBacklinks` sub-component.
- **New:** `NotePropertiesCard.vue` (`@/apps/web/.../NotePropertiesCard.vue:1-354`) is 354 lines, `ArrowPropertiesCard.vue` (`@/apps/web/.../ArrowPropertiesCard.vue:1-176`) is 176 lines, `PagePropertiesCard.vue` (`@/apps/web/.../PagePropertiesCard.vue:1-109`) is 109 lines. These use Shadcn `Card` but are much simpler.
  - **Missing from `NotePropertiesCard`:** Create new page, swap head/body, timestamps, copy link, set as default, anchor numeric inputs, width/height combos beyond Auto/Minimum, `ColorPalette` (has a simple HSL row but not the legacy palette), collapsible/local collapsing, container properties, note export.
  - **Missing from `ArrowPropertiesCard`:** mini-mode, source/target anchor selects, source/target head *selects* (new uses boolean Switch which discards the `"none"`/`"open"` distinction in the schema), swap arrowheads, timestamps, copy link, set as default.
  - **Missing from `PagePropertiesCard`:** group settings, move page, delete page, page selection, version history, backlinks. However, the new `PageEditorView.vue` (`@/apps/web/.../PageEditorView.vue:497-599`) renders `PageEditorSnapshotsCard`, `PageEditorManagementCard`, and `PageEditorBacklinksCard` as **separate cards** in the right sidebar, which partially covers snapshots, management, and backlinks but fragments the UI.
- **Problem:** User says it's "very ugly" and missing "Create new page" which is central. The sidebar is both visually inconsistent (raw `<select>`) and functionally incomplete.
- **Fix:**
  1. **Visual density:** Reduce excessive `space-y-3` gaps between cards. Use tighter spacing (`space-y-2` or `gap-3` on a single wrapper). Remove card borders inside the sidebar or use `variant="ghost"` cards.
  2. **Add missing controls to `NotePropertiesCard`:**
     - Link URL input (verify if it exists; if not, add it).
     - **Create new page button** (the critical missing feature)
     - Head/Body enabled toggles
     - Swap head and body button
     - Timestamps (createdAt, editedAt, movedAt)
     - Copy link to note
     - Set as default note style
     - Anchor X/Y numeric inputs
     - Width/Height combos (Auto / Minimum / explicit px)
     - Color palette (horizontal, compact, matching legacy `ColorPalette` behavior)
     - Collapsible / Collapsed / Local collapsing toggles
     - Container properties (enabled, spatial, horizontal, wrap children, stretch children, force color inheritance)
     - Movable / Resizable / Wrap head / Wrap body / Read-only toggles
     - Note export UI
  3. **Add missing controls to `ArrowPropertiesCard`:**
     - Source/target anchor select (Auto / Left / Top / Right / Bottom), matching legacy `q-select` behavior.
     - Source/target head toggles (currently only boolean on/off; legacy uses `none`/`open`). The schema (`page-doc-schema.ts`) supports `none`/`open` — the UI must expose both states, not just a boolean Switch.
     - Swap arrowheads button.
     - Body type/style select (migrate from raw `<select>`/button toggles to Shadcn `Select`).
     - Color palette (horizontal, compact).
     - Timestamps (createdAt, editedAt).
     - Copy link to arrow.
     - Set as default arrow style.
  4. **Consolidate page properties:** Move `PageEditorSnapshotsCard`, `PageEditorManagementCard`, and `PageEditorBacklinksCard` content **into** `PagePropertiesCard` so the right sidebar shows a single cohesive card when no note/arrow is selected, matching legacy `PageProperties.vue`.
  5. **Add mini-mode (structural requirement):** When the right sidebar is collapsed, show a thin vertical strip of icon buttons (like legacy `NoteMiniProperties.vue` / `ArrowProperties.vue` mini lists). 
     - Legacy `NoteMiniProperties.vue` (`@/apps/client/.../NoteMiniProperties.vue:1-321`) alone is **321 lines** of dense icon-button logic including Create new page, head/body toggles, collapsible, container, and color palette.
     - This requires `PageLayout.vue` (`@/apps/web/.../PageLayout.vue:102-111`) to support a mini-width (e.g., `48px`) for the right aside. Currently it hardcodes the right sidebar to `300px` with `v-show`. There is no collapsed width or mini-mode infrastructure.
     - **Task:** Add `rightMiniWidth` state to `PageLayout.vue`, build mini-property components for notes, arrows, and pages.

### 5.2 Add "Create new page" functionality

- **Legacy:** `NoteProperties.vue` (`@/apps/client/.../NoteProperties.vue:1-766`) has a prominent "Create new page" split button. It extracts the note's text as the initial page title, creates the page via API, sets the note's `link` to the new page, and navigates to it.
- **New:** No equivalent exists in `NotePropertiesCard.vue`.
- **Fix:**
  1. Add the "Create new page" button to `NotePropertiesCard`.
  2. Implement `getInitialPageTitle` logic (extract first line from selected note's head/body text).
  3. Call `POST /api/pages` with the title and current group/page as parent.
  4. Set the note's `link` to `/pages/${newPageId}`.
  5. Optionally navigate to the new page.
  6. **Mini-mode duplication:** Legacy `NoteMiniProperties.vue` also has a "Create new page" icon button in mini-mode. If mini-mode is implemented (§5.1 step 5), this feature must be duplicated there too.

---

## 6. Account Page

### 6.1 Re-structure with sidebar navigation

- **Legacy:** `Account.vue` (`@/apps/client/.../Account.vue:1-81`) has a left nav sidebar with General, Billing, Security tabs and a `router-view` on the right. This keeps the page organized and not overwhelming.
- **New:** `AccountView.vue` (`@/apps/web/.../AccountView.vue:1-830`) is a monolithic 830-line single long vertical stack of cards on one page. No sidebar, no sub-routes.
- **Problem:** User says it's "incredibly ugly" — mainly because it's an intimidating wall of forms. It also contains developer-facing information that leaks into the UI.
- **Fix:**
  1. Split `AccountView.vue` into sub-routes or at least tabbed sections:
     - **General** — email verification, change email, confirm email change, danger zone (delete account)
     - **Security** — change password, 2FA setup/disable/recovery codes
     - **Billing** — subscription, Stripe checkout/portal
  2. Use a **left sidebar layout** similar to legacy Account page, or use Shadcn `Tabs` at the top of the page.
  3. **Router verification:** Check if `/account/general`, `/account/billing`, `/account/security` sub-routes exist in the new router config. If not, add them. Legacy used nested routes under `/account`; the new app must do the same or use query params/hash fragments.
  4. Improve visual hierarchy:
     - Use `Card` sparingly; group related settings inside bordered sections instead of every field getting its own card.
     - Increase whitespace between major sections.
     - Use `Label` + `Input` consistently; align buttons to the right of forms.
  5. Remove the developer-facing `code` descriptions from card subtitles (e.g. "REST (/api/users/me/**)", "STRIPE_* variables", "SEND_EMAILS=false"). These should be in dev docs, not the UI.
  6. Remove `emailChangeDevHint` from the UI (`AccountView.vue:608-611`): when `SEND_EMAILS=false`, the raw verification code is echoed into the page as plain text (`<p v-if="emailChangeDevHint" class="font-mono text-xs">Dev code: {{ emailChangeDevHint }}</p>`). This is a security/polish issue — the code should be logged to the console in dev mode only, or simply show a generic "check dev logs" message.

---

## 7. Keyboard Shortcut Parity (New Section)

Legacy `use-keyboard-shortcuts.ts` (`@/apps/client/.../use-keyboard-shortcuts.ts:1-382`) has **~40 distinct shortcuts**, split between editing-mode and canvas-mode. New `useSpatialKeyboard.ts` (`@/apps/web/.../useSpatialKeyboard.ts:1-263`) has **~20 shortcuts**. A toolbar without these shortcuts is a mouse-only degraded experience.

### 7.1 Missing shortcuts — high impact

| Shortcut | Legacy Action | New Status | Where to add |
|----------|---------------|------------|--------------|
| `Ctrl+Space` | Clear formatting | Missing | Editing mode, toolbar dispatcher |
| `Ctrl+Shift+X` | Strikethrough | Missing | Editing mode, toolbar dispatcher |
| `Ctrl+Shift+H` | Highlight | Missing | Editing mode, toolbar dispatcher |
| `Ctrl+Shift+7/8/9` | Ordered / Bullet / Checklist | Missing | Editing mode, toolbar dispatcher |
| `Alt+1/2/3` | Heading 1/2/3 | Missing | Editing mode, toolbar dispatcher |
| `Alt+0` | Remove heading | Missing | Editing mode, toolbar dispatcher |
| `Alt+Shift+Q` | Blockquote | Missing | Editing mode, toolbar dispatcher |
| `Alt+Shift+C` | Code block | Missing | Editing mode, toolbar dispatcher |
| `Alt+Shift+R` | Horizontal rule | Missing | Editing mode, toolbar dispatcher |
| `Alt+Shift+I` | Insert image dialog | Missing | Editing mode, toolbar dispatcher |
| `Alt+Shift+Y` | Insert YouTube video | Missing | Editing mode, toolbar dispatcher |
| `Alt+Shift+T` | Insert table (3×3) | Missing | Editing mode, toolbar dispatcher |
| `Ctrl+Comma` | Subscript | Missing | Editing mode, toolbar dispatcher |
| `Ctrl+Period` | Superscript | Missing | Editing mode, toolbar dispatcher |
| `Ctrl+K` | Insert link dialog | Missing | Editing mode, toolbar dispatcher |
| `Ctrl+M` | Inline math | Missing | Editing mode, toolbar dispatcher |
| `Ctrl+Shift+M` | Math block | Missing | Editing mode, toolbar dispatcher |
| `F2` | Start editing active element | Missing | Canvas mode, `useSpatialKeyboard.ts` |
| `F3` / `Shift+F3` | Find next / previous | Missing | Canvas mode, `useSpatialKeyboard.ts` |
| `Ctrl+H` | Find and replace | Missing | Canvas mode, `useSpatialKeyboard.ts` |
| `Arrow keys` (no mod) | Nudge selected notes by 1/zoom px | Missing | Canvas mode, `useSpatialKeyboard.ts` |
| `Ctrl+D` | Duplicate selection | Missing | Canvas mode, `useSpatialKeyboard.ts` |
| `Backspace` (no selection) | Go backward in history | Missing | Canvas mode, `useSpatialKeyboard.ts` |
| `Backspace` (with active elem) | Start editing + delete selection | Missing | Canvas mode, `useSpatialKeyboard.ts` |

### 7.2 Existing shortcuts — verified present

The following are already implemented in `useSpatialKeyboard.ts` and should be preserved:
- `Escape` — stop editing / close find-and-replace
- `Delete/Backspace` (no active elem) — delete selected notes/arrows
- `Ctrl+A` — select all
- `Ctrl+Z/Y` — undo / redo
- `Ctrl+X/C/V` — cut / copy / paste
- `Ctrl+F` — find / replace toggle
- `Alt+Shift+S` — screenshot
- `Tab` / `Enter` — selection navigation / editing start
- `Ctrl+B/I/U` — bold / italic / underline
- `Ctrl+Shift+L/C/R/T/M/B/H/V` — align left/center/right/top/middle/bottom/distribute-horizontally/distribute-vertically

### 7.3 Implementation recommendation

1. Extend `useSpatialKeyboard.ts` with the missing canvas-mode shortcuts (`F2`, `F3`, arrow nudge, `Ctrl+D`, `Backspace` navigation).
2. Build an **editing-mode keyboard handler** inside the command dispatcher (§4.1 step 3) so that when a note is in edit mode, shortcuts like `Alt+Shift+T` are captured by the focused Tiptap editor and routed to the correct chain command.
3. Every toolbar button must expose its keyboard shortcut in a tooltip so users can discover them.

---

## 8. Implementation Order

| Priority | Section | Files to Touch | Est. Effort | Notes |
|----------|---------|----------------|-------------|-------|
| **P0** | 4.2 Fix note interactions (resize, double-click, handles) | `DisplayNote.vue`, `useCanvasActions.ts`, `page-doc-schema.ts`, `note-model.ts` | **Medium–Large** | Vertical resize requires Yjs schema migration (add `height` key + backfill). |
| **P0** | 7. Keyboard shortcut parity | `useSpatialKeyboard.ts`, command dispatcher | **Large** | ~22 missing shortcuts. Must be wired before or alongside the toolbar. |
| **P0** | 4.1 Restore main toolbar | New `CanvasToolbar.vue`, command dispatcher, `PageLayout.vue`, `SpatialPageView.vue` (remove floating buttons) | **Extra-Large** | Split into 4.1a (dispatcher), 4.1b (basic/formatting), 4.1c (objects/tables/alignment). Tiptap extensions already exist. |
| **P1** | 2.1 Simplify header | `MainToolbar.vue`, `PageEditorView.vue` (remove slot usage) | **Small** | Delete slot usage in `PageEditorView.vue:364-372`. |
| **P1** | 3.1 Left sidebar tabs | `PageEditorView.vue`, new sidebar tab component, `PageLayout.vue` | **Medium** | Requires structural decision: tab strip inside slot vs. `PageLayout.vue` two-part sidebar. |
| **P1** | 5.1 & 5.2 Right sidebar parity + create page | `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `PagePropertiesCard.vue`, `PageLayout.vue` (mini-mode) | **Extra-Large** | Includes mini-mode infrastructure (`rightMiniWidth` in `PageLayout.vue`) and ~321 lines of mini-mode logic for notes alone. |
| **P1** | 4.3 Context menu expansion | `CanvasContextMenu.vue`, `NoteContextMenu.vue`, `SpatialPageView.vue` | **Small** | Add duplicate, select all, table context menu. |
| **P2** | 6.1 Account page restructure | `AccountView.vue`, new sub-components/routes, router config | **Medium** | Verify/add `/account/general`, `/account/billing`, `/account/security` routes. |
| **P2** | 1.2 Scroll-driven index | `WhitepaperPage.vue`, `PrivacyPolicyPage.vue`, `TermsOfServicePage.vue`, new `DocumentIndexLayout` | **Small** | Port `marked.lexer` heading extraction to PrivacyPolicy and TermsOfService. |
| **P2** | 1.1 Pricing layout fix | `PricingPage.vue` | **Small** | Move badge, tighten spacing. |
| **P2** | 1.3 Marketing scroll reset | `marketing/src/main.ts` | **Tiny** | Single `scrollBehavior` option. |

### Re-prioritization suggestion
Consider moving **§1.3 (scroll reset)** and **§1.1 (pricing layout)** to a pre-P0 "quick wins" batch. They are Tiny/Small, fix immediate user-facing polish issues, and carry zero risk.

---

## 9. Schema Migration Notes (Yjs)

### Note `height` field

**Current state:** `page-doc-schema.ts` (`@/packages/collab-wire/.../page-doc-schema.ts:148-168`) defines `createNoteMap()` with `width: createDefaultSize()` but no `height`. `note-model.ts` (`@/apps/web/.../note-model.ts:1-172`) exposes `width` reactivity but not `height`.

**Required changes:**
1. Add `height: "height"` to `YPAGE_NOTE_KEY`.
2. In `createNoteMap()`, add `note.set(YPAGE_NOTE_KEY.height, createDefaultSize())`.
3. In `note-model.ts`, add reactive `height` proxies (read `height.expanded`/`height.collapsed`, write back to Y.Map) analogous to `width`.
4. In `DisplayNote.vue`, read `model.height.value.expanded` during resize and render.
5. **Migration / backfill:** On doc load (or inside `createNoteMap` bootstrap), check if the note map has the `height` key. If absent, set `height.expanded = "Auto"` and `height.collapsed = "Auto"`.

**Risk:** Low. "Auto" is the safe default that preserves current auto-measuring behavior.

---

## 10. Legacy Reference Quick-Map

| New File | Legacy Equivalent | Notes |
|----------|-------------------|-------|
| `MainToolbar.vue` | `PagesLayout/MainToolbar/MainToolbar.vue` + `ToolbarContent.vue` | Legacy toolbar lives *inside* the header. New app must separate them. |
| `PageLayout.vue` | `PagesLayout/PagesLayout.vue` + `LeftSidebar.vue` + `RightSidebar.vue` | New layout lacks mini-mode and tab infrastructure. |
| `PageEditorView.vue` | `MainContent/DisplayPage/DisplayPage.vue` + sidebar sections | Fragments page properties into multiple cards. |
| `DisplayNote.vue` | `DisplayWorld/DisplayNote/DisplayNote.vue` | Missing vertical resize, edit-on-frame, handle visibility. |
| `DisplayArrow.vue` | `DisplayWorld/DisplayArrow/DisplayArrow.vue` | — |
| `SpatialPageView.vue` | `MainContent/MainContent.vue` + `DisplayUI/DisplayUI.vue` | Floating buttons grew from 5 to 9 because toolbar vanished. |
| `NotePropertiesCard.vue` | `RightSidebar/NoteProperties/NoteProperties.vue` | Missing ~50% of legacy features. |
| `ArrowPropertiesCard.vue` | `RightSidebar/ArrowProperties.vue` | Missing mini-mode, anchor selects, timestamps. |
| `PagePropertiesCard.vue` | `RightSidebar/PageProperties/PageProperties.vue` | Missing group settings, move page, delete, version history. |
| `AccountView.vue` | `pages/home/Account/Account.vue` + `General.vue` + `Security.vue` | Monolithic 830 lines vs. sidebar + router-view. |
| `PricingPage.vue` | `pages/home/Pricing/Pricing.vue` | Layout shift bug introduced by badge inline with toggle. |
| `WhitepaperPage.vue` | `pages/home/Whitepaper/Whitepaper.vue` | Missing scroll-spy; heading extraction not ported to Privacy/Terms. |
| `useCanvasActions.ts` | Distributed across `page.cloning`, `page.clipboard`, `page.deleting`, `page.selection` | New composable architecture is cleaner but lacks some guards (e.g. `e.target` check). |
| `useSpatialKeyboard.ts` | `code/pages/composables/use-keyboard-shortcuts.ts` | ~20 shortcuts vs. ~40 in legacy. |
| `page-doc-schema.ts` | `SyncedStore` shape (legacy) | Replicates shape but missing `height` field. |

---

*End of plan — v3*
