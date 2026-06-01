import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PagePropertiesCard from "./PagePropertiesCard.vue";

describe("PagePropertiesCard", () => {
  it("renders page id input", () => {
    const wrapper = mount(PagePropertiesCard, {
      props: { pageId: "page-123", relativeTitle: "My Page" },
    });
    const inputs = wrapper.findAll("input");
    const pageIdInput = inputs.find((i) =>
      (i.element as HTMLInputElement).value.includes("page-123"),
    );
    expect(pageIdInput).toBeDefined();
  });

  it("renders relative title input", () => {
    const wrapper = mount(PagePropertiesCard, {
      props: { pageId: "page-123", relativeTitle: "My Page" },
    });
    const input = wrapper.find('input[placeholder="Page title"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe("My Page");
  });

  it("renders absolute title input", () => {
    const wrapper = mount(PagePropertiesCard, {
      props: { pageId: "page-123", absoluteTitle: "Full Title" },
    });
    const input = wrapper.find('input[placeholder="Full page title"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe("Full Title");
  });

  it("emits toggle-favorite on favorite button click", async () => {
    const wrapper = mount(PagePropertiesCard, {
      props: { pageId: "page-123", isFavorite: false },
    });
    const btn = wrapper.findAll("button").find((b) =>
      b.text().includes("Add to favorites"),
    );
    expect(btn).toBeDefined();
    await btn!.trigger("click");
    expect(wrapper.emitted("toggle-favorite")).toHaveLength(1);
  });

  it("shows remove from favorites when isFavorite is true", () => {
    const wrapper = mount(PagePropertiesCard, {
      props: { pageId: "page-123", isFavorite: true },
    });
    expect(wrapper.text()).toContain("Remove from favorites");
  });
});
