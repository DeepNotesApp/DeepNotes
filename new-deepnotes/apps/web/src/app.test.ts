import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import App from "./App.vue";

describe("App", () => {
  it("renders shell copy", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("DeepNotes");
    expect(wrapper.text()).toContain("Greenfield SPA");
  });
});
