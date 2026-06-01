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

  it("shows body type buttons", () => {
    const ydoc = createPageYDoc();
    const model = createArrowModel(ydoc, "arrow-1");

    wrapper = mount(ArrowPropertiesCard, {
      props: { arrowId: "arrow-1", arrowModel: model },
    });

    const buttons = wrapper.findAll("button");
    const texts = buttons.map((b) => b.text());
    expect(texts).toContain("Curve");
    expect(texts).toContain("Line");
  });

  it("shows body style buttons", () => {
    const ydoc = createPageYDoc();
    const model = createArrowModel(ydoc, "arrow-1");

    wrapper = mount(ArrowPropertiesCard, {
      props: { arrowId: "arrow-1", arrowModel: model },
    });

    const buttons = wrapper.findAll("button");
    const texts = buttons.map((b) => b.text());
    expect(texts).toContain("Solid");
    expect(texts).toContain("Dashed");
    expect(texts).toContain("Dotted");
  });

  it("emits update:body-type when line button is clicked", async () => {
    const ydoc = createPageYDoc();
    const model = createArrowModel(ydoc, "arrow-1");

    wrapper = mount(ArrowPropertiesCard, {
      props: { arrowId: "arrow-1", arrowModel: model },
    });

    const lineButton = wrapper.findAll("button").find((b) => b.text() === "Line");
    expect(lineButton).toBeDefined();
    await lineButton!.trigger("click");
    expect(wrapper.emitted("update:body-type")).toHaveLength(1);
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
