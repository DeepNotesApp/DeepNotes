<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Plus,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "@lucide/vue";

const emit = defineEmits<{
  "insert-note": [];
  "insert-arrow": [];
  "zoom-in": [];
  "zoom-out": [];
  "fit-to-screen": [];
}>();
</script>

<template>
  <div class="flex flex-none items-center gap-1">
    <Button
      variant="ghost"
      size="sm"
      class="gap-1"
      data-testid="toolbar-insert-note"
      @click="emit('insert-note')"
    >
      <Plus class="h-4 w-4" />
      <span class="hidden sm:inline">Note</span>
    </Button>

    <Button
      variant="ghost"
      size="sm"
      class="gap-1"
      data-testid="toolbar-insert-arrow"
      @click="emit('insert-arrow')"
    >
      <ArrowRight class="h-4 w-4" />
      <span class="hidden sm:inline">Arrow</span>
    </Button>

    <div class="bg-border mx-1 h-4 w-px" />

    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8"
      title="Zoom in"
      data-testid="toolbar-zoom-in"
      @click="emit('zoom-in')"
    >
      <ZoomIn class="h-4 w-4" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8"
      title="Zoom out"
      data-testid="toolbar-zoom-out"
      @click="emit('zoom-out')"
    >
      <ZoomOut class="h-4 w-4" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8"
      title="Fit to screen"
      data-testid="toolbar-fit-to-screen"
      @click="emit('fit-to-screen')"
    >
      <Maximize class="h-4 w-4" />
    </Button>
  </div>
</template>
