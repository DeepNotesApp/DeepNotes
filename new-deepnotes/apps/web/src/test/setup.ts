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

// Suppress KaTeX quirks mode warning (happy-dom doesn't support doctype properly)
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('KaTeX doesn\'t work in quirks mode')) {
    return;
  }
  originalWarn(...args);
};
