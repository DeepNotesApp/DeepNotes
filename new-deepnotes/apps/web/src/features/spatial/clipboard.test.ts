import { describe, expect, it } from "vitest";
import { createPageYDoc } from "@deepnotes/collab-wire";
import { useSpatialPage } from "./useSpatialPage";
import { useSpatialUndoRedo } from "./undo-redo";
import { copySelection, pastePayload, getClipboardBuffer } from "./clipboard";

describe("clipboard", () => {
  it("copies selected notes to buffer", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const id = page.createNoteAt(10, 20);
    const colorMap = page.noteList.value[0]!.model.rawMap.get("color") as import("yjs").Map<unknown>;
    colorMap.set("inherit", false);
    colorMap.set("value", "blue");

    copySelection(page.noteList.value, page.arrowList.value);
    const buffer = getClipboardBuffer();

    expect(buffer).not.toBeNull();
    expect(buffer!.notes.length).toBe(1);
    expect(buffer!.notes[0]!.id).toBe(id);
    expect(buffer!.notes[0]!.pos).toEqual({ x: 10, y: 20 });
    expect(buffer!.notes[0]!.color.value).toBe("blue");
  });

  it("pastes notes at offset", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    page.createNoteAt(10, 20);
    copySelection(page.noteList.value, page.arrowList.value);

    const buffer = getClipboardBuffer()!;
    const result = pastePayload(buffer, {
      createNote: page.createNoteAt,
      createArrow: page.createArrow,
      offsetX: 100,
      offsetY: 200,
    });

    expect(result.noteIds.length).toBe(1);
    const pasted = page.noteList.value.find((n) => n.id === result.noteIds[0])!;
    expect(pasted.model.pos.value).toEqual({ x: 100, y: 200 });
  });

  it("remaps arrow source/target on paste", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(100, 0);
    page.createArrow(n1, n2);

    copySelection(page.noteList.value, page.arrowList.value);
    const buffer = getClipboardBuffer()!;

    const result = pastePayload(buffer, {
      createNote: page.createNoteAt,
      createArrow: page.createArrow,
      offsetX: 0,
      offsetY: 0,
    });

    expect(result.noteIds.length).toBe(2);
    expect(result.arrowIds.length).toBe(1);

    const pastedArrow = page.arrowList.value.find((a) => a.id === result.arrowIds[0])!;
    expect(result.noteIds).toContain(pastedArrow.model.source.value);
    expect(result.noteIds).toContain(pastedArrow.model.target.value);
  });

  it("does not include arrows with external sources in copy", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(100, 0);
    const n3 = page.createNoteAt(200, 0);
    page.createArrow(n1, n2);
    page.createArrow(n2, n3);

    // Only copy n1 and n2; arrow from n2->n3 should be excluded
    const selectedNotes = page.noteList.value.filter((n) => n.id === n1 || n.id === n2);
    copySelection(selectedNotes, page.arrowList.value);

    const buffer = getClipboardBuffer()!;
    expect(buffer.notes.length).toBe(2);
    expect(buffer.arrows.length).toBe(1);
    expect(buffer.arrows[0]!.source).toBe(n1);
    expect(buffer.arrows[0]!.target).toBe(n2);
  });

  it("preserves note properties on paste", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const id = page.createNoteAt(10, 20);
    const model = page.noteList.value.find((n) => n.id === id)!.model;
    const colorMap = model.rawMap.get("color") as import("yjs").Map<unknown>;
    colorMap.set("inherit", false);
    colorMap.set("value", "red");
    model.rawMap.set("zIndex", 5);
    model.rawMap.set("movable", false);
    model.rawMap.set("resizable", false);
    model.rawMap.set("readOnly", true);

    copySelection(page.noteList.value, page.arrowList.value);
    const buffer = getClipboardBuffer()!;
    const result = pastePayload(buffer, {
      createNote: page.createNoteAt,
      createArrow: page.createArrow,
      offsetX: 0,
      offsetY: 0,
    });

    const pasted = page.noteList.value.find((n) => n.id === result.noteIds[0])!;
    expect(pasted.model.color.value).toEqual({ inherit: false, value: "red" });
    expect(pasted.model.zIndex.value).toBe(5);
    expect(pasted.model.movable.value).toBe(false);
    expect(pasted.model.resizable.value).toBe(false);
    expect(pasted.model.readOnly.value).toBe(true);
  });
});
