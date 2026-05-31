<script setup lang="ts">
import { RouterLink } from "vue-router";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/useSession";
import { unreadNotificationCount } from "@/features/notifications/useNotificationBadge";
import ThemeSwitcher from "@/features/theme/ThemeSwitcher.vue";
import { isDark } from "@/features/theme/useThemePreference";

const { isAuthenticated, bootstrapped, loading, logout } = useSession();

const marketingUrl = import.meta.env.VITE_MARKETING_APP_URL?.trim().replace(/\/$/, "") || "https://deepnotes.app";

async function onLogout() {
  await logout();
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
        <a
          :href="marketingUrl"
          class="flex items-center gap-2 text-lg font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <img
            :src="isDark ? '/white-logo-outline.webp' : '/black-logo.png'"
            alt="DeepNotes"
            class="h-7 w-7"
          />
          DeepNotes
        </a>

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
      </div>

      <div class="flex items-center gap-2">
        <ThemeSwitcher />
        <template v-if="bootstrapped">
          <template v-if="!isAuthenticated">
            <Button as-child variant="ghost" size="sm">
              <RouterLink to="/login">Sign in</RouterLink>
            </Button>
            <Button as-child variant="default" size="sm">
              <RouterLink to="/register">Register</RouterLink>
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
      </div>
    </div>
  </header>
</template>
