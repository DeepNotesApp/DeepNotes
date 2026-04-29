import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { hydrateThemeFromStorage, migrateStoredThemeKey } from "./useThemePreference";

const KEY = "deepnotes.theme";

describe("theme preference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("migrates legacy system value to auto", () => {
    localStorage.setItem(KEY, "system");
    migrateStoredThemeKey();
    expect(localStorage.getItem(KEY)).toBe("auto");
  });

  it("hydrate applies dark when stored dark", () => {
    localStorage.setItem(KEY, "dark");
    hydrateThemeFromStorage();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("hydrate follows prefers-color-scheme when auto", () => {
    localStorage.setItem(KEY, "auto");
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((q: string) => ({
        matches: q.includes("dark"),
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    hydrateThemeFromStorage();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
