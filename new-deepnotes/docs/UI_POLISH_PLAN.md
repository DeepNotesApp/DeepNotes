# UI Polish Plan — Legacy vs New Comparison & Roadmap

> **Source:** `docs/CURRENT_SITUATION.md` product feedback translated into a concrete engineering plan.  
> **Status:** Ready for implementation. Each section has a priority, a legacy reference, a new-state problem statement, and a concrete fix.

---

## 1. Marketing App

### 1.1 Pricing page — card sizing and toggle layout

- **Legacy:** Quasar `PlanCard` components, compact vertical layout, billing toggle sits above cards without shifting elements.
- **New:** `PricingPage.vue` uses `Card` with `flex flex-col` and `md:grid-cols-2`. The billing toggle row contains Monthly / Switch / Yearly / "Save 20%" badge inline; when Yearly is selected the badge appears and pushes layout.
- **Problem:** Cards are too big (heavy padding, large text). Toggle row shifts left because the badge is injected into the same flex container.
- **Fix:**
  1. Reduce `Card` padding and title sizes on pricing cards (e.g. `text-xl` instead of `text-2xl`, tighten `CardHeader` spacing).
  2. Move the "Save 20%" badge **above** the toggle or into a dedicated subtitle so the switch itself never moves.
  3. Consider making cards narrower (e.g. `max-w-sm`) or switching to a more compact flex layout on desktop.

### 1.2 Scroll-driven index highlighting (Whitepaper, Privacy Policy, Terms of Service)

- **Legacy:** `WhitepaperItems.vue`, `PrivacyPolicyItems.vue`, `TermsOfServiceItems.vue` are static nav lists. The user clicks an item to scroll; there is no scroll-spy. The CURRENT_SITUATION requests this enhancement.
- **New:** `WhitepaperPage.vue` already has an `activeHeading` ref and a sticky sidebar, but `activeHeading` is only set **on click**, not by scroll.
- **PrivacyPolicyPage.vue** and **TermsOfServicePage.vue** have a sidebar but no active-state tracking at all.
- **Fix:**
  1. Add a scroll listener (via `IntersectionObserver` or `scroll` event) that watches heading elements and updates `activeHeading`.
  2. Extract the sticky-sidebar + scroll-spy into a reusable `DocumentIndexLayout` component used by Whitepaper, PrivacyPolicy, and TermsOfService.
  3. Keep the existing `marked.lexer` heading extraction; just wire scroll tracking to it.

### 1.3 Reset scroll on route change

- **Legacy:** Quasar's `q-page-container` + `router-view` naturally resets scroll because each route is a full page mount.
- **New:** `ViteSSG` with `createApp = ViteSSG(App, { routes })`. There is **no `scrollBehavior`** configured in the router. Navigating from Home → Privacy Policy preserves the previous scroll position.
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

- **Legacy:** `MainToolbar.vue` (PagesLayout) contains the **full canvas toolbar** (`ToolbarContent.vue`) with cut/copy/paste/formatting/objects/alignment buttons. On the far right it has: Home icon, Notifications icon button, Pages settings (cog), Account icon button with `AccountPopup`.
- **New:** `MainToolbar.vue` (new app) has: sidebar toggles, logo, breadcrumb center slot, `PageToolbarActions` (Note/Arrow/Zoom/Fit), global text nav (Pages, Groups, Notifications, Account), theme switcher, sign in/out button, sidebar toggle.
- **Problem:** User explicitly dislikes Note, Arrow, Zoom, Pages, Groups, Notifications, and Account text buttons in the header.
- **Fix:**
  1. **Remove** `PageToolbarActions` from the header entirely (they belong in the main canvas toolbar, see §3).
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

