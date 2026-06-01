import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import * as Y from "yjs";

import SpatialPageView from "./SpatialPageView.vue";
import { createPageYDoc, addNoteToPage, addArrowToPage } from "@deepnotes/collab-wire";

function setupDocWithNotes(...positions: { x: number; y: number }[]) {
  const ydoc = createPageYDoc();
  const ids = positions.map((pos, i) => {
    const id = `note-${i}`;
    const note = addNoteToPage(ydoc, id);
    const posMap = note.get("pos") as Y.Map<number>;
    posMap.set("x", pos.x);
    posMap.set("y", pos.y);
    return id;
  });
  return { ydoc, ids };
}

function mockPointerCapture(el: Element) {
  const htmlEl = el as HTMLDivElement;
  htmlEl.setPointerCapture = vi.fn();
  htmlEl.releasePointerCapture = vi.fn();
}

describe("SpatialPageView", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("renders notes from Yjs doc", () => {
    const { ydoc } = setupDocWithNotes({ x: 10, y: 20 }, { x: 100, y: 200 });
    wrapper = mount(SpatialPageView, {
      props: { ydoc },
      global: { stubs: { Teleport: true } },
    });
    expect(wrapper.findAll('[data-testid="display-note"]')).toHaveLength(2);
  });

  it("renders arrows from Yjs doc", () => {
    const ydoc = createPageYDoc();
    addNoteToPage(ydoc, "note-1");
    addNoteToPage(ydoc, "note-2");
    const arrow = addArrowToPage(ydoc, "arrow-1");
    arrow.set("source", "note-1");
    arrow.set("target", "note-2");

    wrapper = mount(SpatialPageView, {
      props: { ydoc },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.findAll('[data-testid="display-arrow"]')).toHaveLength(1);
  });

  it("creates a note on double-click", async () => {
    const { ydoc } = setupDocWithNotes();
    wrapper = mount(SpatialPageView, {
      props: { ydoc },
      global: { stubs: { Teleport: true } },
    });

    const canvas = wrapper.find('[data-testid="spatial-world-canvas"]');
    await canvas.trigger("dblclick", { clientX: 100, clientY: 100 });

    expect(wrapper.findAll('[data-testid="display-note"]')).toHaveLength(1);
  });

  it("deletes all notes on Ctrl+A then Delete", async () => {
    const { ydoc } = setupDocWithNotes({ x: 10, y: 20 }, { x: 100, y: 200 });
    wrapper = mount(SpatialPageView, {
      props: { ydoc },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.findAll('[data-testid="display-note"]')).toHaveLength(2);

    const selectAllEvent = new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true });
    window.dispatchEvent(selectAllEvent);

    const deleteEvent = new KeyboardEvent("keydown", { key: "Delete", bubbles: true });
    window.dispatchEvent(deleteEvent);

    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.findAll('[data-testid="display-note"]')).toHaveLength(0);
  });

  it("exposes insertNoteAtCenter method", () => {
    const { ydoc } = setupDocWithNotes();
    wrapper = mount(SpatialPageView, {
      props: { ydoc },
      global: { stubs: { Teleport: true } },
    });

    expect(typeof (wrapper.vm as any).insertNoteAtCenter).toBe("function");
  });
});
