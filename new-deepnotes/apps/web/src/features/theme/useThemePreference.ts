import { computed } from "vue";
import { createSharedComposable } from "@vueuse/shared";
import { useColorMode } from "@vueuse/core";

const STORAGE_KEY = "deepnotes.theme";

export type ThemePreference = "light" | "dark" | "system";

/** Map legacy value before VueUse hydration / useColorMode reads storage. */
export function migrateStoredThemeKey(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "system") {
      localStorage.setItem(STORAGE_KEY, "auto");
    }
  } catch {
    /* ignore */
  }
}

/**
 * Apply `.dark` from localStorage + `prefers-color-scheme` before `createApp`
 * to reduce incorrect-theme flash.
 */
export function hydrateThemeFromStorage(): void {
  if (typeof document === "undefined") {
    return;
  }
  migrateStoredThemeKey();

  let stored: "light" | "dark" | "auto" = "auto";
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark") {
        stored = raw;
      } else if (raw === "auto") {
        stored = "auto";
      }
    }
  } catch {
    /* ignore */
  }

  let prefersDark = false;
  try {
    prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    /* ignore */
  }

  const dark =
    stored === "dark" || (stored === "auto" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

const useThemePreferenceBase = () => {
  migrateStoredThemeKey();

  const colorMode = useColorMode({
    storageKey: STORAGE_KEY,
    selector: "html",
    attribute: "class",
  });

  const preference = computed({
    get(): ThemePreference {
      const s = colorMode.store.value;
      return s === "auto" ? "system" : (s as "light" | "dark");
    },
    set(next: ThemePreference) {
      colorMode.store.value = next === "system" ? "auto" : next;
    },
  });

  const resolvedDark = computed(() => colorMode.state.value === "dark");

  return { preference, resolvedDark, colorMode };
};

export const useThemePreference = createSharedComposable(useThemePreferenceBase);