- **Legacy:** `LeftSidebar.vue` uses `q-drawer` with collapsible sections: `CurrentPath`, `RecentPages`, `FavoritePages`, `SelectedPages`. Sections are resizable via weights and can be expanded/collapsed individually. No tabs.
- **New:** `PageEditorView.vue` left sidebar renders `Path` Card, `RecentPagesCard`, `FavoritePagesCard`, `SelectedPagesCard`, and `PageEditorCollabStatusCard` stacked vertically. The "Server collab" card is disliked.
- **Problem:** Stacked cards feel cluttered. The collab debug card is developer-facing, not user-facing.
- **Fix:**
  1. **Remove** `PageEditorCollabStatusCard` from the left sidebar (move it to a dev-only overlay or remove entirely; collab status can be shown subtly, e.g. a small dot in the header).
  2. Implement a **vertical icon tab bar** on the left edge of the sidebar, similar to legacy's concept but with each section as a tab:
     - Tabs (icon only): Path, Recent, Favorites, Selected
     - Clicking a tab shows only that section in the sidebar body.
     - Keep the section contents as Shadcn `Card` components but show one at a time.
  3. Keep the resizable sidebar width behavior (`PageLayout.vue` already supports this).

---

## 4. Web App — Main Canvas (Highest Priority)

### 4.1 Restore the main toolbar

- **Legacy:** `ToolbarContent.vue` is a comprehensive, responsive toolbar with groups:
   - Basic: cut, copy, paste, duplicate, select all, delete
   - Formatting: bold, italic, strikethrough, underline, clear formatting, align left/center/right/justify, highlight, subscript, superscript, link, code, headings H1/2/3
   - Objects: ordered/bullet/checklist lists, inline math, math block, blockquote, codeblock, horizontal rule, image, YouTube video
   - Tables: insert/remove table, columns, rows, merge/split cells
   - Alignment: align left/center/right/top/center-vertical/bottom
   - Overflow logic: buttons that don't fit collapse into a `…` menu.
- **New:** **No main toolbar exists.** `PageToolbarActions.vue` in the header has only Note, Arrow, Zoom, Fit. Floating buttons on the right side of the canvas have: zoom %, reset zoom, fit to screen, back, forward, find/replace, screenshot, undo, redo.
- **Problem:** The rich text editing experience is completely broken without formatting tools. The floating right-side buttons are too many and crowd the canvas.
- **Fix:**
  1. **Build a new `CanvasToolbar.vue`** positioned directly above the canvas area (inside `PageLayout` main slot, top edge) or fixed at the top of the canvas.
  2. Replicate legacy toolbar groups but with **Shadcn/Tailwind** styling and **Lucide icons** instead of MDI.
  3. Implement responsive overflow: if the toolbar doesn't fit, collapse overflow groups into a `…` dropdown menu.
     > **Note:** This is likely underestimated as "Large". Legacy `ToolbarContent.vue` is ~706 lines with dynamic `ResizeObserver`-driven overflow, ~30 Tiptap-integrated buttons, and table operations. Consider splitting into phases: 4.1a toolbar shell + overflow, 4.1b formatting groups, 4.1c tables/advanced.
  4. **Remove** the floating right-side buttons currently in `SpatialPageView.vue` (zoom %, reset zoom, fit, back/forward, find/replace, screenshot, undo/redo) and move them into the toolbar or eliminate:
     - Zoom % label → keep, but make it smaller or move to bottom-left.
     - Reset zoom / Fit to screen → move into a "View" group in the toolbar.
     - Back/Forward → remove from canvas (browser nav is sufficient).
     - Find/Replace → keep as Ctrl+F shortcut, optionally add a toolbar button.
     - Screenshot → keep as Alt+Shift+S shortcut, optionally add a toolbar button.
     - Undo/Redo → move into Basic group in the toolbar.
  5. Keep the **Note / Arrow insert** buttons in the toolbar (they are currently in `PageToolbarActions` which should be removed from header).

### 4.2 Fix note interaction bugs

