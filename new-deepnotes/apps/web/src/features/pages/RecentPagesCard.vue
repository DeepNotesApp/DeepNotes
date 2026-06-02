<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { History, X } from '@lucide/vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  recentPageIds: string[]
  currentPageId: string
  pageLabels: Record<string, string>
}>()

const emit = defineEmits<{
  clear: []
}>()

function pageLabel(pid: string): string {
  const label = props.pageLabels[pid]
  if (label != null && label.length > 0) return label
  return `[Page ${pid}]`
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <div class="text-sm flex items-center gap-2 font-medium">
        <History class="h-4 w-4" />
        Recent Pages
      </div>
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6"
        :disabled="recentPageIds.length === 0"
        @click="emit('clear')"
      >
        <X class="h-3 w-3" />
      </Button>
    </div>
    <p v-if="recentPageIds.length === 0" class="text-muted-foreground text-xs">
      No recent pages.
    </p>
    <nav v-else class="space-y-1 text-xs">
      <RouterLink
        v-for="pageId in recentPageIds"
        :key="pageId"
        :to="`/pages/${pageId}`"
        class="block rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
        :class="{ 'bg-accent': pageId === currentPageId }"
      >
        {{ pageLabel(pageId) }}
      </RouterLink>
    </nav>
  </div>
</template>
