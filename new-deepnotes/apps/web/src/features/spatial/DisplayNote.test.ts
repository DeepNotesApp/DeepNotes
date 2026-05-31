import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import * as Y from "yjs";

import DisplayNote from "./DisplayNote.vue";
import { useNoteModel } from "./note-model";
import { addNoteToPage, createPageYDoc } from "@deepnotes/collab-wire";

function createNoteModel(
  ydoc: Y.Doc,
  id: string,
  opts?: { containerEnabled?: boolean; collapsingEnabled?: boolean; colorInherit?: boolean; colorValue?: string },
) {
  const noteMap = addNoteToPage(ydoc, id);
  if (opts?.containerEnabled) {
    const containerMap = noteMap.get("container") as Y.Map<unknown>;
    containerMap.set("enabled", true);
  }
  if (opts?.collapsingEnabled) {
    const collapsingMap = noteMap.get("collapsing") as Y.Map<boolean>;
    collapsingMap.set("enabled", true);
  }
  if (opts?.colorInherit !== undefined || opts?.colorValue !== undefined) {
    const colorMap = noteMap.get("color") as Y.Map<unknown>;
    if (opts.colorInherit !== undefined) colorMap.set("inherit", opts.colorInherit);
    if (opts.colorValue !== undefined) colorMap.set("value", opts.colorValue);
  }
  return useNoteModel(noteMap);
}

describe("DisplayNote", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("renders a single note without children", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    expect(wrapper.findAll('[data-testid="display-note"]')).toHaveLength(1);
  });

  it("renders child notes when container is enabled", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", { containerEnabled: true });
    const childModel = createNoteModel(ydoc, "child-1");

    wrapper = mount(DisplayNote, {
      props: {
        id: "parent",
        model: parentModel,
        zoom: 1,
        childModels: [{ id: "child-1", model: childModel }],
      },
    });

    const notes = wrapper.findAll('[data-testid="display-note"]');
    expect(notes).toHaveLength(2);
  });

  it("does not render children when container is disabled", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", { containerEnabled: false });
    const childModel = createNoteModel(ydoc, "child-1");

    wrapper = mount(DisplayNote, {
      props: {
        id: "parent",
        model: parentModel,
        zoom: 1,
        childModels: [{ id: "child-1", model: childModel }],
      },
    });

    expect(wrapper.findAll('[data-testid="display-note"]')).toHaveLength(1);
  });

  it("shows collapse button when collapsing is enabled", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { collapsingEnabled: true });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("hides collapse button when collapsing is disabled", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("inherits parent color when color.inherit is true", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { colorInherit: true });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, parentColor: "#ef4444" },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    const style = el.attributes("style");
    expect(style).toContain("border-color: #ef4444");
  });

  it("uses own color when color.inherit is false", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { colorInherit: false, colorValue: "blue" });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, parentColor: "#ef4444" },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    const style = el.attributes("style");
    expect(style).toContain("border-color: #3b82f6");
  });
});