- **Legacy:** `DisplayNote.vue` (legacy) handles double-click to enter edit mode, has proper resize handles that appear only on selection, supports vertical resizing, and has sophisticated drag/selection logic.
- **New:** `DisplayNote.vue` (new) has the following problems identified in CURRENT_SITUATION:
  1. **Can't resize vertically at all** — `onResizePointerMove` only updates width and x-position for west handles; height is never changed.
  2. **Double-clicking creates another note** — `useCanvasActions.ts:onCanvasDoubleClick` calls `createNoteAt(world.x, world.y, …)` unconditionally on the canvas. It does not check if the double-click happened on an existing note.
  3. **Resize handles are always visible** — The handles are rendered whenever `model.resizable.value && !model.readOnly.value`, regardless of selection state. Legacy shows handles only when the note is selected.
  4. **Innumerous other problems** (implied: missing edit mode activation, no pointer capture on resize, etc.)
- **Fix:**
  1. **Vertical resize:** Extend `onResizePointerMove` to compute `dy` and update note height (and y-position for north handles). The note model currently only tracks width; height is auto-measured. We need to decide:
     - Option A: Add a `height` field to the Yjs note schema and make resize update it.
     - Option B: Keep auto-height for content but allow a manual override when resizing.
     **Recommendation:** Follow legacy behavior — notes are auto-height by default but can have explicit height when resized. Since the schema may not support it yet, this may require a collab schema migration (add `height.expanded` similar to `width.expanded`).
  2. **Double-click to edit:** `onCanvasDoubleClick` fires on the canvas container and does not check `e.target`, so it runs even when the double-click originates on a note. Two viable fixes:
     - In `useCanvasActions.ts`, check `e.target` or `e.composedPath()` and bail out if a note is in the path.
     - In `DisplayNote.vue`, add `@dblclick.stop` on the note frame so the event never reaches the canvas handler.
     > Note: `DisplayNote.vue` already emits `edit-start` on `@focusin` of the head/body editors, so the Tiptap focus mechanism is already wired; the issue is purely the canvas creating a new note before the note can react.
  3. **Resize handles visibility:** Change the handle render condition to `model.resizable.value && !model.readOnly.value && props.selected`. Only selected notes show handles.
  4. **Pointer capture on resize:** Ensure resize handles call `setPointerCapture` on pointerdown and `releasePointerCapture` on pointerup (currently they do). Verify the event target is the handle, not the note body.

### 4.3 Keep UI close to legacy

- **Colors:** Legacy uses a dark grey (`#181818`) canvas with white text. New uses `bg-background` (light/dark via Tailwind). The user wants light/dark support but UI behavior close to legacy.
- **Selection:** Legacy uses a blue-ish selection ring. New uses `ring-2 ring-[#2196f3]`. This is fine; keep it.
- **Context menus:** Legacy has table context menu, note context menu, and canvas context menu. New has `CanvasContextMenu` and `NoteContextMenu` but they are basic. Expand them to match legacy functionality (copy, cut, paste, delete, bring to front, send to back, etc.).
- **UI polish:** `NotePropertiesCard.vue` and `ArrowPropertiesCard.vue` use raw HTML `<select>` elements for anchor and width inputs instead of Shadcn `Select` components. This breaks visual consistency and contributes to the "ugly" feel.
- **Fix:**
  - Replace raw `<select>` elements in `NotePropertiesCard.vue` (anchor X/Y, width) and `ArrowPropertiesCard.vue` (body type, body style) with Shadcn `Select` / `SelectItem` components.
  - Expand `CanvasContextMenu` and `NoteContextMenu` to include full legacy operations (paste, duplicate, select all, cut, copy, delete, bring to front, send to back). Add this to the implementation order table.

---

## 5. Web App — Right Sidebar

### 5.1 Port legacy property panels to Shadcn

