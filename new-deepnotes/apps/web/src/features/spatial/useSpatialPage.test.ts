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

  it("moves a note into a container with position conversion", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(100, 100);
    const noteId = page.createNoteAt(200, 200);

    page.moveNoteIntoContainer(noteId, containerId);

    expect(page.parentOf.value.get(noteId)).toBe(containerId);
    const noteEntry = page.noteList.value.find((n) => n.id === noteId);
    expect(noteEntry!.model.pos.value).toEqual({ x: 100, y: 100 - 48 });
  });

  it("moves a note out of a container with position conversion", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(100, 100);
    const noteId = page.createNoteAt(50, 50);
    page.addChildToContainer(containerId, noteId);

    // Verify child is inside container
    expect(page.parentOf.value.get(noteId)).toBe(containerId);
    const childEntryBefore = page.noteList.value.find((n) => n.id === noteId);
    expect(childEntryBefore!.model.pos.value).toEqual({ x: 50, y: 50 });

    page.moveNoteOutOfContainer(noteId);

    expect(page.parentOf.value.has(noteId)).toBe(false);
    const childEntryAfter = page.noteList.value.find((n) => n.id === noteId);
    expect(childEntryAfter!.model.pos.value).toEqual({ x: 150, y: 150 + 48 });
  });

  it("prevents dropping a container into itself", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(0, 0);
    page.moveNoteIntoContainer(containerId, containerId);

    expect(page.parentOf.value.has(containerId)).toBe(false);
  });

  it("prevents dropping a container into its own descendant", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const grandparentId = page.createNoteAt(0, 0);
    const parentId = page.createNoteAt(10, 10);
    const childId = page.createNoteAt(20, 20);

    page.moveNoteIntoContainer(parentId, grandparentId);
    page.moveNoteIntoContainer(childId, parentId);

    // Try to drop grandparent into its descendant childId
    page.moveNoteIntoContainer(grandparentId, childId);

    expect(page.parentOf.value.has(grandparentId)).toBe(false);
  });

  it("reverses container children", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(0, 0);
    const a = page.createNoteAt(10, 10);
    const b = page.createNoteAt(20, 20);
    const c = page.createNoteAt(30, 30);

    page.moveNoteIntoContainer(a, containerId);
    page.moveNoteIntoContainer(b, containerId);
    page.moveNoteIntoContainer(c, containerId);

    const containerModel = page.noteList.value.find(
      (n) => n.id === containerId,
    )!.model;
    expect(containerModel.container.children.value).toEqual([a, b, c]);

    page.reverseChildren(containerId);
    expect(containerModel.container.children.value).toEqual([c, b, a]);
  });

  it("imports children from text files into a container", async () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(100, 100);
    const file = new File(["Hello world\nLine two"], "test.txt", {
      type: "text/plain",
    });

    await page.importChildrenFromFiles(containerId, [file]);

    expect(page.noteList.value.length).toBe(2); // container + child

    const containerModel = page.noteList.value.find(
      (n) => n.id === containerId,
    )!.model;
    expect(containerModel.container.children.value.length).toBe(1);

    const childId = containerModel.container.children.value[0]!;
    const childModel = page.noteList.value.find(
      (n) => n.id === childId,
    )!.model;
    expect(childModel.head.enabled.value).toBe(true);
    expect(childModel.body.enabled.value).toBe(false);
    expect(childModel.container.enabled.value).toBe(false);
  });

  it("imports children from markdown files into a container", async () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const containerId = page.createNoteAt(100, 100);
    const file = new File(["# Title\n\nParagraph"], "test.md", {
      type: "text/markdown",
    });

    await page.importChildrenFromFiles(containerId, [file]);

    const containerModel = page.noteList.value.find(
      (n) => n.id === containerId,
    )!.model;
    expect(containerModel.container.children.value.length).toBe(1);

    const childId = containerModel.container.children.value[0]!;
    const childModel = page.noteList.value.find(
      (n) => n.id === childId,
    )!.model;
    expect(childModel.head.enabled.value).toBe(true);
  });

  it("clones selected notes and arrows", () => {
    const ydoc = createPageYDoc();
    const page = useSpatialPage(ydoc);

    const n1 = page.createNoteAt(0, 0);
    const n2 = page.createNoteAt(100, 0);
    const a1 = page.createArrow(n1, n2);

    const noteEntries = page.noteList.value.filter(
      (n) => n.id === n1 || n.id === n2,
    );
    const arrowEntries = page.arrowList.value.filter((a) => a.id === a1);

    const result = page.cloneNotes(noteEntries, arrowEntries, 20, 20);

    expect(result.noteIds.length).toBe(2);
    expect(result.arrowIds.length).toBe(1);

    // Cloned notes should be offset
    const clonedNote = page.noteList.value.find(
      (n) => n.id === result.noteIds[0],
    );
    expect(clonedNote!.model.pos.value).toEqual({ x: 20, y: 20 });

    // Cloned arrow should point to cloned notes
    const clonedArrow = page.arrowList.value.find(
      (a) => a.id === result.arrowIds[0],
    );
    expect(clonedArrow!.model.source.value).toBe(result.noteIds[0]);
    expect(clonedArrow!.model.target.value).toBe(result.noteIds[1]);
  });
});
