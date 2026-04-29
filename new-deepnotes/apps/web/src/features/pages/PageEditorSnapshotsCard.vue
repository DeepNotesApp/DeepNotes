<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { SnapshotRow } from "./page-snapshot-list";

defineProps<{
  snapshotLoading: boolean;
  snapshots: SnapshotRow[];
  collabLoading: boolean;
  loadError: string | null;
  cryptoError: string | null;
}>();

defineEmits<{
  restore: [snapshotId: string];
  remove: [snapshotId: string];
  saveManual: [];
}>();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">Snapshots (Pro)</CardTitle>
      <CardDescription>
        Encrypted Yjs checkpoints (
        <code class="font-mono text-xs">PageSnapshotData</code>
        ). Requires edit access + subscription server-side.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3 text-sm">
      <p v-if="snapshotLoading" class="text-muted-foreground">Loading snapshots…</p>
      <p v-else-if="snapshots.length === 0" class="text-muted-foreground">No snapshots yet.</p>
      <ul v-else class="space-y-2">
        <li
          v-for="s in snapshots"
          :key="s.snapshotId"
          class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="text-xs">
            <div class="font-mono font-medium">{{ s.snapshotId }}</div>
            <div class="text-muted-foreground">
              {{ s.type }} · {{ s.creationDate }}
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              :disabled="collabLoading || loadError != null || cryptoError != null"
              @click="$emit('restore', s.snapshotId)"
            >
              Restore
            </Button>
            <Button
              size="sm"
              variant="outline"
              @click="$emit('remove', s.snapshotId)"
            >
              Delete
            </Button>
          </div>
        </li>
      </ul>
      <Button
        size="sm"
        :disabled="collabLoading || loadError != null || cryptoError != null"
        @click="$emit('saveManual')"
      >
        Save snapshot
      </Button>
    </CardContent>
  </Card>
</template>
