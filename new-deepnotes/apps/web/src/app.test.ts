import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";

import App from "./App.vue";
import { createAppRouter } from "./router";

describe("App", () => {
  it("renders shell after session bootstrap (no session cookie)", async () => {
    const router = createAppRouter();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [router] },
    });
    for (let i = 0; i < 30; i++) {
      await flushPromises();
      await nextTick();
      if (wrapper.find('[data-testid="app-shell"]').exists()) {
        break;
      }
    }

    expect(wrapper.find('[data-testid="app-shell"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("DeepNotes");
    expect(wrapper.text()).toContain("Sign in");
  });
});
