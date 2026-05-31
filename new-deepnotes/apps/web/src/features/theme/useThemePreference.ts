import { ref } from "vue";

const STORAGE_KEY = "deepnotes-theme";
const LEGACY_KEY = "deepnotes.theme";

/** One-time migration from the old `deepnotes.theme` key. */
export function migrateLegacyTheme(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) {
      if (old === "dark") {
        localStorage.setItem(STORAGE_KEY, "dark");
      }
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* ignore */
  }
}

const _isDark = ref(
  typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
);

/** Reactive dark-mode state. */
export const isDark = _isDark;

/** Toggle dark mode and persist to localStorage. */
export function toggleTheme(): void {
  migrateLegacyTheme();
  const html = document.documentElement;
  const next = !html.classList.contains("dark");
  if (next) {
    html.classList.add("dark");
    localStorage.setItem(STORAGE_KEY, "dark");
  } else {
    html.classList.remove("dark");
    localStorage.removeItem(STORAGE_KEY);
  }
  _isDark.value = next;
}
