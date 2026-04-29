<script setup lang="ts">
import { watch } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useSession } from "../auth/useSession";
import { useNotifications } from "./useNotifications";

const router = useRouter();
const { isAuthenticated, bootstrapped } = useSession();
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

watch(
  [bootstrapped, isAuthenticated],
  () => {
    if (!bootstrapped.value) {
      return;
    }
    if (!isAuthenticated.value) {
      void router.replace({ name: "login", query: { redirect: "/notifications" } });
      return;
    }
    void loadFirst();
  },
  { immediate: true },
);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-lg font-semibold tracking-tight">Notifications</h1>
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="isAuthenticated && rows.length > 0"
          :disabled="markingRead || loading"
          size="sm"
          variant="secondary"
          @click="markRead()"
        >
          Mark all as read
        </Button>
        <Button
          v-if="isAuthenticated"
          :disabled="loading"
          size="sm"
          variant="outline"
          @click="loadFirst()"
        >
          Refresh
        </Button>
      </div>
    </div>

    <p class="text-muted-foreground text-sm">
      With password-backed keyrings in this browser, message bodies are decrypted here (legacy <code class="bg-muted rounded px-1 py-0.5 text-xs">UserNotificationContent</code> scope).
      Otherwise only type and timestamp are reliable.
    </p>

    <p
      v-if="!bootstrapped || (loading && rows.length === 0)"
      class="text-muted-foreground text-sm"
    >
      Loading…
    </p>
    <p v-else-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <ul
      v-else-if="rows.length > 0"
      class="space-y-3"
    >
      <li v-for="n in rows" :key="n.id">
        <Card :class="n.unread ? 'border-primary/40 bg-muted/30' : ''">
          <CardHeader class="pb-2">
            <div class="flex items-start justify-between gap-2">
              <CardTitle class="text-base">
                {{ n.type }}
                <span
                  v-if="n.unread"
                  class="bg-primary text-primary-foreground ml-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium"
                >New</span>
              </CardTitle>
              <CardDescription class="shrink-0 text-xs">
                {{ formatWhen(n.dateTime) }}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent class="space-y-2">
            <pre
              v-if="n.decryptedText != null && n.decryptedText !== ''"
              class="bg-muted max-h-[18rem] overflow-auto rounded-md p-2 text-[11px] leading-snug whitespace-pre-wrap font-mono"
            >{{ n.decryptedText }}</pre>
            <p
              v-else
              class="text-muted-foreground text-xs"
            >
              Encrypted payload could not be decrypted (sign in with email + password on this device, or ciphertext may be stale).
            </p>
          </CardContent>
        </Card>
      </li>
    </ul>
    <p
      v-else
      class="text-muted-foreground text-sm"
    >
      No notifications.
    </p>

    <div v-if="hasMore" class="flex justify-center">
      <Button
        :disabled="loading"
        size="sm"
        variant="outline"
        @click="loadMore()"
      >
        {{ loading ? "Loading…" : "Load older" }}
      </Button>
    </div>
  </div>
</template>
