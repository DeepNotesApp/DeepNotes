import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import CollabAvatars from "./CollabAvatars.vue";

function createAwareness() {
  const ydoc = new Y.Doc();
  return new Awareness(ydoc);
}

describe("CollabAvatars", () => {
  it("does not render when no remote users are present", () => {
    const awareness = createAwareness();
    const wrapper = mount(CollabAvatars, {
      props: { awareness },
    });
    expect(wrapper.find('[data-testid="collab-avatars"]').exists()).toBe(false);
  });

  it("renders avatar for a single remote user", async () => {
    const awareness = createAwareness();
    const self = awareness.doc.clientID;
    const remoteId = self + 1;
    awareness.setLocalStateField("user", { name: "Alice", color: "#ff0000" });
    awareness.states.set(remoteId, { user: { name: "Bob", color: "#00ff00" } });
    awareness.emit("change", [{ added: [remoteId], updated: [], removed: [] }, "local"]);

    const wrapper = mount(CollabAvatars, {
      props: { awareness },
    });
    await wrapper.vm.$nextTick();
    const avatars = wrapper.findAll('[data-testid="collab-avatar"]');
    expect(avatars.length).toBe(1);
    expect(avatars[0]!.attributes("title")).toBe("Bob");
  });

  it("renders multiple remote users", async () => {
    const awareness = createAwareness();
    const self = awareness.doc.clientID;
    awareness.states.set(self + 1, { user: { name: "Bob", color: "#00ff00" } });
    awareness.states.set(self + 2, { user: { name: "Charlie", color: "#0000ff" } });

    const wrapper = mount(CollabAvatars, {
      props: { awareness },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('[data-testid="collab-avatar"]')).toHaveLength(2);
  });

  it("shows count badge next to avatars", async () => {
    const awareness = createAwareness();
    const self = awareness.doc.clientID;
    awareness.states.set(self + 1, { user: { name: "Bob", color: "#00ff00" } });

    const wrapper = mount(CollabAvatars, {
      props: { awareness },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("1");
  });
});
