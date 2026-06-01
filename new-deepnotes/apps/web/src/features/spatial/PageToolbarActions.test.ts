import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PageToolbarActions from "./PageToolbarActions.vue";

describe("PageToolbarActions", () => {
  function mountComponent() {
    return mount(PageToolbarActions);
  }

  it("renders insert note button", () => {
    const wrapper = mountComponent();
    const btn = wrapper.find('[data-testid="toolbar-insert-note"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain("Note");
  });

  it("renders insert arrow button", () => {
    const wrapper = mountComponent();
    const btn = wrapper.find('[data-testid="toolbar-insert-arrow"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain("Arrow");
  });

  it("emits insert-note on click", async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="toolbar-insert-note"]').trigger("click");
    expect(wrapper.emitted("insert-note")).toHaveLength(1);
  });

  it("emits insert-arrow on click", async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="toolbar-insert-arrow"]').trigger("click");
    expect(wrapper.emitted("insert-arrow")).toHaveLength(1);
  });

  it("emits zoom-in on click", async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="toolbar-zoom-in"]').trigger("click");
    expect(wrapper.emitted("zoom-in")).toHaveLength(1);
  });

  it("emits zoom-out on click", async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="toolbar-zoom-out"]').trigger("click");
    expect(wrapper.emitted("zoom-out")).toHaveLength(1);
  });

  it("emits fit-to-screen on click", async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="toolbar-fit-to-screen"]').trigger("click");
    expect(wrapper.emitted("fit-to-screen")).toHaveLength(1);
  });
});
