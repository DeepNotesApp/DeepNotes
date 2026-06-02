<script setup lang="ts">
import { RouterLink } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const props = defineProps<{
  pathLoading: boolean;
  pathError: string | null;
  pathPageIds: string[];
  /** Decrypted absolute titles from realtime `page:` hash when WS + ACL available (same group as editor). */
  pathPageLabels: Record<string, string>;
  pagePrefsLoading: boolean;
  isFavorite: boolean;
  bumpMessage: string | null;
  favoriteMessage: string | null;
}>();

function pagePathLabel(pid: string): string {
  const label = props.pathPageLabels[pid];
  if (label != null && label.length > 0) {
    return label;
  }
  // Legacy `pageAbsoluteTitles` unknown placeholder: `[Page ${pageId}]`
  return `[Page ${pid}]`;
}

defineEmits<{
  bumpAsStarting: [];
  toggleFavorite: [];
  removeFromRecent: [];
}>();
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-sm">Path</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3 text-sm">
      <p v-if="pathLoading" class="text-muted-foreground">Loading path…</p>
      <p v-else-if="pathError" class="text-destructive">{{ pathError }}</p>
      <nav v-else class="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
        <template v-for="(pid, i) in pathPageIds" :key="pid">
          <span v-if="i > 0" aria-hidden="true">/</span>
          <RouterLink
            v-if="i < pathPageIds.length - 1"
            class="text-primary underline"
            :to="`/pages/${pid}`"
          >{{ pagePathLabel(pid) }}</RouterLink>
          <span v-else class="text-foreground font-medium">{{ pagePathLabel(pid) }}</span>
        </template>
      </nav>
      <div class="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          :disabled="pagePrefsLoading"
          @click="$emit('bumpAsStarting')"
        >
          Make starting page
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="pagePrefsLoading"
          @click="$emit('toggleFavorite')"
        >
          {{ isFavorite ? "Remove favorite" : "Add favorite" }}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          :disabled="pagePrefsLoading"
          @click="$emit('removeFromRecent')"
        >
          Remove from recent
        </Button>
      </div>
      <p v-if="bumpMessage" class="text-muted-foreground text-xs">{{ bumpMessage }}</p>
      <p v-if="favoriteMessage" class="text-amber-800 dark:text-amber-200 text-xs">{{ favoriteMessage }}</p>
    </CardContent>
  </Card>
</template>
