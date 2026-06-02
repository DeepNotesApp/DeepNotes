import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import {
  YPAGE_KEY,
  YPAGE_NOTE_KEY,
  YPAGE_ARROW_KEY,
  createPageYDoc,
  addNoteToPage,
  addArrowToPage,
  removeNoteFromPage,
  removeArrowFromPage,
  getNotesMap,
  getArrowsMap,
  getNoteIds,
  getArrowIds,
  getNoteMap,
  getArrowMap,
  getNextZIndex,
  applyPageBootstrapUpdates,
} from "./page-doc-schema.js";

describe("page-doc-schema", () => {
  it("creates a blank doc", () => {
    const ydoc = createPageYDoc();

    expect(ydoc.getMap(YPAGE_KEY.page).size).toBe(0);
    expect(ydoc.getMap(YPAGE_KEY.notes).size).toBe(0);
    expect(ydoc.getMap(YPAGE_KEY.arrows).size).toBe(0);
  });

  it("adds a note with all legacy fields and defaults", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "note-1");

    expect(getNoteIds(ydoc).toArray()).toContain("note-1");
    expect(note.get(YPAGE_NOTE_KEY.regionId)).toBeNull();
    expect(note.get(YPAGE_NOTE_KEY.link)).toBe("");

    const anchor = note.get(YPAGE_NOTE_KEY.anchor) as Y.Map<number>;
    expect(anchor.get("x")).toBe(0.5);
    expect(anchor.get("y")).toBe(0.5);

    const pos = note.get(YPAGE_NOTE_KEY.pos) as Y.Map<number>;
    expect(pos.get("x")).toBe(0);
    expect(pos.get("y")).toBe(0);

    const width = note.get(YPAGE_NOTE_KEY.width) as Y.Map<string>;
    expect(width.get("expanded")).toBe("Auto");
    expect(width.get("collapsed")).toBe("Auto");

    const height = note.get(YPAGE_NOTE_KEY.height) as Y.Map<string>;
    expect(height.get("expanded")).toBe("Auto");
    expect(height.get("collapsed")).toBe("Auto");

    const head = note.get(YPAGE_NOTE_KEY.head) as Y.Map<unknown>;
    expect(head.get("enabled")).toBe(true);
    expect(head.get("wrap")).toBe(true);
    expect(head.get("value")).toBeInstanceOf(Y.XmlFragment);

    const body = note.get(YPAGE_NOTE_KEY.body) as Y.Map<unknown>;
    expect(body.get("enabled")).toBe(false);

    const container = note.get(YPAGE_NOTE_KEY.container) as Y.Map<unknown>;
    expect(container.get("enabled")).toBe(false);
    expect(container.get("spatial")).toBe(false);
    expect(container.get("horizontal")).toBe(false);
    expect(container.get("wrapChildren")).toBe(false);
    expect(container.get("stretchChildren")).toBe(true);
    expect(container.get("forceColorInheritance")).toBe(false);
    expect(container.get("children")).toBeInstanceOf(Y.Array);

    const collapsing = note.get(YPAGE_NOTE_KEY.collapsing) as Y.Map<boolean>;
    expect(collapsing.get("enabled")).toBe(false);
    expect(collapsing.get("collapsed")).toBe(false);
    expect(collapsing.get("localCollapsing")).toBe(false);

    const color = note.get(YPAGE_NOTE_KEY.color) as Y.Map<unknown>;
    expect(color.get("inherit")).toBe(false);
    expect(color.get("value")).toBe("grey");

    expect(note.get(YPAGE_NOTE_KEY.movable)).toBe(true);
    expect(note.get(YPAGE_NOTE_KEY.resizable)).toBe(true);
    expect(note.get(YPAGE_NOTE_KEY.readOnly)).toBe(false);
    expect(note.get(YPAGE_NOTE_KEY.zIndex)).toBe(-1);
    expect(note.get(YPAGE_NOTE_KEY.createdAt)).toBeNull();
    expect(note.get(YPAGE_NOTE_KEY.editedAt)).toBeNull();
    expect(note.get(YPAGE_NOTE_KEY.movedAt)).toBeNull();
  });

  it("adds an arrow with all legacy fields and defaults", () => {
    const ydoc = createPageYDoc();
    const arrow = addArrowToPage(ydoc, "arrow-1");

    expect(getArrowIds(ydoc).toArray()).toContain("arrow-1");
    expect(arrow.get(YPAGE_ARROW_KEY.regionId)).toBeNull();
    expect(arrow.get(YPAGE_ARROW_KEY.source)).toBe("");
    expect(arrow.get(YPAGE_ARROW_KEY.target)).toBe("");
    expect(arrow.get(YPAGE_ARROW_KEY.sourceAnchor)).toBeNull();
    expect(arrow.get(YPAGE_ARROW_KEY.targetAnchor)).toBeNull();
    expect(arrow.get(YPAGE_ARROW_KEY.sourceHead)).toBe("none");
    expect(arrow.get(YPAGE_ARROW_KEY.targetHead)).toBe("open");
    expect(arrow.get(YPAGE_ARROW_KEY.bodyType)).toBe("curve");
    expect(arrow.get(YPAGE_ARROW_KEY.bodyStyle)).toBe("solid");
    expect(arrow.get(YPAGE_ARROW_KEY.label)).toBeInstanceOf(Y.XmlFragment);
    expect(arrow.get(YPAGE_ARROW_KEY.color)).toBe("grey");
    expect(arrow.get(YPAGE_ARROW_KEY.readOnly)).toBe(false);
    expect(arrow.get(YPAGE_ARROW_KEY.interregional)).toBe(false);
    expect(arrow.get(YPAGE_ARROW_KEY.fakePos)).toBeNull();
    expect(arrow.get(YPAGE_ARROW_KEY.looseEndpoint)).toBeNull();
    expect(arrow.get(YPAGE_ARROW_KEY.createdAt)).toBeNull();
    expect(arrow.get(YPAGE_ARROW_KEY.editedAt)).toBeNull();
  });

  it("removes notes and arrows from page", () => {
    const ydoc = createPageYDoc();
    addNoteToPage(ydoc, "note-1");
    addArrowToPage(ydoc, "arrow-1");

    removeNoteFromPage(ydoc, "note-1");
    removeArrowFromPage(ydoc, "arrow-1");

    expect(getNoteIds(ydoc).toArray()).not.toContain("note-1");
    expect(getArrowIds(ydoc).toArray()).not.toContain("arrow-1");
    expect(getNoteMap(ydoc, "note-1")).toBeUndefined();
    expect(getArrowMap(ydoc, "arrow-1")).toBeUndefined();
  });

  it("applies bootstrap updates from a snapshot doc", () => {
    const source = createPageYDoc();
    addNoteToPage(source, "note-1");
    addArrowToPage(source, "arrow-1");

    const update = Y.encodeStateAsUpdateV2(source);
    const target = new Y.Doc();
    applyPageBootstrapUpdates(target, [update]);

    // After bootstrap the top-level maps should exist with the note/arrow.
    expect(getNotesMap(target).has("note-1")).toBe(true);
    expect(getArrowsMap(target).has("arrow-1")).toBe(true);
  });

  it("getNextZIndex returns 0 by default", () => {
    const ydoc = createPageYDoc();
    expect(getNextZIndex(ydoc)).toBe(0);
  });
});
