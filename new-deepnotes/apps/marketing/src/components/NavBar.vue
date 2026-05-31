<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { Button } from "@/components/ui/button";

const route = useRoute();
const appHref = computed(() => import.meta.env.VITE_WEB_APP_URL?.trim() || "/");

const navLinks = [
  { to: "/pricing", label: "Pricing" },
  { to: "/help", label: "Help" },
  { to: "/whitepaper", label: "Whitepaper" },
];

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + "/");
}

const isDark = ref(
  typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
);

function toggleTheme() {
  const html = document.documentElement;
  const next = !html.classList.contains("dark");
  if (next) {
    html.classList.add("dark");
    localStorage.setItem("deepnotes-theme", "dark");
  } else {
    html.classList.remove("dark");
    localStorage.setItem("deepnotes-theme", "light");
  }
  isDark.value = next;
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div
      class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6"
    >
      <div class="flex items-center gap-6">
        <RouterLink
          to="/"
          class="flex items-center gap-2 text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          <img
            src="/white-logo-outline.webp"
            alt="DeepNotes"
            class="h-7 w-7"
          />
          DeepNotes
        </RouterLink>

        <nav class="hidden items-center gap-1 md:flex">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            :class="[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive(link.to)
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ]"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          <svg
            v-if="isDark"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <svg
            v-else
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </button>

        <Button as="a" :href="appHref" variant="default" size="sm">
          Open app
        </Button>
      </div>
    </div>
  </header>
</template>
