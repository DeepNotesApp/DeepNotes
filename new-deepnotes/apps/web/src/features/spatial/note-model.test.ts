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

  it("reacts to createdAt / editedAt / movedAt mutations", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    note.set(YPAGE_NOTE_KEY.createdAt, 1700000000000);
    note.set(YPAGE_NOTE_KEY.editedAt, 1700000001000);
    note.set(YPAGE_NOTE_KEY.movedAt, 1700000002000);

    expect(model.createdAt.value).toBe(1700000000000);
    expect(model.editedAt.value).toBe(1700000001000);
    expect(model.movedAt.value).toBe(1700000002000);
  });

  it("reads head wrap and height", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.head.wrap.value).toBe(true);
    expect(model.head.height.value).toEqual({
      expanded: "Auto",
      collapsed: "Auto",
    });
  });

  it("reacts to head.wrap and head.height mutations", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    const headMap = note.get(YPAGE_NOTE_KEY.head) as Y.Map<unknown>;
    headMap.set("wrap", false);

    const headHeightMap = headMap.get("height") as Y.Map<string>;
    headHeightMap.set("expanded", "120px");

    expect(model.head.wrap.value).toBe(false);
    expect(model.head.height.value.expanded).toBe("120px");
  });

  it("reads body enabled, wrap, and height", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.body.enabled.value).toBe(false);
    expect(model.body.wrap.value).toBe(true);
    expect(model.body.height.value).toEqual({
      expanded: "Auto",
      collapsed: "Auto",
    });
  });

  it("reacts to body mutations", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    const bodyMap = note.get(YPAGE_NOTE_KEY.body) as Y.Map<unknown>;
    bodyMap.set("enabled", true);
    bodyMap.set("wrap", false);

    const bodyHeightMap = bodyMap.get("height") as Y.Map<string>;
    bodyHeightMap.set("expanded", "80px");

    expect(model.body.enabled.value).toBe(true);
    expect(model.body.wrap.value).toBe(false);
    expect(model.body.height.value.expanded).toBe("80px");
  });

  it("reacts to container.spatial, .horizontal, .stretchChildren, .forceColorInheritance", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.container.spatial.value).toBe(false);
    expect(model.container.horizontal.value).toBe(false);
    expect(model.container.stretchChildren.value).toBe(true);
    expect(model.container.forceColorInheritance.value).toBe(false);

    const containerMap = note.get(YPAGE_NOTE_KEY.container) as Y.Map<unknown>;
    containerMap.set("spatial", true);
    containerMap.set("horizontal", true);
    containerMap.set("stretchChildren", false);
    containerMap.set("forceColorInheritance", true);

    expect(model.container.spatial.value).toBe(true);
    expect(model.container.horizontal.value).toBe(true);
    expect(model.container.stretchChildren.value).toBe(false);
    expect(model.container.forceColorInheritance.value).toBe(true);
  });

  it("reacts to anchor mutations", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.anchor.value).toEqual({ x: 0.5, y: 0.5 });

    const anchorMap = note.get(YPAGE_NOTE_KEY.anchor) as Y.Map<number>;
    anchorMap.set("x", 0.25);
    anchorMap.set("y", 0.75);

    expect(model.anchor.value).toEqual({ x: 0.25, y: 0.75 });
  });

  it("reacts to link mutations", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.link.value).toBe("");

    note.set(YPAGE_NOTE_KEY.link, "/pages/some-page-id");

    expect(model.link.value).toBe("/pages/some-page-id");
  });

  it("reads and reacts to width.collapsed", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.width.value.collapsed).toBe("Auto");

    const widthMap = note.get(YPAGE_NOTE_KEY.width) as Y.Map<string>;
    widthMap.set("collapsed", "Minimum");

    expect(model.width.value.collapsed).toBe("Minimum");
  });

  it("allows direct write to colorValue and colorInherit refs", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    expect(model.color.value).toEqual({ inherit: false, value: "grey" });

    model.colorValue.value = "blue";
    model.colorInherit.value = true;

    expect(model.color.value).toEqual({ inherit: true, value: "blue" });

    const colorMap = note.get(YPAGE_NOTE_KEY.color) as Y.Map<unknown>;
    expect(colorMap.get("value")).toBe("blue");
    expect(colorMap.get("inherit")).toBe(true);
  });

  it("allows direct write to widthExpanded and widthCollapsed refs", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    model.widthExpanded.value = "200px";
    model.widthCollapsed.value = "Minimum";

    expect(model.width.value).toEqual({ expanded: "200px", collapsed: "Minimum" });

    const widthMap = note.get(YPAGE_NOTE_KEY.width) as Y.Map<string>;
    expect(widthMap.get("expanded")).toBe("200px");
    expect(widthMap.get("collapsed")).toBe("Minimum");
  });

  it("allows direct write to heightExpanded and heightCollapsed refs", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    model.heightExpanded.value = "120px";
    model.heightCollapsed.value = "Auto";

    expect(model.height.value).toEqual({ expanded: "120px", collapsed: "Auto" });

    const heightMap = note.get(YPAGE_NOTE_KEY.height) as Y.Map<string>;
    expect(heightMap.get("expanded")).toBe("120px");
    expect(heightMap.get("collapsed")).toBe("Auto");
  });

  it("allows direct write to posX and posY refs", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    model.posX.value = 150;
    model.posY.value = 250;

    expect(model.pos.value).toEqual({ x: 150, y: 250 });

    const posMap = note.get(YPAGE_NOTE_KEY.pos) as Y.Map<number>;
    expect(posMap.get("x")).toBe(150);
    expect(posMap.get("y")).toBe(250);
  });

  it("allows direct write to anchorX and anchorY refs", () => {
    const ydoc = createPageYDoc();
    const note = addNoteToPage(ydoc, "n1");
    const model = useNoteModel(note);

    model.anchorX.value = 0.25;
    model.anchorY.value = 0.75;

    expect(model.anchor.value).toEqual({ x: 0.25, y: 0.75 });

    const anchorMap = note.get(YPAGE_NOTE_KEY.anchor) as Y.Map<number>;
    expect(anchorMap.get("x")).toBe(0.25);
    expect(anchorMap.get("y")).toBe(0.75);
  });
});
