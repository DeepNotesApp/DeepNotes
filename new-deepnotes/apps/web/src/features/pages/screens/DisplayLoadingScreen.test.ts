import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DisplayLoadingScreen from "./DisplayLoadingScreen.vue";

describe("DisplayLoadingScreen", () => {
  it("renders spinner and loading text", () => {
    const wrapper = mount(DisplayLoadingScreen);
    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading page");
  });
});
