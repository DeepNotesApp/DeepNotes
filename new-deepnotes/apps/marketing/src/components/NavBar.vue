<script setup lang="ts">
import { computed } from "vue";
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
          class="text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
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
        <Button as="a" :href="appHref" variant="default" size="sm">
          Open app
        </Button>
      </div>
    </div>
  </header>
</template>