- **Legacy:** `RightSidebar.vue` has a mini-mode (icon buttons) and expanded mode. `NoteProperties.vue` is ~766 lines with rich controls: LinkURL, Create new page, Head/Body toggles, swap, timestamps, copy link, set as default, anchor inputs (X/Y, anchor X/Y), width/height combos, color palette, collapsing, container properties, movable/resizable, wrap, read-only, export. `ArrowProperties.vue` has source/target anchor, head toggles, body type/style, color, timestamps, copy link. `PageProperties.vue` has page title, favorite, snapshot management, etc.
- **New:** `NotePropertiesCard`, `ArrowPropertiesCard`, `PagePropertiesCard`, `PageEditorSnapshotsCard`, `PageEditorManagementCard`, `PageEditorBacklinksCard`. These use Shadcn `Card` but are much simpler and missing many legacy features.
- **Problem:** User says it's "very ugly" and missing "Create new page" which is central.
- **Fix:**
  1. **Visual density:** Reduce excessive `space-y-3` gaps between cards. Use tighter spacing (`space-y-2` or `gap-3` on a single wrapper). Remove card borders inside the sidebar or use `variant="ghost"` cards.
  2. **Add missing controls to `NotePropertiesCard`:**
     - Link URL input (exists? verify)
     - **Create new page button** (the critical missing feature)
     - Head/Body enabled toggles
     - Swap head and body button
     - Timestamps (createdAt, editedAt, movedAt)
     - Copy link to note
     - Set as default note style
     - Anchor X/Y numeric inputs
     - Width/Height combos (Auto / Minimum / explicit px)
     - Color palette (horizontal, compact)
     - Collapsible / Collapsed / Local collapsing toggles
     - Container properties (enabled, spatial, horizontal, wrap children, stretch children, force color inheritance)
     - Movable / Resizable / Wrap head / Wrap body / Read-only toggles
  3. **Add missing controls to `ArrowPropertiesCard`:**
     - **Source/target anchor select** (Auto / Left / Top / Right / Bottom), matching legacy `q-select` behavior.
     - **Source/target head toggles** (currently only boolean on/off; legacy uses `none`/`open`).
     - **Swap arrowheads** button.
     - **Body type/style select** (migrate from raw `<select>`/button toggles to Shadcn `Select`).
     - **Color palette** (horizontal, compact).
     - **Timestamps** (createdAt, editedAt).
     - **Copy link to arrow**.
     - **Set as default arrow style**.
  4. **Add mini-mode:** When the right sidebar is collapsed, show a thin vertical strip of icon buttons (like legacy `NoteMiniProperties.vue` / `ArrowProperties.vue` mini lists). This requires `PageLayout.vue` to support a mini-width (e.g. `48px`) for the right aside.

### 5.2 Add "Create new page" functionality

