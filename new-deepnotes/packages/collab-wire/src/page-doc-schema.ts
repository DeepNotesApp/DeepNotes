import * as Y from "yjs";

// ------------------------------------------------------------------
// Page-level Yjs doc schema for spatial canvas collab.
// Replicates legacy SyncedStore shape without `@syncedstore/core`.
//
// Y.Doc
//   ├── page  : Y.Map
//   │   ├── noteIds   : Y.Array<string>
//   │   ├── arrowIds  : Y.Array<string>
//   │   └── nextZIndex: number
//   ├── notes : Y.Map<string, Y.Map>   // noteId -> INoteCollab
//   └── arrows: Y.Map<string, Y.Map>   // arrowId -> IArrowCollab
// ------------------------------------------------------------------

export const YPAGE_KEY = {
  page: "page",
  notes: "notes",
  arrows: "arrows",
} as const;

export const YPAGE_PAGE_KEY = {
  noteIds: "noteIds",
  arrowIds: "arrowIds",
  nextZIndex: "nextZIndex",
} as const;

export const YPAGE_NOTE_KEY = {
  regionId: "regionId",
  link: "link",
  anchor: "anchor",
  pos: "pos",
  width: "width",
  head: "head",
  body: "body",
  container: "container",
  collapsing: "collapsing",
  movable: "movable",
  resizable: "resizable",
  readOnly: "readOnly",
  color: "color",
  zIndex: "zIndex",
  createdAt: "createdAt",
  editedAt: "editedAt",
  movedAt: "movedAt",
  containerChildren: "containerChildren",
} as const;

export const YPAGE_ARROW_KEY = {
  regionId: "regionId",
  source: "source",
  target: "target",
  sourceAnchor: "sourceAnchor",
  targetAnchor: "targetAnchor",
  sourceHead: "sourceHead",
  targetHead: "targetHead",
  bodyType: "bodyType",
  bodyStyle: "bodyStyle",
  label: "label",
  color: "color",
  readOnly: "readOnly",
  interregional: "interregional",
  fakePos: "fakePos",
  looseEndpoint: "looseEndpoint",
  createdAt: "createdAt",
  editedAt: "editedAt",
} as const;

// ------------------------------------------------------------------
// Defaults (match legacy Zod defaults)
// ------------------------------------------------------------------

function createDefaultVec2(): Y.Map<number> {
  const m = new Y.Map<number>();
  m.set("x", 0);
  m.set("y", 0);
  return m;
}

function createDefaultAnchor(): Y.Map<number> {
  const m = new Y.Map<number>();
  m.set("x", 0.5);
  m.set("y", 0.5);
  return m;
}

function createDefaultSize(): Y.Map<string> {
  const m = new Y.Map<string>();
  m.set("expanded", "Auto");
  m.set("collapsed", "Auto");
  return m;
}

function createDefaultTextSection(enabled: boolean): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("enabled", enabled);
  m.set("height", createDefaultSize());

  const fragment = new Y.XmlFragment();
  const paragraph = new Y.XmlElement("paragraph");
  paragraph.insert(0, [new Y.XmlText("")]);
  fragment.insert(0, [paragraph]);
  m.set("value", fragment);

  m.set("wrap", true);
  return m;
}

function createDefaultContainer(): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("enabled", false);
  m.set("spatial", false);
  m.set("horizontal", false);
  m.set("wrapChildren", false);
  m.set("stretchChildren", true);
  m.set("forceColorInheritance", false);
  m.set("children", new Y.Array<string>());
  return m;
}

function createDefaultCollapsing(): Y.Map<boolean> {
  const m = new Y.Map<boolean>();
  m.set("enabled", false);
  m.set("collapsed", false);
  m.set("localCollapsing", false);
  return m;
}

function createDefaultColor(): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("inherit", false);
  m.set("value", "grey");
  return m;
}

function createDefaultLabel(): Y.XmlFragment {
  const fragment = new Y.XmlFragment();
  const paragraph = new Y.XmlElement("paragraph");
  paragraph.insert(0, [new Y.XmlText("")]);
  fragment.insert(0, [paragraph]);
  return fragment;
}

// ------------------------------------------------------------------
// Note helpers
// ------------------------------------------------------------------

export function createNoteMap(): Y.Map<unknown> {
  const note = new Y.Map<unknown>();
  note.set(YPAGE_NOTE_KEY.regionId, null);
  note.set(YPAGE_NOTE_KEY.link, "");
  note.set(YPAGE_NOTE_KEY.anchor, createDefaultAnchor());
  note.set(YPAGE_NOTE_KEY.pos, createDefaultVec2());
  note.set(YPAGE_NOTE_KEY.width, createDefaultSize());
  note.set(YPAGE_NOTE_KEY.head, createDefaultTextSection(true));
  note.set(YPAGE_NOTE_KEY.body, createDefaultTextSection(false));
  note.set(YPAGE_NOTE_KEY.container, createDefaultContainer());
  note.set(YPAGE_NOTE_KEY.collapsing, createDefaultCollapsing());
  note.set(YPAGE_NOTE_KEY.movable, true);
  note.set(YPAGE_NOTE_KEY.resizable, true);
  note.set(YPAGE_NOTE_KEY.readOnly, false);
  note.set(YPAGE_NOTE_KEY.color, createDefaultColor());
  note.set(YPAGE_NOTE_KEY.zIndex, -1);
  note.set(YPAGE_NOTE_KEY.createdAt, null);
  note.set(YPAGE_NOTE_KEY.editedAt, null);
  note.set(YPAGE_NOTE_KEY.movedAt, null);
  return note;
}

export function getNotesMap(ydoc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return ydoc.getMap<Y.Map<unknown>>(YPAGE_KEY.notes);
}

