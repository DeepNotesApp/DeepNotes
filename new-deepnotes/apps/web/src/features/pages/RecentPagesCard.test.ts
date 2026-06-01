import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

vi.mock("vue-router", () => ({
  RouterLink: defineComponent({
    props: ["to"],
    setup(props, { slots }) {
      return () => h("a", { "data-testid": "router-link", "data-to": props.to }, slots);
    },
  }),
}));

import RecentPagesCard from "./RecentPagesCard.vue";

describe("RecentPagesCard", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("renders empty state when no recent pages", () => {
    wrapper = mount(RecentPagesCard, {
      props: { recentPageIds: [], currentPageId: "p1", pageLabels: {} },
    });
    expect(wrapper.text()).toContain("No recent pages");
  });

  it("renders recent page links with labels", () => {
    wrapper = mount(RecentPagesCard, {
      props: {
        recentPageIds: ["p1", "p2"],
        currentPageId: "p1",
        pageLabels: { p1: "Alpha", p2: "Beta" },
      },
    });

    const links = wrapper.findAll('[data-testid="router-link"]');
    expect(links).toHaveLength(2);
    expect(links[0]!.text()).toBe("Alpha");
    expect(links[1]!.text()).toBe("Beta");
  });

  it("highlights current page link", () => {
    wrapper = mount(RecentPagesCard, {
      props: {
        recentPageIds: ["p1", "p2"],
        currentPageId: "p1",
        pageLabels: { p1: "Alpha", p2: "Beta" },
      },
    });

    const links = wrapper.findAll('[data-testid="router-link"]');
    expect(links[0]!.classes()).toContain("bg-accent");
    expect(links[1]!.classes()).not.toContain("bg-accent");
  });

  it("emits clear when clear button clicked", async () => {
    wrapper = mount(RecentPagesCard, {
      props: {
        recentPageIds: ["p1"],
        currentPageId: "p1",
        pageLabels: {},
      },
    });

    const button = wrapper.find("button");
    await button.trigger("click");
    expect(wrapper.emitted("clear")).toHaveLength(1);
  });

  it("disables clear button when no recent pages", () => {
    wrapper = mount(RecentPagesCard, {
      props: { recentPageIds: [], currentPageId: "p1", pageLabels: {} },
    });

    const button = wrapper.find("button");
    expect(button.attributes("disabled")).toBeDefined();
  });
});
