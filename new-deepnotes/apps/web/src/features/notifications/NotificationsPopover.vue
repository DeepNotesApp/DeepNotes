<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ArrowRight } from "@lucide/vue";

import { useNotifications } from "./useNotifications";
import { unreadNotificationCount } from "./useNotificationBadge";

const open = ref(false);

const {
  rows,
  loadFirst,
  loadMore,
  markRead,
  loading,
  error,
  hasMore,
  markingRead,
} = useNotifications();

const localUnreadCount = computed(
  () => rows.value.filter((r) => r.unread).length,
);

watch(open, (isOpen) => {
  if (isOpen && rows.value.length === 0 && !loading.value) {
    void loadFirst();
  }
});

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative h-8 w-8"
      >
        <Bell class="h-4 w-4" />
        <span
          v-if="unreadNotificationCount > 0"
          class="bg-primary text-primary-foreground absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full px-0.5 text-[9px] font-bold"
        >
          {{ unreadNotificationCount > 99 ? "99+" : unreadNotificationCount }}
        </span>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent class="w-80 max-h-96 overflow-hidden p-0" align="end">
      <!-- Header -->
      <div class="flex items-center justify-between border-b px-3 py-2">
        <span class="text-sm font-semibold">Notifications</span>
        <Button
          v-if="localUnreadCount > 0"
          variant="ghost"
          size="sm"
          class="h-6 text-xs"
          :disabled="markingRead"
          @click="markRead()"
        >
          Mark all read
        </Button>
      </div>

      <!-- Scrollable list -->
      <div class="max-h-72 overflow-y-auto px-3 py-2">
        <p v-if="loading && rows.length === 0" class="text-muted-foreground text-xs">
          Loading…
        </p>
        <p v-else-if="error" class="text-destructive text-xs">
          {{ error }}
        </p>
        <ul v-else-if="rows.length > 0" class="space-y-2">
          <li
            v-for="n in rows"
            :key="n.id"
            class="rounded-md border px-2 py-1.5 text-xs"
            :class="n.unread ? 'border-primary/30 bg-muted/40' : 'border-border/40'"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="font-medium">{{ n.type }}</span>
              <span class="text-muted-foreground shrink-0">{{ formatWhen(n.dateTime) }}</span>
            </div>
            <p
              v-if="n.decryptedText"
              class="text-muted-foreground mt-0.5 line-clamp-2 leading-snug"
            >
              {{ n.decryptedText }}
            </p>
            <p v-else class="text-muted-foreground mt-0.5 text-[11px]">
              Encrypted payload
            </p>
          </li>
        </ul>
        <p v-else class="text-muted-foreground text-xs">
          No notifications.
        </p>

        <div v-if="hasMore" class="mt-2 flex justify-center">
          <Button
            :disabled="loading"
            size="sm"
            variant="ghost"
            class="h-6 text-xs"
            @click="loadMore()"
          >
            {{ loading ? "Loading…" : "Load older" }}
          </Button>
        </div>
      </div>

      <!-- Footer link -->
      <div class="border-t px-3 py-2">
        <RouterLink
          to="/notifications"
          class="text-primary flex items-center gap-1 text-xs hover:underline"
          @click="open = false"
        >
          View all notifications
          <ArrowRight class="h-3 w-3" />
        </RouterLink>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
