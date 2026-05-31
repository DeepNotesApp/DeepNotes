<script setup lang="ts">
import { computed, provide, ref } from "vue";
import { RouterLink } from "vue-router";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/useSession";
import { unreadNotificationCount } from "@/features/notifications/useNotificationBadge";
import ThemeSwitcher from "@/features/theme/ThemeSwitcher.vue";
import { isDark } from "@/features/theme/useThemePreference";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Menu,
  PanelLeft,
  PanelRight,
} from "lucide-vue-next";

const { isAuthenticated, bootstrapped, loading, logout, user } = useSession();

const marketingUrl =
  import.meta.env.VITE_MARKETING_APP_URL?.trim().replace(/\/$/, "") ||
  "https://deepnotes.app";

// --- sidebar state ---
const leftExpanded = ref(true);
const rightExpanded = ref(true);
const leftWidth = ref(240);

function toggleLeft() {
  leftExpanded.value = !leftExpanded.value;
}
function toggleRight() {
  rightExpanded.value = !rightExpanded.value;
}
function resetLeftWidth() {
  leftWidth.value = 240;
}

// --- provide to descendants ---
provide("pageLayout", {
  leftExpanded,
  rightExpanded,
  leftWidth,
  toggleLeft,
  toggleRight,
});

// --- resize handle ---
let resizeActive = false;
function onResizePointerDown(e: PointerEvent) {
  resizeActive = true;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function onResizePointerMove(e: PointerEvent) {
  if (!resizeActive) return;
  leftWidth.value = Math.max(180, Math.min(400, e.clientX));
}
function onResizePointerUp(e: PointerEvent) {
  resizeActive = false;
  try {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

async function onLogout() {
  await logout();
}

const headerHeightClass = "h-11";
const headerHeightPx = 44;
</script>

<template>
  <div
    class="bg-background text-foreground fixed inset-0 z-0 flex flex-col overflow-hidden select-none"
  >
    <!-- === Header toolbar === -->
    <header
      class="border-border/40 bg-background/95 flex flex-none items-center border-b backdrop-blur supports-[backdrop-filter]:bg-background/60"
      :class="headerHeightClass"
    >
      <!-- Left: sidebar toggle + logo -->
      <div class="flex flex-none items-center gap-1 pl-1">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0"
          @click="toggleLeft"
        >
          <PanelLeft v-if="leftExpanded" class="h-4 w-4" />
          <ChevronRight v-else class="h-4 w-4" />
        </Button>

        <a
          :href="marketingUrl"
          class="flex items-center gap-2 text-sm font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <img
            :src="isDark ? '/white-logo-outline.webp' : '/black-logo.png'"
            alt="DeepNotes"
            class="h-5 w-5"
          />
          <span class="hidden sm:inline">DeepNotes</span>
        </a>
      </div>

      <!-- Center: breadcrumb path (slot) -->
      <div class="flex min-w-0 flex-1 items-center justify-center px-2">
        <slot name="toolbar-center" />
      </div>

      <!-- Right: global nav + theme + sidebar toggle -->
      <div class="flex flex-none items-center gap-1 pr-1">
        <nav v-if="bootstrapped && isAuthenticated" class="hidden items-center gap-1 md:flex">
          <Button as-child size="sm" variant="ghost">
            <RouterLink to="/pages">Pages</RouterLink>
          </Button>
          <Button as-child size="sm" variant="ghost">
            <RouterLink to="/groups">Groups</RouterLink>
          </Button>
          <Button as-child size="sm" variant="ghost" class="relative">
            <RouterLink to="/notifications">
              Notifications
              <span
                v-if="unreadNotificationCount > 0"
                class="bg-primary text-primary-foreground absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold"
              >
                {{ unreadNotificationCount > 99 ? "99+" : unreadNotificationCount }}
              </span>
            </RouterLink>
          </Button>
          <Button as-child size="sm" variant="ghost">
            <RouterLink to="/account">Account</RouterLink>
          </Button>
        </nav>

        <ThemeSwitcher />

        <template v-if="bootstrapped">
          <template v-if="!isAuthenticated">
            <Button as-child variant="ghost" size="sm">
              <RouterLink to="/login">Sign in</RouterLink>
            </Button>
          </template>
          <template v-else>
            <Button
              :disabled="loading"
              size="sm"
              variant="ghost"
              @click="onLogout"
            >
              Sign out
            </Button>
          </template>
        </template>

        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0"
          @click="toggleRight"
        >
          <PanelRight v-if="rightExpanded" class="h-4 w-4" />
          <ChevronLeft v-else class="h-4 w-4" />
        </Button>
      </div>
    </header>

    <!-- === Body: sidebars + canvas === -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left sidebar -->
      <aside
        v-show="leftExpanded"
        class="border-border/40 bg-muted/30 relative flex flex-col overflow-hidden border-r"
        :style="{ width: `${leftWidth}px`, minWidth: `${leftWidth}px` }"
      >
        <div class="flex-1 overflow-y-auto p-2">
          <slot name="left-sidebar" />
        </div>

        <!-- Resize handle -->
        <div
          class="hover:bg-primary/30 absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize"
          @pointerdown="onResizePointerDown"
          @pointermove="onResizePointerMove"
          @pointerup="onResizePointerUp"
          @dblclick="resetLeftWidth"
        />
      </aside>

      <!-- Main canvas area -->
      <main class="relative isolate flex flex-1 flex-col overflow-hidden">
        <slot />

        <!-- Floating overlay (pointer-events-none children get pointer-events-auto) -->
        <div
          class="pointer-events-none absolute inset-0 z-10"
          :style="{ top: '0px' }"
        >
          <slot name="floating-overlay" />
        </div>
      </main>

      <!-- Right sidebar -->
      <aside
        v-show="rightExpanded"
        class="border-border/40 bg-muted/30 flex flex-col overflow-y-auto border-l"
        :style="{ width: '300px', minWidth: '300px' }"
      >
        <div class="p-2">
          <slot name="right-sidebar" />
        </div>
      </aside>
    </div>
  </div>
</template>
