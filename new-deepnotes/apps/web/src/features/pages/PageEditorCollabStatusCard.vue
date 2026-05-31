<script setup lang="ts">
import { ref, computed } from "vue";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const props = defineProps<{
  collabLoading: boolean;
  loadError: string | null;
  cryptoError: string | null;
  collabWsLive: boolean;
  collabWsError: string | null;
  updateCount: number;
  collabLastIndex: number | null;
  pushError: string | null;
}>();

const emit = defineEmits<{
  (e: "unlock-with-password", password: string): void;
}>();

const passwordInput = ref("");
const isUnlocking = ref(false);

const isPasswordProtectedError = computed(() =>
  props.cryptoError != null &&
  props.cryptoError.toLowerCase().includes("password-protected"),
);

function onSubmit() {
  if (!passwordInput.value) return;
  isUnlocking.value = true;
  emit("unlock-with-password", passwordInput.value);
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Server collab</CardTitle>
      <CardDescription>
        <code
          class="bg-muted rounded px-1 py-0.5 font-mono text-xs"
        >GET /api/pages/…/collab-updates</code>
        bootstraps ciphertext; live edits use
        <code
          class="bg-muted rounded px-1 py-0.5 font-mono text-xs"
        >WebSocket …/collab-ws</code>
        (Durable Object relay + Postgres append) when configured, otherwise
        <code class="font-mono text-xs">POST …/collab-updates</code>.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-2 text-sm">
      <p v-if="collabLoading" class="text-muted-foreground">Loading…</p>
      <template v-else>
        <p v-if="loadError" class="text-destructive">
          {{ loadError }}
        </p>
        <template v-else-if="isPasswordProtectedError">
          <p class="text-amber-700 dark:text-amber-400">
            This group is password protected.
          </p>
          <form class="flex items-center gap-2" @submit.prevent="onSubmit">
            <Input
              v-model="passwordInput"
              type="password"
              placeholder="Group password"
              class="h-8 text-sm"
              :disabled="isUnlocking"
            />
            <Button size="sm" type="submit" :disabled="isUnlocking || !passwordInput">
              Unlock
            </Button>
          </form>
          <p v-if="cryptoError && !isPasswordProtectedError" class="text-amber-700 dark:text-amber-400">
            {{ cryptoError }}
          </p>
        </template>
        <p v-else-if="cryptoError" class="text-amber-700 dark:text-amber-400">
          {{ cryptoError }}
        </p>
        <template v-else>
          <p>
            <span class="text-muted-foreground">Live collab</span>:
            <span :class="collabWsLive ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'">
              {{ collabWsLive ? "WebSocket connected" : "offline (REST only)" }}
            </span>
          </p>
          <p v-if="collabWsError" class="text-destructive">
            {{ collabWsError }}
          </p>
          <p>
            <span class="text-muted-foreground">Updates on server</span>:
            {{ updateCount }} ·
            <span class="text-muted-foreground">lastIndex</span>:
            {{ collabLastIndex === null ? "—" : collabLastIndex }}
          </p>
          <p v-if="pushError" class="text-destructive">
            Save error: {{ pushError }}
          </p>
        </template>
      </template>
    </CardContent>
  </Card>
</template>
