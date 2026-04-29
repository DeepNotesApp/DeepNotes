<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

defineProps<{
  collabLoading: boolean;
  loadError: string | null;
  cryptoError: string | null;
  collabWsLive: boolean;
  collabWsError: string | null;
  updateCount: number;
  collabLastIndex: number | null;
  pushError: string | null;
}>();
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
