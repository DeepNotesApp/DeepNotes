import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import * as Y from "yjs";

import DisplayNote from "./DisplayNote.vue";
import { useNoteModel } from "./note-model";
import { addNoteToPage, createPageYDoc } from "@deepnotes/collab-wire";

function createNoteModel(ydoc: Y.Doc, id: string, opts?: { containerEnabled?: boolean }) {
  const noteMap = addNoteToPage(ydoc, id);
  if (opts?.containerEnabled) {
    const containerMap = noteMap.get("container") as Y.Map<unknown>;
    containerMap.set("enabled", true);
  }
  return useNoteModel(noteMap);
}

describe("DisplayNote", () => {
  it("renders a single note without children", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    const wrapper = mount(DisplayNote, {
      props: { model, zoom: 1 },
    });

    expect(wrapper.findAll('[data-testid="display-note"]')).toHaveLength(1);
  });

  it("renders child notes when container is enabled", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", { containerEnabled: true });
    const childModel = createNoteModel(ydoc, "child-1");

    const wrapper = mount(DisplayNote, {
      props: { model: parentModel, zoom: 1, childModels: [childModel] },
    });

    const notes = wrapper.findAll('[data-testid="display-note"]');
    expect(notes).toHaveLength(2);
  });

  it("does not render children when container is disabled", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", { containerEnabled: false });
    const childModel = createNoteModel(ydoc, "child-1");

    const wrapper = mount(DisplayNote, {
      props: { model: parentModel, zoom: 1, childModels: [childModel] },
    });

    expect(wrapper.findAll('[data-testid="display-note"]')).toHaveLength(1);
  });
});
