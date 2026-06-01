import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import * as Y from "yjs";

import DisplayArrow from "./DisplayArrow.vue";
import { useArrowModel } from "./arrow-model";
import { useNoteModel } from "./note-model";
import { addNoteToPage, addArrowToPage, createPageYDoc } from "@deepnotes/collab-wire";

function setupArrow(
  opts?: {
    bodyType?: "curve" | "line";
    sourceHead?: string;
    targetHead?: string;
    color?: string;
    selected?: boolean;
    sourcePos?: { x: number; y: number };
    targetPos?: { x: number; y: number };
  },
) {
  const ydoc = createPageYDoc();

  const sourceNoteMap = addNoteToPage(ydoc, "note-src");
  const targetNoteMap = addNoteToPage(ydoc, "note-tgt");
  const arrowMap = addArrowToPage(ydoc, "arrow-1");

  const sourcePos = opts?.sourcePos ?? { x: 0, y: 0 };
  const targetPos = opts?.targetPos ?? { x: 100, y: 0 };

  (sourceNoteMap.get("pos") as Y.Map<number>).set("x", sourcePos.x);
  (sourceNoteMap.get("pos") as Y.Map<number>).set("y", sourcePos.y);
  (targetNoteMap.get("pos") as Y.Map<number>).set("x", targetPos.x);
  (targetNoteMap.get("pos") as Y.Map<number>).set("y", targetPos.y);

  arrowMap.set("source", "note-src");
  arrowMap.set("target", "note-tgt");
  if (opts?.bodyType) arrowMap.set("bodyType", opts.bodyType);
  if (opts?.sourceHead) arrowMap.set("sourceHead", opts.sourceHead);
  if (opts?.targetHead) arrowMap.set("targetHead", opts.targetHead);
  if (opts?.color) arrowMap.set("color", opts.color);

  const sourceModel = useNoteModel(sourceNoteMap);
  const targetModel = useNoteModel(targetNoteMap);
  const arrowModel = useArrowModel(arrowMap);

  return { ydoc, sourceModel, targetModel, arrowModel };
}

describe("DisplayArrow", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("renders svg when source and target are present", () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow();
    wrapper = mount(DisplayArrow, {
      props: {
        id: "arrow-1",
        model: arrowModel,
        sourceModel,
        targetModel,
      },
    });

    expect(wrapper.find('[data-testid="display-arrow"]').exists()).toBe(true);
  });

  it("does not render svg when source or target is missing", () => {
    const ydoc = createPageYDoc();
    const arrowMap = addArrowToPage(ydoc, "arrow-1");
    const arrowModel = useArrowModel(arrowMap);

    wrapper = mount(DisplayArrow, {
      props: {
        id: "arrow-1",
        model: arrowModel,
      },
    });

    expect(wrapper.find('[data-testid="display-arrow"]').exists()).toBe(false);
  });

  it("renders curve body path when bodyType is curve", () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow({ bodyType: "curve" });
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel },
    });

    const path = wrapper.findAll('path').find((p) =>
      p.attributes('stroke-linecap') === 'round',
    );
    expect(path?.attributes('d')).toContain('Q');
  });

  it("renders line body path when bodyType is line", () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow({ bodyType: "line" });
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel },
    });

    const path = wrapper.findAll('path').find((p) =>
      p.attributes('stroke-linecap') === 'round',
    );
    expect(path?.attributes('d')).toContain('L');
  });

  it("uses primary stroke when selected", () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow();
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel, selected: true },
    });

    const visiblePath = wrapper.findAll('path').find((p) =>
      p.attributes('stroke-linecap') === 'round',
    );
    expect(visiblePath?.attributes('stroke')).toBe('var(--primary)');
  });

  it("uses arrow color stroke when not selected", () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow({ color: "red" });
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel, selected: false },
    });

    const visiblePath = wrapper.findAll('path').find((p) =>
      p.attributes('stroke-linecap') === 'round',
    );
    expect(visiblePath?.attributes('stroke')).toBe('#ef4444');
  });

  it("renders target head marker when targetHead is open", () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow({ targetHead: "open" });
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel },
    });

    const defs = wrapper.find('defs');
    expect(defs.find('marker').exists()).toBe(true);
  });

  it("emits select on pointer down", async () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow();
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel },
    });

    const hitbox = wrapper.findAll('path').find((p) =>
      p.attributes('stroke') === 'transparent',
    );
    expect(hitbox).toBeDefined();
    await hitbox!.trigger('pointerdown', { button: 0 });
    expect(wrapper.emitted('select')).toHaveLength(1);
  });

  it("emits toggle on ctrl+pointer down", async () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow();
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel },
    });

    const hitbox = wrapper.findAll('path').find((p) =>
      p.attributes('stroke') === 'transparent',
    );
    await hitbox!.trigger('pointerdown', { button: 0, ctrlKey: true });
    expect(wrapper.emitted('toggle')).toHaveLength(1);
  });

  it("emits reconnectStart on source connection zone pointer down", async () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow();
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel },
    });

    const circles = wrapper.findAll('circle');
    // First circle is source connection zone
    await circles[0]!.trigger('pointerdown');
    expect(wrapper.emitted('reconnectStart')).toHaveLength(1);
    expect(wrapper.emitted('reconnectStart')![0]).toEqual(['arrow-1', 'source']);
  });

  it("emits reconnectStart on target connection zone pointer down", async () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow();
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel },
    });

    const circles = wrapper.findAll('circle');
    // Second circle is target connection zone
    await circles[1]!.trigger('pointerdown');
    expect(wrapper.emitted('reconnectStart')).toHaveLength(1);
    expect(wrapper.emitted('reconnectStart')![0]).toEqual(['arrow-1', 'target']);
  });

  it("renders label foreignObject when label fragment is present", () => {
    const { arrowModel, sourceModel, targetModel } = setupArrow();
    wrapper = mount(DisplayArrow, {
      props: { id: "arrow-1", model: arrowModel, sourceModel, targetModel },
    });

    expect(wrapper.find('foreignObject').exists()).toBe(true);
  });
});
