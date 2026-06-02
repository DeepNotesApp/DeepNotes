import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import * as Y from "yjs";
import ArrowPropertiesCard from "./ArrowPropertiesCard.vue";
import { useArrowModel } from "./arrow-model";
import { addArrowToPage, createPageYDoc } from "@deepnotes/collab-wire";

function createArrowModel(ydoc: Y.Doc, id: string) {
  const arrowMap = addArrowToPage(ydoc, id);
  return useArrowModel(arrowMap);
}

describe("ArrowPropertiesCard", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("renders when arrowId is provided", () => {
    const ydoc = createPageYDoc();
    const model = createArrowModel(ydoc, "arrow-1");

    wrapper = mount(ArrowPropertiesCard, {
      props: { arrowId: "arrow-1", arrowModel: model },
    });

    expect(wrapper.find("[data-testid='arrow-properties-card']").exists()).toBe(true);
  });

  it("does not render when arrowId is null", () => {
    wrapper = mount(ArrowPropertiesCard, {
      props: { arrowId: null, arrowModel: null },
    });

    expect(wrapper.find("[data-testid='arrow-properties-card']").exists()).toBe(false);
  });

  it("renders body type and body style Select components", () => {
    const ydoc = createPageYDoc();
    const model = createArrowModel(ydoc, "arrow-1");

    wrapper = mount(ArrowPropertiesCard, {
      props: { arrowId: "arrow-1", arrowModel: model },
    });

    const triggers = wrapper.findAllComponents({ name: "SelectTrigger" });
    // Body Type, Arrow Heads (2), Anchors (2), Body Style
    expect(triggers.length).toBeGreaterThanOrEqual(4);
  });

  it("shows read-only toggle", () => {
    const ydoc = createPageYDoc();
    const model = createArrowModel(ydoc, "arrow-1");

    wrapper = mount(ArrowPropertiesCard, {
      props: { arrowId: "arrow-1", arrowModel: model },
    });

    const labels = wrapper.findAll("label");
    const labelTexts = labels.map((l) => l.text());
    expect(labelTexts).toContain("Read-only");
  });
});
