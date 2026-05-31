<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { usePageBacklinks } from "./usePageBacklinks";

const props = defineProps<{
  pageId: string;
}>();

const { backlinks, loading, error, deleteBacklink } = usePageBacklinks(
  computed(() => props.pageId),
);

async function removeBacklink(sourcePageId: string) {
  await deleteBacklink(sourcePageId);
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-sm">Backlinks</CardTitle>
    </CardHeader>
    <CardContent>
      <p v-if="loading" class="text-muted-foreground text-xs">Loading...</p>
      <p v-else-if="error" class="text-destructive text-xs">{{ error }}</p>
      <p v-else-if="backlinks.length === 0" class="text-muted-foreground text-xs">
        No backlinks
      </p>
      <ul v-else class="space-y-1">
        <li
          v-for="sourcePageId in backlinks"
          :key="sourcePageId"
          class="flex items-center justify-between gap-2"
        >
          <RouterLink
            :to="`/pages/${sourcePageId}`"
            class="text-primary text-xs hover:underline truncate"
          >
            {{ sourcePageId }}
          </RouterLink>
          <Button
            variant="ghost"
            size="sm"
            class="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
            @click="removeBacklink(sourcePageId)"
          >
            <span class="sr-only">Delete backlink</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </Button>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
