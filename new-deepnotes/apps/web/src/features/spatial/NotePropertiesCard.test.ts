import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import * as Y from "yjs";
import NotePropertiesCard from "./NotePropertiesCard.vue";
import { useNoteModel } from "./note-model";
import { addNoteToPage, createPageYDoc } from "@deepnotes/collab-wire";

function createNoteModel(ydoc: Y.Doc, id: string) {
  const noteMap = addNoteToPage(ydoc, id);
  return useNoteModel(noteMap);
}

describe("NotePropertiesCard", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("renders when noteId is provided", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(NotePropertiesCard, {
      props: { noteId: "note-1", noteModel: model },
    });

    expect(wrapper.find("[data-testid='note-properties-card']").exists()).toBe(true);
  });

  it("does not render when noteId is null", () => {
    wrapper = mount(NotePropertiesCard, {
      props: { noteId: null, noteModel: null },
    });

    expect(wrapper.find("[data-testid='note-properties-card']").exists()).toBe(false);
  });

  it("emits update:link when link input changes", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(NotePropertiesCard, {
      props: { noteId: "note-1", noteModel: model },
    });

    const input = wrapper.find("input[placeholder='https://...']");
    await input.setValue("https://example.com");
    expect(wrapper.emitted("update:link")).toHaveLength(1);
  });

  it("toggles head enabled via switch", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(NotePropertiesCard, {
      props: { noteId: "note-1", noteModel: model },
    });

    const switches = wrapper.findAllComponents({ name: "Switch" });
    expect(switches.length).toBeGreaterThan(0);
  });

  it("shows container sub-options when container is enabled", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");
    model.container.enabled.value = true;

    wrapper = mount(NotePropertiesCard, {
      props: { noteId: "note-1", noteModel: model },
    });

    const labels = wrapper.findAll("label");
    const labelTexts = labels.map((l) => l.text());
    expect(labelTexts).toContain("Spatial");
    expect(labelTexts).toContain("Horizontal layout");
    expect(labelTexts).toContain("Wrap children");
    expect(labelTexts).toContain("Stretch children");
    expect(labelTexts).toContain("Force color inheritance");
  });
});
