import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

vi.mock("@/features/spatial/MainToolbar.vue", () => ({
  default: defineComponent({
    name: "MainToolbarMock",
    props: ["leftExpanded", "rightExpanded"],
    emits: ["toggle-left", "toggle-right"],
    setup(props, { slots }) {
      return () =>
        h(
          "header",
          { "data-testid": "main-toolbar" },
          slots,
        );
    },
  }),
}));

import PageLayout from "./PageLayout.vue";

describe("PageLayout", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("renders fullscreen shell with no overflow", () => {
    wrapper = mount(PageLayout);
    const root = wrapper.find("div.fixed.inset-0");
    expect(root.exists()).toBe(true);
    expect(root.classes()).toContain("overflow-hidden");
    expect(root.classes()).toContain("select-none");
  });

  it("renders MainToolbar", () => {
    wrapper = mount(PageLayout);
    expect(wrapper.find('[data-testid="main-toolbar"]').exists()).toBe(true);
  });

  it("renders left sidebar when expanded", () => {
    wrapper = mount(PageLayout);
    const aside = wrapper.findAll("aside");
    expect(aside.length).toBeGreaterThanOrEqual(1);
    // First aside is left sidebar; v-show=true means no display:none
    const style = aside[0]!.attributes("style") ?? "";
    expect(style).not.toContain("display: none");
  });

  it("hides left sidebar when toggled off", async () => {
    wrapper = mount(PageLayout);
    const toolbar = wrapper.findComponent({ name: "MainToolbarMock" });
    // Emit toggle-left to collapse left sidebar
    await toolbar.vm.$emit("toggle-left");
    await wrapper.vm.$nextTick();
    const aside = wrapper.findAll("aside");
    expect(aside[0]!.attributes("style")).toContain("display: none");
  });

  it("renders right sidebar when expanded", () => {
    wrapper = mount(PageLayout);
    const aside = wrapper.findAll("aside");
    expect(aside.length).toBe(2);
    const style = aside[1]!.attributes("style") ?? "";
    expect(style).not.toContain("display: none");
  });

  it("hides right sidebar on first toggle", async () => {
    wrapper = mount(PageLayout);
    const toolbar = wrapper.findComponent({ name: "MainToolbarMock" });
    await toolbar.vm.$emit("toggle-right");
    await wrapper.vm.$nextTick();
    const aside = wrapper.findAll("aside");
    expect(aside[1]!.attributes("style")).toContain("display: none");
  });

  it("shows right sidebar on second toggle", async () => {
    wrapper = mount(PageLayout);
    const toolbar = wrapper.findComponent({ name: "MainToolbarMock" });
    await toolbar.vm.$emit("toggle-right");
    await toolbar.vm.$emit("toggle-right");
    await wrapper.vm.$nextTick();
    const aside = wrapper.findAll("aside");
    const style = aside[1]!.attributes("style") ?? "";
    expect(style).not.toContain("display: none");
    expect(style).toContain("300px");
  });

  it("renders default slot in main canvas area", () => {
    wrapper = mount(PageLayout, {
      slots: {
        default: h("div", { "data-testid": "canvas-slot" }, "Canvas"),
      },
    });
    expect(wrapper.find('[data-testid="canvas-slot"]').exists()).toBe(true);
  });

  it("renders left-sidebar slot inside left aside", () => {
    wrapper = mount(PageLayout, {
      slots: {
        "left-sidebar": h("div", { "data-testid": "left-slot" }, "Left"),
      },
    });
    expect(wrapper.find('[data-testid="left-slot"]').exists()).toBe(true);
  });

  it("renders right-sidebar slot inside right aside", () => {
    wrapper = mount(PageLayout, {
      slots: {
        "right-sidebar": h("div", { "data-testid": "right-slot" }, "Right"),
      },
    });
    expect(wrapper.find('[data-testid="right-slot"]').exists()).toBe(true);
  });

  it("renders floating-overlay slot inside pointer-events-none overlay", () => {
    wrapper = mount(PageLayout, {
      slots: {
        "floating-overlay": h("div", { "data-testid": "floating-slot" }, "Floating"),
      },
    });
    const overlay = wrapper.find('[data-testid="floating-slot"]').element.parentElement;
    expect(overlay?.classList.contains("pointer-events-none")).toBe(true);
  });
});