- **Legacy:** `NoteProperties.vue` has a prominent "Create new page" split button. It extracts the note's text as the initial page title, creates the page via API, sets the note's link to the new page, and navigates to it.
- **New:** No equivalent exists.
- **Fix:**
  1. Add the "Create new page" button to `NotePropertiesCard`.
  2. Implement `getInitialPageTitle` logic (extract first line from selected note's head/body text).
  3. Call `POST /api/pages` with the title and current group/page as parent.
  4. Set the note's `link` to `/pages/${newPageId}`.
  5. Optionally navigate to the new page.

---

## 6. Account Page

### 6.1 Re-structure with sidebar navigation

- **Legacy:** `Account.vue` has a left nav sidebar with General, Billing, Security tabs and a router-view on the right. This keeps the page organized and not overwhelming.
- **New:** `AccountView.vue` is a single long vertical stack of cards on one page. No sidebar, no sub-routes.
- **Problem:** User says it's "incredibly ugly" — mainly because it's an intimidating wall of forms.
- **Fix:**
  1. Split `AccountView.vue` into sub-routes or at least tabbed sections:
     - **General** — email verification, change email, confirm email change, danger zone (delete account)
     - **Security** — change password, 2FA setup/disable/recovery codes
     - **Billing** — subscription, Stripe checkout/portal
  2. Use a **left sidebar layout** similar to legacy Account page, or use Shadcn `Tabs` at the top of the page.
  3. Improve visual hierarchy:
     - Use `Card` sparingly; group related settings inside bordered sections instead of every field getting its own card.
     - Increase whitespace between major sections.
     - Use `Label` + `Input` consistently; align buttons to the right of forms.
  4. Remove the developer-facing `code` descriptions from card subtitles (e.g. "REST (/api/users/me/**)", "STRIPE_* variables", "SEND_EMAILS=false"). These should be in dev docs, not the UI.
  5. Remove `emailChangeDevHint` from the UI (`AccountView.vue:202-203`): when `SEND_EMAILS=false`, the raw verification code is echoed into the page as plain text. This is a security/polish issue — the code should be logged to the console in dev mode only, or simply show a generic "check dev logs" message.

---

## 7. Implementation Order

| Priority | Section | Files to Touch | Est. Effort |
|----------|---------|----------------|-------------|
| **P0** | 4.2 Fix note interactions (resize, double-click, handles) | `DisplayNote.vue`, `useCanvasActions.ts`; investigate `page-doc-schema.ts` for `height.expanded` | Medium |
| **P0** | 4.1 Restore main toolbar | New `CanvasToolbar.vue`, `PageLayout.vue`, `SpatialPageView.vue` (remove floating buttons) | Large |
| **P1** | 2.1 Simplify header | `MainToolbar.vue`, remove `PageToolbarActions` from header | Small |
| **P1** | 3.1 Left sidebar tabs | `PageEditorView.vue`, new sidebar tab component | Medium |
| **P1** | 5.1 & 5.2 Right sidebar parity + create page | `NotePropertiesCard.vue`, `ArrowPropertiesCard.vue`, `PagePropertiesCard.vue`; migrate raw `<select>` to Shadcn `Select` | Large |
| **P1** | 4.3 Context menu expansion | `CanvasContextMenu.vue`, `NoteContextMenu.vue`, `SpatialPageView.vue` | Small |
| **P2** | 6.1 Account page restructure | `AccountView.vue`, new sub-components/routes; remove `emailChangeDevHint` | Medium |
| **P2** | 1.2 Scroll-driven index | `WhitepaperPage.vue`, `PrivacyPolicyPage.vue`, `TermsOfServicePage.vue` | Small |
| **P2** | 1.1 Pricing layout fix | `PricingPage.vue` | Small |
| **P2** | 1.3 Marketing scroll reset | `marketing/src/main.ts` | Tiny |

---

## 8. Legacy Reference Quick-Map

| New File | Legacy Equivalent |
|----------|-------------------|
| `MainToolbar.vue` | `PagesLayout/MainToolbar/MainToolbar.vue` + `ToolbarContent.vue` |
| `PageLayout.vue` | `PagesLayout/PagesLayout.vue` + `LeftSidebar.vue` + `RightSidebar.vue` |
| `PageEditorView.vue` | `MainContent/DisplayPage/DisplayPage.vue` + sidebar sections |
| `DisplayNote.vue` | `DisplayWorld/DisplayNote/DisplayNote.vue` |
| `DisplayArrow.vue` | `DisplayWorld/DisplayArrow/DisplayArrow.vue` |
| `SpatialPageView.vue` | `MainContent/MainContent.vue` + `DisplayUI/DisplayUI.vue` |
| `NotePropertiesCard.vue` | `RightSidebar/NoteProperties/NoteProperties.vue` |
| `ArrowPropertiesCard.vue` | `RightSidebar/ArrowProperties.vue` |
| `PagePropertiesCard.vue` | `RightSidebar/PageProperties/PageProperties.vue` |
| `AccountView.vue` | `pages/home/Account/Account.vue` + `General.vue` + `Security.vue` |
| `PricingPage.vue` | `pages/home/Pricing/Pricing.vue` |
| `WhitepaperPage.vue` | `pages/home/Whitepaper/Whitepaper.vue` |

---

*End of plan*
