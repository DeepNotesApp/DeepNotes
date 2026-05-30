<script setup lang="ts">
import { computed, ref } from "vue";
import type { NoteModel } from "./note-model";

const props = defineProps<{
  model: NoteModel;
  zoom: number;
}>();

const transform = computed(() => {
  const { x, y } = props.model.pos.value;
  return {
    transform: `translate(${x}px, ${y}px)`,
  };
});

const frameClasses = computed(() => {
  const ro = props.model.readOnly.value;
  const movable = props.model.movable.value;
  return [
    "border-border bg-card text-card-foreground pointer-events-auto absolute top-0 left-0 rounded-md border shadow-sm select-none",
    ro ? "opacity-70" : "",
    movable ? "cursor-grab active:cursor-grabbing" : "",
  ];
});

let dragPointerId: number | null = null;
let startX = 0;
let startY = 0;
let noteStartX = 0;
let noteStartY = 0;

function onPointerDown(e: PointerEvent) {
  if (!props.model.movable.value || e.button !== 0) return;
  e.stopPropagation();
  dragPointerId = e.pointerId;
  startX = e.clientX;
  startY = e.clientY;
  noteStartX = props.model.pos.value.x;
  noteStartY = props.model.pos.value.y;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  el.style.cursor = "grabbing";
}

function onPointerMove(e: PointerEvent) {
  if (dragPointerId !== e.pointerId) return;
  const dxScreen = e.clientX - startX;
  const dyScreen = e.clientY - startY;
  const z = props.zoom || 1;
  const noteMap = props.model.rawMap;
  const posMap = noteMap.get("pos") as import("yjs").Map<number>;
  posMap.set("x", noteStartX + dxScreen / z);
  posMap.set("y", noteStartY + dyScreen / z);
}

function onPointerUp(e: PointerEvent) {
  if (dragPointerId !== e.pointerId) return;
  dragPointerId = null;
  const el = e.currentTarget as HTMLElement;
  if (el.releasePointerCapture) {
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  el.style.cursor = props.model.movable.value ? "grab" : "";
}
</script>

<template>
  <div
    data-testid="display-note"
    :class="frameClasses"
    :style="transform"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div class="border-border border-b px-2 py-1 text-xs font-medium">
      {{ model.head.enabled.value ? "Head" : "" }}
      <span
        v-if="model.body.enabled.value"
        class="text-muted-foreground"
      >
        / Body
      </span>
    </div>
    <div class="px-2 py-1">
      <p class="text-muted-foreground text-xs">
        pos: {{ model.pos.value.x.toFixed(0) }},{{ model.pos.value.y.toFixed(0) }} · z:
        {{ model.zIndex.value }}
      </p>
    </div>
  </div>
</template>