export function getNoteMap(ydoc: Y.Doc, noteId: string): Y.Map<unknown> | undefined {
  return getNotesMap(ydoc).get(noteId);
}

export function addNoteToPage(ydoc: Y.Doc, noteId: string): Y.Map<unknown> {
  const note = createNoteMap();
  const noteIds = getNoteIds(ydoc);
  const notes = getNotesMap(ydoc);

  ydoc.transact(() => {
    noteIds.push([noteId]);
    notes.set(noteId, note);
  });

  return note;
}

export function removeNoteFromPage(ydoc: Y.Doc, noteId: string): void {
  const noteIds = getNoteIds(ydoc);
  const notes = getNotesMap(ydoc);

  ydoc.transact(() => {
    const idx = noteIds.toArray().indexOf(noteId);
    if (idx >= 0) {
      noteIds.delete(idx, 1);
    }
    notes.delete(noteId);
  });
}

// ------------------------------------------------------------------
// Arrow helpers
// ------------------------------------------------------------------

export function createArrowMap(): Y.Map<unknown> {
  const arrow = new Y.Map<unknown>();
  arrow.set(YPAGE_ARROW_KEY.regionId, null);
  arrow.set(YPAGE_ARROW_KEY.source, "");
  arrow.set(YPAGE_ARROW_KEY.target, "");
  arrow.set(YPAGE_ARROW_KEY.sourceAnchor, null);
  arrow.set(YPAGE_ARROW_KEY.targetAnchor, null);
  arrow.set(YPAGE_ARROW_KEY.sourceHead, "none");
  arrow.set(YPAGE_ARROW_KEY.targetHead, "open");
  arrow.set(YPAGE_ARROW_KEY.bodyType, "curve");
  arrow.set(YPAGE_ARROW_KEY.bodyStyle, "solid");
  arrow.set(YPAGE_ARROW_KEY.label, createDefaultLabel());
  arrow.set(YPAGE_ARROW_KEY.color, "grey");
  arrow.set(YPAGE_ARROW_KEY.readOnly, false);
  arrow.set(YPAGE_ARROW_KEY.interregional, false);
  arrow.set(YPAGE_ARROW_KEY.fakePos, null);
  arrow.set(YPAGE_ARROW_KEY.looseEndpoint, null);
  arrow.set(YPAGE_ARROW_KEY.createdAt, null);
  arrow.set(YPAGE_ARROW_KEY.editedAt, null);
  return arrow;
}

export function getArrowsMap(ydoc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return ydoc.getMap<Y.Map<unknown>>(YPAGE_KEY.arrows);
}

export function getArrowMap(ydoc: Y.Doc, arrowId: string): Y.Map<unknown> | undefined {
  return getArrowsMap(ydoc).get(arrowId);
}

export function addArrowToPage(ydoc: Y.Doc, arrowId: string): Y.Map<unknown> {
  const arrow = createArrowMap();
  const arrowIds = getArrowIds(ydoc);
  const arrows = getArrowsMap(ydoc);

  ydoc.transact(() => {
    arrowIds.push([arrowId]);
    arrows.set(arrowId, arrow);
  });

  return arrow;
}

export function removeArrowFromPage(ydoc: Y.Doc, arrowId: string): void {
  const arrowIds = getArrowIds(ydoc);
  const arrows = getArrowsMap(ydoc);

  ydoc.transact(() => {
    const idx = arrowIds.toArray().indexOf(arrowId);
    if (idx >= 0) {
      arrowIds.delete(idx, 1);
    }
    arrows.delete(arrowId);
  });
}

// ------------------------------------------------------------------
// Page-level helpers
// ------------------------------------------------------------------

export function getPageMap(ydoc: Y.Doc): Y.Map<unknown> {
  return ydoc.getMap<unknown>(YPAGE_KEY.page);
}

export function getNoteIds(ydoc: Y.Doc): Y.Array<string> {
  const page = getPageMap(ydoc);
  let arr = page.get(YPAGE_PAGE_KEY.noteIds) as Y.Array<string> | undefined;
  if (arr == null) {
    arr = new Y.Array<string>();
    page.set(YPAGE_PAGE_KEY.noteIds, arr);
  }
  return arr;
}

export function getArrowIds(ydoc: Y.Doc): Y.Array<string> {
  const page = getPageMap(ydoc);
  let arr = page.get(YPAGE_PAGE_KEY.arrowIds) as Y.Array<string> | undefined;
  if (arr == null) {
    arr = new Y.Array<string>();
    page.set(YPAGE_PAGE_KEY.arrowIds, arr);
  }
  return arr;
}

export function getNextZIndex(ydoc: Y.Doc): number {
  const page = getPageMap(ydoc);
  const val = page.get(YPAGE_PAGE_KEY.nextZIndex);
  if (val === undefined) {
    page.set(YPAGE_PAGE_KEY.nextZIndex, 0);
    return 0;
  }
  return (val as number) ?? 0;
}

export function setNextZIndex(ydoc: Y.Doc, value: number): void {
  getPageMap(ydoc).set(YPAGE_PAGE_KEY.nextZIndex, value);
}

// ------------------------------------------------------------------
// Doc factory
// ------------------------------------------------------------------

export function createPageYDoc(): Y.Doc {
  // Return a completely blank doc so server bootstrap updates recreate
  // the exact shared types (same Yjs IDs) that the original session used.
  return new Y.Doc();
}

// ------------------------------------------------------------------
// Bootstrap: apply paginated encrypted updates to a fresh doc.
// ------------------------------------------------------------------

export function applyPageBootstrapUpdates(
  ydoc: Y.Doc,
  plainUpdates: Uint8Array[],
): void {
  for (const u of plainUpdates) {
    Y.applyUpdateV2(ydoc, u);
  }
}
