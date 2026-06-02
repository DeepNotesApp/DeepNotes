<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Star, StarOff } from '@lucide/vue'

const props = defineProps<{
  pageId: string
  relativeTitle?: string
  absoluteTitle?: string
  isFavorite?: boolean
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:relative-title': [value: string]
  'update:absolute-title': [value: string]
  'toggle-favorite': []
}>()

function handleCopyLink() {
  const url = `${window.location.origin}/pages/${props.pageId}`
  navigator.clipboard.writeText(url)
}

function handleCopyId() {
  navigator.clipboard.writeText(props.pageId)
}
</script>

<template>
  <div class="space-y-3 text-xs">
      <!-- Relative Title -->
      <div class="space-y-1">
        <Label class="text-[10px] uppercase tracking-wider text-muted-foreground">Relative Title</Label>
        <Input
          :model-value="relativeTitle"
          placeholder="Page title"
          class="h-8 text-xs"
          :disabled="readOnly"
          @update:model-value="emit('update:relative-title', String($event))"
        />
      </div>

      <div class="bg-border/40 h-px" />

      <!-- Absolute Title -->
      <div class="space-y-1">
        <Label class="text-[10px] uppercase tracking-wider text-muted-foreground">Absolute Title</Label>
        <Input
          :model-value="absoluteTitle"
          placeholder="Full page title"
          class="h-8 text-xs"
          :disabled="readOnly"
          @update:model-value="emit('update:absolute-title', String($event))"
        />
      </div>

      <div class="bg-border/40 h-px" />

      <!-- Page ID -->
      <div class="space-y-1">
        <Label class="text-[10px] uppercase tracking-wider text-muted-foreground">Page ID</Label>
        <div class="flex gap-2">
          <Input
            :model-value="pageId"
            class="h-8 text-xs"
            readonly
          />
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 shrink-0"
            @click="handleCopyId"
          >
            <Copy class="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div class="bg-border/40 h-px" />

      <!-- Copy Link -->
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        @click="handleCopyLink"
      >
        <Copy class="h-3 w-3 mr-2" />
        Copy link to this page
      </Button>

      <!-- Favorite -->
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        :disabled="readOnly"
        @click="emit('toggle-favorite')"
      >
        <StarOff v-if="isFavorite" class="h-3 w-3 mr-2" />
        <Star v-else class="h-3 w-3 mr-2" />
        {{ isFavorite ? 'Remove from favorites' : 'Add to favorites' }}
      </Button>
    </div>
</template>
