<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/features/auth/useSession";
import NotificationsPopover from "@/features/notifications/NotificationsPopover.vue";
import ThemeSwitcher from "@/features/theme/ThemeSwitcher.vue";
import { isDark } from "@/features/theme/useThemePreference";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  PanelLeft,
  PanelRight,
  Settings,
  User,
} from "@lucide/vue";

const props = defineProps<{
  leftExpanded?: boolean;
  rightExpanded?: boolean;
}>();

const emit = defineEmits<{
  "toggle-left": [];
  "toggle-right": [];
}>();

const { isAuthenticated, bootstrapped, loading, logout } = useSession();
const router = useRouter();

const marketingUrl =
  import.meta.env.VITE_MARKETING_APP_URL?.trim().replace(/\/+$/, "") ||
  "https://deepnotes.app";

async function onLogout() {
  await logout();
  await router.push("/login");
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

    <!-- Right: notifications + theme + profile + sidebar toggle -->
    <div class="flex flex-none items-center gap-1 pr-1">
      <!-- Notifications popover -->
      <NotificationsPopover v-if="bootstrapped && isAuthenticated" />

      <ThemeSwitcher />

      <!-- Auth -->
      <template v-if="bootstrapped">
        <template v-if="!isAuthenticated">
          <Button as-child variant="ghost" size="sm">
            <RouterLink to="/login">Sign in</RouterLink>
          </Button>
        </template>
        <template v-else>
          <!-- Profile dropdown -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
              >
                <User class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem as-child>
                <RouterLink to="/account" class="flex items-center gap-2">
                  <Settings class="h-4 w-4" />
                  <span>Settings</span>
                </RouterLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                :disabled="loading"
                class="text-destructive focus:text-destructive flex items-center gap-2"
                @click="onLogout"
              >
                <LogOut class="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
