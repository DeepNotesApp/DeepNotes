import { describe, expect, it } from "vitest";
import { createPageYDoc } from "@deepnotes/collab-wire";

import { useSpatialPage } from "./useSpatialPage";

describe("useSpatialPage", () => {
  it("creates a note at a world position", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    expect(page.noteList.value.length).toBe(0);

    const id = page.createNoteAt(120, 340);
    expect(page.noteList.value.length).toBe(1);
    expect(page.noteList.value[0]!.id).toBe(id);
    expect(page.noteList.value[0]!.model.pos.value).toEqual({ x: 120, y: 340 });
  });

  it("deletes a note", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const id = page.createNoteAt(0, 0);
    expect(page.noteList.value.length).toBe(1);

    page.deleteNote(id);
    expect(page.noteList.value.length).toBe(0);
  });

  it("creates an arrow between two notes", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(100, 0);
    expect(page.noteList.value.length).toBe(2);

    const a1 = page.createArrow(n1, n2);
    expect(page.arrowList.value.length).toBe(1);
    expect(page.arrowList.value[0]!.id).toBe(a1);
    expect(page.arrowList.value[0]!.model.source.value).toBe(n1);
    expect(page.arrowList.value[0]!.model.target.value).toBe(n2);
  });

  it("deletes an arrow", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(100, 0);
    const a1 = page.createArrow(n1, n2);
    expect(page.arrowList.value.length).toBe(1);

    page.deleteArrow(a1);
    expect(page.arrowList.value.length).toBe(0);
  });

  it("reacts to note position mutation", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    page.createNoteAt(10, 20);
    const model = page.noteList.value[0]!.model;
    expect(model.pos.value).toEqual({ x: 10, y: 20 });

    const posMap = model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("x", 99);
    expect(model.pos.value).toEqual({ x: 99, y: 20 });
  });

  it("adds a child to a container", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(0, 0);
    const childId = page.createNoteAt(50, 50);

    page.addChildToContainer(containerId, childId);
    expect(page.parentOf.value.get(childId)).toBe(containerId);
    expect(page.rootNoteList.value.map((n) => n.id)).not.toContain(childId);
  });

  it("removes a child from a container", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(0, 0);
    const childId = page.createNoteAt(50, 50);

    page.addChildToContainer(containerId, childId);
    page.removeChildFromContainer(containerId, childId);

    expect(page.parentOf.value.has(childId)).toBe(false);
    expect(page.rootNoteList.value.map((n) => n.id)).toContain(childId);
  });

  it("deletes container children recursively", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(0, 0);
    const childId = page.createNoteAt(50, 50);

    page.addChildToContainer(containerId, childId);
    page.deleteNote(containerId);

    expect(page.noteList.value.map((n) => n.id)).not.toContain(containerId);
    expect(page.noteList.value.map((n) => n.id)).not.toContain(childId);
  });
});
