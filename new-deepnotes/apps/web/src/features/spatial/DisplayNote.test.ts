import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import * as Y from "yjs";

import DisplayNote from "./DisplayNote.vue";
import { useNoteModel } from "./note-model";
import { addNoteToPage, createPageYDoc } from "@deepnotes/collab-wire";

function createNoteModel(
  ydoc: Y.Doc,
  id: string,
  opts?: {
    containerEnabled?: boolean;
    containerSpatial?: boolean;
    containerHorizontal?: boolean;
    containerWrapChildren?: boolean;
    containerStretchChildren?: boolean;
    collapsingEnabled?: boolean;
    colorInherit?: boolean;
    colorValue?: string;
    readOnly?: boolean;
    movable?: boolean;
    resizable?: boolean;
  },
) {
  const noteMap = addNoteToPage(ydoc, id);
  if (opts?.containerEnabled) {
    const containerMap = noteMap.get("container") as Y.Map<unknown>;
    containerMap.set("enabled", true);
    if (opts.containerSpatial !== undefined) containerMap.set("spatial", opts.containerSpatial);
    if (opts.containerHorizontal !== undefined) containerMap.set("horizontal", opts.containerHorizontal);
    if (opts.containerWrapChildren !== undefined) containerMap.set("wrapChildren", opts.containerWrapChildren);
    if (opts.containerStretchChildren !== undefined) containerMap.set("stretchChildren", opts.containerStretchChildren);
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
  if (opts?.readOnly !== undefined) {
    noteMap.set("readOnly", opts.readOnly);
  }
  if (opts?.movable !== undefined) {
    noteMap.set("movable", opts.movable);
  }
  if (opts?.resizable !== undefined) {
    noteMap.set("resizable", opts.resizable);
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
      props: { id: "note-1", model, zoom: 1, parentColor: "#6C1313" },
    });

    const el = wrapper.find('[data-testid="display-note"] > div');
    const style = el.attributes("style");
    expect(style).toContain("background-color: #6C1313");
  });

  it("uses own color when color.inherit is false", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { colorInherit: false, colorValue: "blue" });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, parentColor: "#ef4444" },
    });

    const el = wrapper.find('[data-testid="display-note"] > div');
    const style = el.attributes("style");
    // Light mode blue note color
    expect(style).toContain("background-color: #D8E0FF");
  });

  function mockPointerCapture(el: { element: Element }) {
    const htmlEl = el.element as HTMLDivElement;
    htmlEl.setPointerCapture = vi.fn();
    htmlEl.releasePointerCapture = vi.fn();
  }

  it("emits select on pointer down", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    mockPointerCapture(el);
    await el.trigger('pointerdown', { button: 0 });
    expect(wrapper.emitted('select')).toHaveLength(1);
  });

  it("emits toggle on ctrl+pointer down", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    mockPointerCapture(el);
    await el.trigger('pointerdown', { button: 0, ctrlKey: true });
    expect(wrapper.emitted('toggle')).toHaveLength(1);
  });

  it("emits shiftClick on shift+pointer down", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    mockPointerCapture(el);
    await el.trigger('pointerdown', { button: 0, shiftKey: true });
    expect(wrapper.emitted('shiftClick')).toHaveLength(1);
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it("emits dragstart when movable and not readOnly", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { movable: true, readOnly: false });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    mockPointerCapture(el);
    await el.trigger('pointerdown', { button: 0, clientX: 0, clientY: 0 });
    // Dragging only starts after 5px threshold (like legacy listenPointerEvents)
    await el.trigger('pointermove', { clientX: 10, clientY: 0 });
    expect(wrapper.emitted('dragstart')).toHaveLength(1);
  });

  it("does not emit dragstart when readOnly", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { readOnly: true });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    mockPointerCapture(el);
    await el.trigger('pointerdown', { button: 0 });
    expect(wrapper.emitted('dragstart')).toBeUndefined();
  });

  it("does not emit dragstart when not movable", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { movable: false });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    mockPointerCapture(el);
    await el.trigger('pointerdown', { button: 0 });
    expect(wrapper.emitted('dragstart')).toBeUndefined();
  });

  it("renders 8 resize handles when selected, resizable and not readOnly", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { resizable: true, readOnly: false });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, selected: true },
    });

    // 4 resize bars + 4 corner resize handles (filter by cursor style)
    const resizeZones = wrapper.findAll('[data-testid="display-note"] > div').filter((d) =>
      d.attributes('style')?.includes('cursor'),
    );
    expect(resizeZones.length).toBe(8);
  });

  it("hides resize handles when not selected", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { resizable: true, readOnly: false });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, selected: false },
    });

    const resizeZones = wrapper.findAll('[data-testid="display-note"] > div').filter((d) =>
      d.attributes('style')?.includes('cursor'),
    );
    expect(resizeZones.length).toBe(0);
  });

  it("hides resize handles when not resizable", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { resizable: false });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, selected: true },
    });

    const resizeZones = wrapper.findAll('[data-testid="display-note"] > div').filter((d) =>
      d.attributes('style')?.includes('cursor'),
    );
    expect(resizeZones.length).toBe(0);
  });

  it("hides resize handles when readOnly", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { resizable: true, readOnly: true });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, selected: true },
    });

    const resizeZones = wrapper.findAll('[data-testid="display-note"] > div').filter((d) =>
      d.attributes('style')?.includes('cursor'),
    );
    expect(resizeZones.length).toBe(0);
  });

  it("renders 4 arrow handles when selected and not readOnly", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { readOnly: false });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, selected: true },
    });

    const handles = wrapper.findAll('[data-testid="display-note"] > svg.note-arrow-handle');
    expect(handles.length).toBe(4);
  });

  it("hides arrow handles when not selected", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, selected: false },
    });

    const handles = wrapper.findAll('[data-testid="display-note"] > svg.note-arrow-handle');
    expect(handles.length).toBe(0);
  });

  it("hides arrow handles when readOnly", () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { readOnly: true });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1, selected: true },
    });

    const handles = wrapper.findAll('[data-testid="display-note"] > svg.note-arrow-handle');
    expect(handles.length).toBe(0);
  });

  it("emits context-menu on right-click", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1");

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    await el.trigger('contextmenu');
    expect(wrapper.emitted('context-menu')).toHaveLength(1);
  });

  it("does not emit context-menu when readOnly", async () => {
    const ydoc = createPageYDoc();
    const model = createNoteModel(ydoc, "note-1", { readOnly: true });

    wrapper = mount(DisplayNote, {
      props: { id: "note-1", model, zoom: 1 },
    });

    const el = wrapper.find('[data-testid="display-note"]');
    await el.trigger('contextmenu');
    expect(wrapper.emitted('context-menu')).toBeUndefined();
  });

  it("renders spatial container children with absolute positioning", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", { containerEnabled: true, containerSpatial: true });
    const childModel = createNoteModel(ydoc, "child-1");

    wrapper = mount(DisplayNote, {
      props: {
        id: "parent",
        model: parentModel,
        zoom: 1,
        childModels: [{ id: "child-1", model: childModel }],
      },
    });

    const container = wrapper.find('[data-testid="container-children"]');
    expect(container.exists()).toBe(true);
    expect(container.classes()).not.toContain("flex");

    const child = container.find('[data-testid="display-note"]');
    expect(child.classes()).toContain("absolute");
    expect(child.classes()).not.toContain("relative");
  });

  it("renders non-spatial horizontal container with flex row", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", {
      containerEnabled: true,
      containerSpatial: false,
      containerHorizontal: true,
    });
    const childModel = createNoteModel(ydoc, "child-1");

    wrapper = mount(DisplayNote, {
      props: {
        id: "parent",
        model: parentModel,
        zoom: 1,
        childModels: [{ id: "child-1", model: childModel }],
      },
    });

    const container = wrapper.find('[data-testid="container-children"]');
    expect(container.classes()).toContain("flex");
    expect(container.classes()).toContain("flex-row");

    const child = container.find('[data-testid="display-note"]');
    expect(child.classes()).toContain("relative");
    expect(child.classes()).not.toContain("absolute");
  });

  it("renders non-spatial vertical container with flex col", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", {
      containerEnabled: true,
      containerSpatial: false,
      containerHorizontal: false,
    });
    const childModel = createNoteModel(ydoc, "child-1");

    wrapper = mount(DisplayNote, {
      props: {
        id: "parent",
        model: parentModel,
        zoom: 1,
        childModels: [{ id: "child-1", model: childModel }],
      },
    });

    const container = wrapper.find('[data-testid="container-children"]');
    expect(container.classes()).toContain("flex");
    expect(container.classes()).toContain("flex-col");
  });

  it("applies flex-wrap when wrapChildren is true", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", {
      containerEnabled: true,
      containerSpatial: false,
      containerHorizontal: true,
      containerWrapChildren: true,
    });
    const childModel = createNoteModel(ydoc, "child-1");

    wrapper = mount(DisplayNote, {
      props: {
        id: "parent",
        model: parentModel,
        zoom: 1,
        childModels: [{ id: "child-1", model: childModel }],
      },
    });

    const container = wrapper.find('[data-testid="container-children"]');
    expect(container.classes()).toContain("flex-wrap");
  });

  it("applies items-stretch when stretchChildren is true", () => {
    const ydoc = createPageYDoc();
    const parentModel = createNoteModel(ydoc, "parent", {
      containerEnabled: true,
      containerSpatial: false,
      containerHorizontal: true,
      containerStretchChildren: true,
    });
    const childModel = createNoteModel(ydoc, "child-1");

    wrapper = mount(DisplayNote, {
      props: {
        id: "parent",
        model: parentModel,
        zoom: 1,
        childModels: [{ id: "child-1", model: childModel }],
      },
    });

    const container = wrapper.find('[data-testid="container-children"]');
    expect(container.classes()).toContain("items-stretch");
  });
});
