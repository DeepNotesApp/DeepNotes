import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createPageYDoc, addNoteToPage, YPAGE_NOTE_KEY } from "@deepnotes/collab-wire";

import { useNoteModel } from "./note-model";

describe("note-model reactivity", () => {
  it("reads default pos, width, and primitives", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.pos.value).toEqual({ x: 0, y: 0 });
    expect(model.width.value).toEqual({ expanded: "Auto", collapsed: "Auto" });
    expect(model.zIndex.value).toBe(-1);
    expect(model.movable.value).toBe(true);
    expect(model.resizable.value).toBe(true);
    expect(model.readOnly.value).toBe(false);
    expect(model.link.value).toBe("");
  });

  it("reacts to pos mutation via Yjs", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.pos.value).toEqual({ x: 0, y: 0 });

    const posMap = note.get(YPAGE_NOTE_KEY.pos) as Y.Map<number>;
    ydoc.transact(() => {
      posMap.set("x", 120);
      posMap.set("y", 340);
    });

    expect(model.pos.value).toEqual({ x: 120, y: 340 });
  });

  it("reacts to width mutation", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    const widthMap = note.get(YPAGE_NOTE_KEY.width) as Y.Map<string>;
    widthMap.set("expanded", "240px");

    expect(model.width.value.expanded).toBe("240px");
  });

  it("reacts to head.enabled mutation", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.head.enabled.value).toBe(true);

    const headMap = note.get(YPAGE_NOTE_KEY.head) as Y.Map<unknown>;
    headMap.set("enabled", false);

    expect(model.head.enabled.value).toBe(false);
  });

  it("reacts to container properties", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.container.enabled.value).toBe(false);
    expect(model.container.wrapChildren.value).toBe(false);

    const containerMap = note.get(YPAGE_NOTE_KEY.container) as Y.Map<unknown>;
    containerMap.set("enabled", true);
    containerMap.set("wrapChildren", true);

    expect(model.container.enabled.value).toBe(true);
    expect(model.container.wrapChildren.value).toBe(true);
  });

  it("reacts to collapsing.localCollapsing mutation", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.collapsing.localCollapsing.value).toBe(false);

    const collapsingMap = note.get(YPAGE_NOTE_KEY.collapsing) as Y.Map<boolean>;
    collapsingMap.set("localCollapsing", true);

    expect(model.collapsing.localCollapsing.value).toBe(true);
  });

  it("reacts to color mutations", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.color.value).toEqual({ inherit: false, value: "grey" });

    const colorMap = note.get(YPAGE_NOTE_KEY.color) as Y.Map<unknown>;
    colorMap.set("value", "blue");
    colorMap.set("inherit", true);

    expect(model.color.value).toEqual({ inherit: true, value: "blue" });
  });

  it("reads createdAt / editedAt / movedAt", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.createdAt.value).toBeNull();
    expect(model.editedAt.value).toBeNull();
    expect(model.movedAt.value).toBeNull();
  });
});
