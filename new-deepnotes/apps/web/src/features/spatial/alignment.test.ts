import { describe, expect, it } from "vitest";
import { createPageYDoc } from "@deepnotes/collab-wire";
import { useSpatialPage } from "./useSpatialPage";
import { useSpatialUndoRedo } from "./undo-redo";
import {
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
  distributeHorizontally,
  distributeVertically,
} from "./alignment";

describe("alignment", () => {
  it("aligns notes to the left", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(10, 0);
    const n2 = page.createNoteAt(50, 0);
    const n3 = page.createNoteAt(30, 0);

    alignLeft(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value.x).toBe(10);
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value.x).toBe(10);
    expect(page.noteList.value.find((n) => n.id === n3)!.model.pos.value.x).toBe(10);
  });

  it("aligns notes to the center horizontally", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(100, 0);

    alignCenter(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value.x).toBe(50);
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value.x).toBe(50);
  });

  it("aligns notes to the right", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(10, 0);
    const n2 = page.createNoteAt(50, 0);

    alignRight(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value.x).toBe(50);
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value.x).toBe(50);
  });

  it("aligns notes to the top", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 10);
    const n2 = page.createNoteAt(0, 50);
    const n3 = page.createNoteAt(0, 30);

    alignTop(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value.y).toBe(10);
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value.y).toBe(10);
    expect(page.noteList.value.find((n) => n.id === n3)!.model.pos.value.y).toBe(10);
  });

  it("aligns notes to the middle vertically", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(0, 100);

    alignMiddle(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value.y).toBe(50);
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value.y).toBe(50);
  });

  it("aligns notes to the bottom", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 10);
    const n2 = page.createNoteAt(0, 50);

    alignBottom(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value.y).toBe(50);
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value.y).toBe(50);
  });

  it("does nothing with fewer than 2 notes", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(10, 20);
    alignLeft(page.noteList.value);
    alignTop(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value).toEqual({ x: 10, y: 20 });
  });

  it("distributes notes horizontally", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(50, 0);
    const n3 = page.createNoteAt(100, 0);

    distributeHorizontally(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value.x).toBe(0);
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value.x).toBe(50);
    expect(page.noteList.value.find((n) => n.id === n3)!.model.pos.value.x).toBe(100);
  });

  it("distributes notes vertically", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(0, 40);
    const n3 = page.createNoteAt(0, 80);

    distributeVertically(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value.y).toBe(0);
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value.y).toBe(40);
    expect(page.noteList.value.find((n) => n.id === n3)!.model.pos.value.y).toBe(80);
  });

  it("does nothing for distribution with fewer than 3 notes", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(10, 20);
    const n2 = page.createNoteAt(100, 200);
    distributeHorizontally(page.noteList.value);
    distributeVertically(page.noteList.value);

    expect(page.noteList.value.find((n) => n.id === n1)!.model.pos.value).toEqual({ x: 10, y: 20 });
    expect(page.noteList.value.find((n) => n.id === n2)!.model.pos.value).toEqual({ x: 100, y: 200 });
  });
});
