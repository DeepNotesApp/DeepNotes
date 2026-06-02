<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { ZoomOut, Maximize, Undo, Redo } from "@lucide/vue";

const props = defineProps<{
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
}>();

const emit = defineEmits<{
  "reset-zoom": [];
  "fit-to-screen": [];
  undo: [];
  redo: [];
}>();
</script>

<template>
  <div
    class="pointer-events-auto flex flex-col items-end gap-1.5"
  >
    <Button
      variant="ghost"
      size="icon"
      class="bg-card border-border h-8 w-8 rounded-md border shadow-sm"
      title="Reset zoom"
      @click="emit('reset-zoom')"
    >
      <ZoomOut class="h-3.5 w-3.5" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="bg-card border-border h-8 w-8 rounded-md border shadow-sm"
      title="Fit to screen"
      @click="emit('fit-to-screen')"
    >
      <Maximize class="h-3.5 w-3.5" />
    </Button>

    <div
      class="bg-card border-border flex h-8 w-8 items-center justify-center rounded-md border text-[10px] font-medium shadow-sm"
    >
      {{ Math.round(props.zoom * 100) }}%
    </div>

    <Button
      variant="ghost"
      size="icon"
      class="bg-card border-border h-8 w-8 rounded-md border shadow-sm"
      title="Undo"
      :disabled="!canUndo"
      @click="emit('undo')"
    >
      <Undo class="h-3.5 w-3.5" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="bg-card border-border h-8 w-8 rounded-md border shadow-sm"
      title="Redo"
      :disabled="!canRedo"
      @click="emit('redo')"
    >
      <Redo class="h-3.5 w-3.5" />
    </Button>
  </div>
</template>
