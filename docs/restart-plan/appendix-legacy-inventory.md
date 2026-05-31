# Appendix: Legacy spatial system inventory

For agent reference. Do not copy-paste this code into the new repo. Use it as a behavioral spec.

---

## Key legacy files

| File | Responsibility |
|------|---------------|
| `apps/client/src/code/pages/page/page.ts` | `Page` class. Owns camera, panning, zooming, pinching, selection, notes, arrows, elems, undo/redo. |
| `apps/client/src/code/pages/page/camera/camera.ts` | `PageCamera`. `zoom`, `pos`, `fitToScreen()`. |
| `apps/client/src/code/pages/page/camera/panning.ts` | `PagePanning`. Middle-drag, space-drag. |
| `apps/client/src/code/pages/page/camera/zooming.ts` | `PageZooming`. Wheel + ctrl zoom. |
| `apps/client/src/code/pages/page/space/pos.ts` | `PagePos`. Client ↔ world coordinate transforms. |
| `apps/client/src/code/pages/page/space/rects.ts` | `PageRects`. Rect math, DOM ↔ world. |
| `apps/client/src/code/pages/page/notes/note.ts` | `PageNote` class. ~650 lines. Head, body, container sections, resizing, dragging, color, link, z-index. |
| `apps/client/src/code/pages/page/notes/note-collab.ts` | `INoteCollab` Zod/SyncedStore schema. Defines note CRDT shape. |
| `apps/client/src/code/pages/page/arrows/arrow.ts` | `PageArrow` class. ~580 lines. Source/target, anchors, body styles, label, color, interregional logic. |
| `apps/client/src/code/pages/page/elems/elem.ts` | `PageElem` base class. `id`, `page`, `react`, `visible`. |
| `apps/client/src/code/pages/page/selection/selection.ts` | `PageSelection`. Click, multi-select, set/clear. |
| `apps/client/src/code/pages/page/collab/collab.ts` | `PageCollab`. SyncedStore setup, Yjs doc, websocket, presence. |
| `apps/client/src/code/pages/utils.ts` | `createPageStore()` — SyncedStore factory for `page`, `notes`, `arrows`. |
| `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/DisplayWorld.vue` | Root canvas component. Renders background, arrows, notes, box selection, panning board. |
| `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/DisplayNote/DisplayNote.vue` | Note render. Teleport to overlay when dragging. Head, body, container sections. |
| `apps/client/src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/DisplayWorld/DisplayArrow/DisplayArrow.vue` | Arrow render. SVG curve/line. |

---

## Collab data model (legacy)

```
Y.Doc
├── store.page         : { noteIds: string[], arrowIds: string[], nextZIndex: number }
├── store.notes        : Y.Map<INoteCollab>
│   └── [noteId]       : { pos, width, head, body, container, collapsing, color, zIndex, ... }
│       └── head.value : Y.XmlFragment (ProseMirror content)
│       └── body.value : Y.XmlFragment
│       └── container  : { enabled, spatial, horizontal, children, ... }
├── store.arrows       : Y.Map<IArrowCollab>
│   └── [arrowId]      : { source, target, sourceAnchor, targetAnchor, bodyType, label, color, ... }
│       └── label      : Y.XmlFragment
```

The new app must replicate this shape (or a documented evolution of it) for collab to support spatial notes and arrows.
