import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { migrateLegacyTheme, toggleTheme } from "./useThemePreference";

const NEW_KEY = "deepnotes-theme";
const OLD_KEY = "deepnotes.theme";

describe("theme preference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("migrates legacy dark value to new key", () => {
    localStorage.setItem(OLD_KEY, "dark");
    migrateLegacyTheme();
    expect(localStorage.getItem(NEW_KEY)).toBe("dark");
    expect(localStorage.getItem(OLD_KEY)).toBeNull();
  });

  it("migrates legacy non-dark value by removing old key only", () => {
    localStorage.setItem(OLD_KEY, "light");
    migrateLegacyTheme();
    expect(localStorage.getItem(NEW_KEY)).toBeNull();
    expect(localStorage.getItem(OLD_KEY)).toBeNull();
  });

  it("toggle applies dark and persists", () => {
    toggleTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(NEW_KEY)).toBe("dark");
  });

  it("toggle removes dark and persists light", () => {
    document.documentElement.classList.add("dark");
    localStorage.setItem(NEW_KEY, "dark");
    toggleTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(NEW_KEY)).toBe("light");
  });
});
