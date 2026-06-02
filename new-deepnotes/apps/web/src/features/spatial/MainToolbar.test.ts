import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

const mockPush = vi.fn();

vi.mock("vue-router", () => ({
  RouterLink: defineComponent({
    props: ["to"],
    setup(props, { slots }) {
      return () => h("a", { "data-testid": "router-link", "data-to": props.to }, slots);
    },
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/features/auth/useSession", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/features/notifications/useNotificationBadge", () => ({
  unreadNotificationCount: ref(0),
}));

vi.mock("@/features/theme/useThemePreference", () => ({
  isDark: ref(false),
}));

vi.mock("@/features/theme/ThemeSwitcher.vue", () => ({
  default: defineComponent({
    setup() {
      return () => h("button", { "data-testid": "theme-switcher" }, "Theme");
    },
  }),
}));

import { useSession } from "@/features/auth/useSession";
import MainToolbar from "./MainToolbar.vue";

describe("MainToolbar", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  function mockSession(overrides?: {
    isAuthenticated?: boolean;
    bootstrapped?: boolean;
    loading?: boolean;
  }) {
    const session = {
      isAuthenticated: ref(overrides?.isAuthenticated ?? true),
      bootstrapped: ref(overrides?.bootstrapped ?? true),
      loading: ref(overrides?.loading ?? false),
      logout: vi.fn().mockResolvedValue(undefined),
      user: ref(null),
    };
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue(session);
    return session;
  }

  it("renders header with logo and sidebar toggles", () => {
    mockSession();
    wrapper = mount(MainToolbar, {
      props: { leftExpanded: true, rightExpanded: true },
    });

    expect(wrapper.find("header").exists()).toBe(true);
    expect(wrapper.find("img[alt='DeepNotes']").exists()).toBe(true);
  });

  it("emits toggle-left when left sidebar button clicked", async () => {
    mockSession();
    wrapper = mount(MainToolbar, {
      props: { leftExpanded: true, rightExpanded: true },
    });

    const buttons = wrapper.findAll("button");
    // First button is toggle-left
    await buttons[0]!.trigger("click");
    expect(wrapper.emitted("toggle-left")).toHaveLength(1);
  });

  it("emits toggle-right when right sidebar button clicked", async () => {
    mockSession();
    wrapper = mount(MainToolbar, {
      props: { leftExpanded: true, rightExpanded: true },
    });

    const buttons = wrapper.findAll("button");
    // Last button is toggle-right
    await buttons[buttons.length - 1]!.trigger("click");
    expect(wrapper.emitted("toggle-right")).toHaveLength(1);
  });

  it("shows global nav links when authenticated and bootstrapped", () => {
    mockSession({ isAuthenticated: true, bootstrapped: true });
    wrapper = mount(MainToolbar, {
      props: { leftExpanded: true, rightExpanded: true },
    });

    const links = wrapper.findAll('[data-testid="router-link"]');
    const toValues = links.map((l) => l.attributes("data-to"));
    expect(toValues).toContain("/pages");
    expect(toValues).toContain("/groups");
    expect(toValues).toContain("/notifications");
    expect(toValues).toContain("/account");
  });

  it("shows sign in link when not authenticated", () => {
    mockSession({ isAuthenticated: false, bootstrapped: true });
    wrapper = mount(MainToolbar, {
      props: { leftExpanded: true, rightExpanded: true },
    });

    const links = wrapper.findAll('[data-testid="router-link"]');
    const toValues = links.map((l) => l.attributes("data-to"));
    expect(toValues).toContain("/login");
    expect(toValues).not.toContain("/pages");
  });

  it("renders theme switcher", () => {
    mockSession();
    wrapper = mount(MainToolbar, {
      props: { leftExpanded: true, rightExpanded: true },
    });

    expect(wrapper.find('[data-testid="theme-switcher"]').exists()).toBe(true);
  });

  it("renders center slot content", () => {
    mockSession();
    wrapper = mount(MainToolbar, {
      props: { leftExpanded: true, rightExpanded: true },
      slots: {
        default: h("span", { "data-testid": "center-slot" }, "Breadcrumb"),
      },
    });

    expect(wrapper.find('[data-testid="center-slot"]').exists()).toBe(true);
  });

  it("renders actions slot content", () => {
    mockSession();
    wrapper = mount(MainToolbar, {
      props: { leftExpanded: true, rightExpanded: true },
      slots: {
        actions: h("button", { "data-testid": "action-btn" }, "Action"),
      },
    });

    expect(wrapper.find('[data-testid="action-btn"]').exists()).toBe(true);
  });
});
