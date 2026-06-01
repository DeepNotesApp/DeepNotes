import { vi } from "vitest";

// Mock Vue Router composables only, preserve real exports
vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      go: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      currentRoute: { value: { path: "/", params: {}, query: {}, meta: {} } },
    }),
    useRoute: () => ({ path: "/", params: {}, query: {}, meta: {} }),
  };
});

// Set up proper HTML doctype for KaTeX
document.documentElement.innerHTML = "<!DOCTYPE html><html><head></head><body></body></html>";
