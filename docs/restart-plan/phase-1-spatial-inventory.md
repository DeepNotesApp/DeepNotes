# Phase 1: Legacy spatial inventory → concrete checklist

> **Prerequisites:** Phase 0 done.  
> **Status:** Complete

---

## Goal

Produce an **unambiguous feature checklist** for the spatial canvas so agents cannot misreport "done" on stubs.

---

## Deliverables

1. **Read every legacy spatial file** under:
   - `apps/client/src/code/pages/page/` (notes, arrows, camera, space, elems, selection, regions, collab)
   - `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/`
   - `apps/client/src/code/pages/page/collab/`
   - Specifically include `space/pos.ts`, `space/rects.ts`, `space/sizes.ts` for coordinate transform parity.

2. **Produce `docs/SPATIAL_PARITY_CHECKLIST.md`** with one table per subsystem:
   - **Notes:** create, delete, move (drag), resize, align, clone, collapsing, head/body/container sections, color, link, z-index.
   - **Arrows:** create, delete, source/target anchors, body types (curve/line), head styles, label editing, color, read-only.
   - **Camera / viewport:** pan (wheel, space+drag, middle-drag), zoom (ctrl+wheel, fit-to-screen), pinch (touch).
   - **Selection:** click, box-select, multi-select, active element, active region.
   - **Clipboard:** cut, copy, paste across pages.
   - **Editing:** find-and-replace, undo/redo.
   - **Collab:** SyncedStore Yjs doc with `notes` and `arrows` maps, awareness, remote cursor positions.
   - **Templates:** default note / arrow from `users.encrypted_default_note` / `encrypted_default_arrow`.
   - **Backlinks:** incoming page links display.
   - **Group access:** password-protected group unlock flow.

3. **For each checklist item, specify:**
   - Legacy file(s) to reference.
   - New file(s) where it should live (e.g., `apps/web/src/features/spatial/note-model.ts`).
   - Test file(s) that must pass before it's done.

4. **Produce a complete collab schema diff table**
   - Map every field from `INoteCollab` (`note-collab.ts`) and `IArrowCollab` (`arrow.ts`) to the new Phase 3 schema.
   - Do not miss: `anchor`, `wrap`, `createdAt`, `editedAt`, `movedAt`, `collapsing.localCollapsing`, `container.wrapChildren`, `container.stretchChildren`, `container.forceColorInheritance`, `interregional`, `fakePos`, `looseEndpoint`.
   - This table prevents "almost done" spatial work that lacks hidden legacy fields.

---

## Verification

- Review checklist with a human who has used the legacy app. Sign off on completeness.
- Checklist must contain **at least 60 rows** (if it has fewer, the inventory is incomplete).
- Schema diff table must cover every Zod field in `note-collab.ts` and `arrow.ts`.

---

## Exit criteria

- [x] `docs/SPATIAL_PARITY_CHECKLIST.md` exists and is reviewed.
- [x] Every legacy `DisplayWorld` component has a corresponding row in the checklist.
- [x] No row is marked "done" unless the feature is actually implemented (not stubbed).
- [x] Schema diff table exists and is reviewed for completeness.
