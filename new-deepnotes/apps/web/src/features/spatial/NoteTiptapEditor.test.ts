import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import * as Y from "yjs";

import NoteTiptapEditor from "./NoteTiptapEditor.vue";

function createFragmentWithText(text: string): Y.XmlFragment {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("test");
  const paragraph = new Y.XmlElement("paragraph");
  paragraph.insert(0, [new Y.XmlText(text)]);
  fragment.insert(0, [paragraph]);
  return fragment;
}

describe("NoteTiptapEditor", () => {
  it("mounts a Tiptap editor bound to a Y.XmlFragment", async () => {
    const fragment = createFragmentWithText("Hello");

    const wrapper = mount(NoteTiptapEditor, {
      props: {
        fragment,
        editable: true,
        placeholder: "Type here…",
      },
    });

    // EditorContent should render once Tiptap initializes
    await new Promise((resolve) => setTimeout(resolve, 50));

    const editorContent = wrapper.find(".note-tiptap-editor");
    expect(editorContent.exists()).toBe(true);
    expect(editorContent.text()).toContain("Hello");
  });

  it("renders in non-editable mode when editable is false", async () => {
    const fragment = createFragmentWithText("Read-only");

    const wrapper = mount(NoteTiptapEditor, {
      props: { fragment, editable: false },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const editorContent = wrapper.find(".note-tiptap-editor");
    expect(editorContent.exists()).toBe(true);
    expect(editorContent.text()).toContain("Read-only");
  });
});
