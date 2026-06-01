<script setup lang="ts">
import { RouterLink } from "vue-router";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/useSession";
import { unreadNotificationCount } from "@/features/notifications/useNotificationBadge";
import ThemeSwitcher from "@/features/theme/ThemeSwitcher.vue";
import { isDark } from "@/features/theme/useThemePreference";
import {
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
} from "lucide-vue-next";

const props = defineProps<{
  leftExpanded?: boolean;
  rightExpanded?: boolean;
}>();

const emit = defineEmits<{
  "toggle-left": [];
  "toggle-right": [];
}>();

const { isAuthenticated, bootstrapped, loading, logout } = useSession();

const marketingUrl =
  import.meta.env.VITE_MARKETING_APP_URL?.trim().replace(/\/+$/, "") ||
  "https://deepnotes.app";

async function onLogout() {
  await logout();
}
</script>

<template>
  <header
    class="border-border/40 bg-background/95 flex flex-none items-center border-b backdrop-blur supports-[backdrop-filter]:bg-background/60 h-11"
  >
    <!-- Left: sidebar toggle + logo -->
    <div class="flex flex-none items-center gap-1 pl-1">
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 shrink-0"
        @click="emit('toggle-left')"
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
      <slot />
    </div>

    <!-- Page actions -->
    <div class="hidden flex-none items-center gap-1 pr-1 md:flex">
      <slot name="actions" />
    </div>

    <!-- Right: global nav + theme + sidebar toggle -->
    <div class="flex flex-none items-center gap-1 pr-1">
      <nav
        v-if="bootstrapped && isAuthenticated"
        class="hidden items-center gap-1 md:flex"
      >
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
        @click="emit('toggle-right')"
      >
        <PanelRight v-if="rightExpanded" class="h-4 w-4" />
        <ChevronLeft v-else class="h-4 w-4" />
      </Button>
    </div>
  </header>
</template>
