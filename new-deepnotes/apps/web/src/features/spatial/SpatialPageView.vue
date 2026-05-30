<script setup lang="ts">
import { computed, ref } from "vue";

import SpatialWorldCanvas from "./SpatialWorldCanvas.vue";
import DisplayNote from "./DisplayNote.vue";
import DisplayArrow from "./DisplayArrow.vue";
import { useSpatialPage } from "./useSpatialPage";
import { screenToWorld } from "./spatial-viewport-math";

const props = defineProps<{
  ydoc: any;
}>();

const canvasRef = ref<{ camX: number; camY: number; zoom: number } | null>(null);

const { noteList, arrowList, createNoteAt } = useSpatialPage(props.ydoc);

const noteById = computed(() => {
  const map = new Map<string, (typeof noteList.value)[0]["model"]>();
  for (const n of noteList.value) {
    map.set(n.id, n.model);
  }
  return map;
});

function onCanvasDoubleClick(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const world = screenToWorld(
    e.clientX,
    e.clientY,
    cx,
    cy,
    canvas.camX,
    canvas.camY,
    canvas.zoom,
  );

  createNoteAt(world.x, world.y);
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-muted-foreground text-xs">
      Double-click on the canvas to create a note. Scroll to pan, Ctrl+scroll to
      zoom.
    </div>
    <SpatialWorldCanvas ref="canvasRef" @dblclick="onCanvasDoubleClick">
      <DisplayArrow
        v-for="arrow in arrowList"
        :key="arrow.id"
        :model="arrow.model"
        :source-model="noteById.get(arrow.model.source.value)"
        :target-model="noteById.get(arrow.model.target.value)"
      />
      <DisplayNote
        v-for="note in noteList"
        :key="note.id"
        :model="note.model"
        :zoom="canvasRef?.zoom ?? 1"
      />
    </SpatialWorldCanvas>
  </div>
</template>
