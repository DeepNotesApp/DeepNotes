import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createPageYDoc } from "@deepnotes/collab-wire";
import { useSpatialPage } from "./useSpatialPage";
import { useSpatialUndoRedo } from "./undo-redo";

describe("useSpatialUndoRedo", () => {
  it("undoes note creation", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    expect(page.noteList.value.length).toBe(0);

    const id = page.createNoteAt(10, 20);
    expect(page.noteList.value.length).toBe(1);

    ur.undo();
    expect(page.noteList.value.length).toBe(0);
  });

  it("redoes note creation after undo", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const id = page.createNoteAt(10, 20);
    expect(page.noteList.value.length).toBe(1);

    ur.undo();
    expect(page.noteList.value.length).toBe(0);

    ur.redo();
    expect(page.noteList.value.length).toBe(1);
    expect(page.noteList.value[0]!.id).toBe(id);
  });

  it("undoes note deletion", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const id = page.createNoteAt(10, 20);
    expect(page.noteList.value.length).toBe(1);

    ur.stopCapturing(); // ensure creation and deletion are separate undo items
    page.deleteNote(id);
    expect(page.noteList.value.length).toBe(0);

    ur.undo();
    expect(page.noteList.value.length).toBe(1);
    expect(page.noteList.value[0]!.id).toBe(id);
  });

  it("debug: minimal Yjs undo", () => {
    const ydoc = new Y.Doc();
    const map = ydoc.getMap("test");
    const um = new Y.UndoManager(map);

    ydoc.transact(() => {
      map.set("a", 1);
    });
    expect(map.get("a")).toBe(1);

    um.undo();
    expect(map.has("a")).toBe(false);
  });

  it("debug: nested map added after um creation", () => {
    const ydoc = new Y.Doc();
    const root = ydoc.getMap("root");
    const um = new Y.UndoManager(root);

    const nested = new Y.Map<number>();
    ydoc.transact(() => {
      root.set("nested", nested);
      nested.set("x", 1);
    });
    um.addToScope(nested);
    um.stopCapturing();
    expect(nested.get("x")).toBe(1);

    ydoc.transact(() => {
      nested.set("x", 99);
    });
    expect(nested.get("x")).toBe(99);

    um.undo();
    expect(nested.get("x")).toBe(1);
  });

  it("undoes note position change", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    page.createNoteAt(10, 20);
    const model = page.noteList.value[0]!.model;
    expect(model.pos.value).toEqual({ x: 10, y: 20 });

    const posMap = model.rawMap.get("pos") as import("yjs").Map<number>;
    ydoc.transact(() => {
      posMap.set("x", 99);
      posMap.set("y", 88);
    });
    expect(model.pos.value).toEqual({ x: 99, y: 88 });

    ur.undo();
    expect(model.pos.value).toEqual({ x: 10, y: 20 });
  });

  it("undoes arrow creation", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(100, 0);
    const a1 = page.createArrow(n1, n2);
    expect(page.arrowList.value.length).toBe(1);

    ur.undo();
    expect(page.arrowList.value.length).toBe(0);
  });

  it("reports canUndo / canRedo correctly", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    expect(ur.canUndo()).toBe(false);
    expect(ur.canRedo()).toBe(false);

    page.createNoteAt(0, 0);
    expect(ur.canUndo()).toBe(true);
    expect(ur.canRedo()).toBe(false);

    ur.undo();
    expect(ur.canUndo()).toBe(false);
    expect(ur.canRedo()).toBe(true);

    ur.redo();
    expect(ur.canUndo()).toBe(true);
    expect(ur.canRedo()).toBe(false);
  });
});
