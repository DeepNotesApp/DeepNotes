<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown, ChevronRight } from "lucide-vue-next";
import type { NoteModel } from "./note-model";

const props = defineProps<{
  id: string;
  model: NoteModel;
  zoom: number;
  selected?: boolean;
  childModels?: Array<{ id: string; model: NoteModel }>;
  parentColor?: string | null;
}>();

const emit = defineEmits<{
  select: [];
  toggle: [];
  shiftClick: [];
  dragend: [id: string];
}>();

const resolvedColor = computed(() => {
  const c = props.model.color.value;
  if (c.inherit) return props.parentColor ?? null;
  // Simple legacy color mapping to CSS color values
  const colorMap: Record<string, string> = {
    grey: "#9ca3af",
    red: "#ef4444",
    green: "#22c55e",
    blue: "#3b82f6",
    yellow: "#eab308",
    purple: "#a855f7",
    orange: "#f97316",
    pink: "#ec4899",
    cyan: "#06b6d4",
    black: "#171717",
    white: "#f5f5f5",
  };
  return colorMap[c.value] ?? c.value;
});

const transform = computed(() => {
  const { x, y } = props.model.pos.value;
  const style: Record<string, string | number> = {
    transform: `translate(${x}px, ${y}px)`,
    width: props.model.width.value.expanded === "Auto" ? "auto" : `${props.model.width.value.expanded}px`,
    zIndex: props.model.zIndex.value,
  };
  const color = resolvedColor.value;
  if (color) {
    style.borderColor = color;
    style.backgroundColor = `${color}18`; // 10% opacity tint
  }
  return style;
});

const frameClasses = computed(() => {
  const ro = props.model.readOnly.value;
  const movable = props.model.movable.value;
  return [
    "border-border bg-card text-card-foreground pointer-events-auto absolute top-0 left-0 rounded-md border shadow-sm select-none",
    ro ? "opacity-70" : "",
    movable ? "cursor-grab active:cursor-grabbing" : "",
    props.selected ? "ring-2 ring-primary" : "",
  ];
});

let dragPointerId: number | null = null;
let startX = 0;
let startY = 0;
let noteStartX = 0;
let noteStartY = 0;
let hasDragged = false;

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  e.stopPropagation();

  if (e.shiftKey) {
    emit("shiftClick");
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    emit("toggle");
  } else {
    emit("select");
  }

  if (!props.model.movable.value) return;

  dragPointerId = e.pointerId;
  startX = e.clientX;
  startY = e.clientY;
  noteStartX = props.model.pos.value.x;
  noteStartY = props.model.pos.value.y;
  hasDragged = false;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  el.style.cursor = "grabbing";
}

function onPointerMove(e: PointerEvent) {
  if (dragPointerId !== e.pointerId) return;
  const dxScreen = e.clientX - startX;
  const dyScreen = e.clientY - startY;
  if (dxScreen !== 0 || dyScreen !== 0) {
    hasDragged = true;
  }
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
  if (hasDragged) {
    hasDragged = false;
    emit("dragend", props.id);
  }
}

// --- resize handle ---
let resizePointerId: number | null = null;
let resizeStartX = 0;
let resizeStartWidth = 0;

function onResizePointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  e.stopPropagation();
  resizePointerId = e.pointerId;
  resizeStartX = e.clientX;
  const w = props.model.width.value.expanded;
  resizeStartWidth = w === "Auto" ? 160 : parseFloat(w);
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
}

function onResizePointerMove(e: PointerEvent) {
  if (resizePointerId !== e.pointerId) return;
  const z = props.zoom || 1;
  const dx = (e.clientX - resizeStartX) / z;
  const next = Math.max(80, Math.round(resizeStartWidth + dx));
  const widthMap = props.model.rawMap.get("width") as import("yjs").Map<string>;
  widthMap.set("expanded", String(next));
}

function onResizePointerUp(e: PointerEvent) {
  if (resizePointerId !== e.pointerId) return;
  resizePointerId = null;
  const el = e.currentTarget as HTMLElement;
  if (el.releasePointerCapture) {
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
}

function toggleCollapsed() {
  const collapsingMap = props.model.rawMap.get("collapsing") as import("yjs").Map<boolean>;
  collapsingMap.set("collapsed", !props.model.collapsing.collapsed.value);
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
    <div class="border-border flex items-center gap-1 border-b px-2 py-1 text-xs font-medium">
      <button
        v-if="model.collapsing.enabled.value"
        class="text-muted-foreground hover:text-foreground focus:outline-none"
        @pointerdown.stop="toggleCollapsed"
      >
        <ChevronDown v-if="!model.collapsing.collapsed.value" class="h-3 w-3" />
        <ChevronRight v-else class="h-3 w-3" />
      </button>
      <span class="flex-1 truncate">
        {{ model.head.enabled.value ? "Head" : "" }}
        <span
          v-if="model.body.enabled.value"
          class="text-muted-foreground"
        >
          / Body
        </span>
      </span>
    </div>
    <div v-if="!model.collapsing.collapsed.value" class="px-2 py-1">
      <p class="text-muted-foreground text-xs">
        pos: {{ model.pos.value.x.toFixed(0) }},{{ model.pos.value.y.toFixed(0) }} · z:
        {{ model.zIndex.value }}
      </p>
    </div>

    <!-- resize handle -->
    <div
      v-if="model.resizable.value"
      class="bg-primary absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full"
      @pointerdown="onResizePointerDown"
      @pointermove="onResizePointerMove"
      @pointerup="onResizePointerUp"
      @pointercancel="onResizePointerUp"
    />

    <!-- container children -->
    <template v-if="model.container.enabled.value && childModels?.length && !model.collapsing.collapsed.value">
      <div
        class="border-border pointer-events-none absolute inset-x-0 bottom-0 border-t"
        style="top: 3rem"
      >
        <DisplayNote
          v-for="child in childModels"
          :key="child.id"
          :id="child.id"
          :model="child.model"
          :zoom="zoom"
          :parent-color="resolvedColor"
          @dragend="$emit('dragend', $event)"
        />
      </div>
    </template>
  </div>
</template>
