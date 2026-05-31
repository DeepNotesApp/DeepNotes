<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-vue-next";
import type { NoteModel } from "./note-model";
import NoteTiptapEditor from "./NoteTiptapEditor.vue";

const props = defineProps<{
  id: string;
  model: NoteModel;
  zoom: number;
  selected?: boolean;
  isDropTarget?: boolean;
  childModels?: Array<{ id: string; model: NoteModel }>;
  parentColor?: string | null;
}>();

const emit = defineEmits<{
  select: [];
  toggle: [];
  shiftClick: [];
  dragstart: [id: string];
  dragend: [id: string];
  arrowDragStart: [payload: { noteId: string }];
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

const headFrag = computed(() => props.model.head.value.value);
const bodyFrag = computed(() => props.model.body.value.value);

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

const containerLayoutClass = computed(() => {
  if (!props.model.container.enabled.value) return '';
  return props.model.container.horizontal.value ? 'flex-row' : 'flex-col';
});

const isDragging = ref(false);

const frameClasses = computed(() => {
  const ro = props.model.readOnly.value;
  const movable = props.model.movable.value && !ro;
  return [
    "border-border bg-card text-card-foreground pointer-events-auto absolute top-0 left-0 rounded-md border shadow-sm select-none transition-opacity",
    ro ? "opacity-60 cursor-not-allowed" : "",
    isDragging.value ? "opacity-70" : "",
    movable ? "cursor-grab active:cursor-grabbing" : "cursor-default",
    props.selected ? "ring-2 ring-primary" : "",
    props.isDropTarget ? "ring-2 ring-accent ring-offset-2" : "",
    ro ? "ring-1 ring-destructive/30" : "",
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

  if (!props.model.movable.value || props.model.readOnly.value) return;

  dragPointerId = e.pointerId;
  startX = e.clientX;
  startY = e.clientY;
  noteStartX = props.model.pos.value.x;
  noteStartY = props.model.pos.value.y;
  hasDragged = false;
  isDragging.value = true;
  emit("dragstart", props.id);
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
  isDragging.value = false;
  if (hasDragged) {
    hasDragged = false;
    emit("dragend", props.id);
  }
}

// --- 8-handle resize ---
type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

let resizePointerId: number | null = null;
let resizeHandle: ResizeHandle | null = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartPosX = 0;

function onResizePointerDown(e: PointerEvent, handle: ResizeHandle) {
  if (e.button !== 0) return;
  if (props.model.readOnly.value) return;
  e.stopPropagation();
  resizePointerId = e.pointerId;
  resizeHandle = handle;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  const w = props.model.width.value.expanded;
  resizeStartWidth = w === "Auto" ? 160 : parseFloat(w);
  resizeStartPosX = props.model.pos.value.x;
  isDragging.value = true;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
}

function onResizePointerMove(e: PointerEvent) {
  if (resizePointerId !== e.pointerId || !resizeHandle) return;
  const z = props.zoom || 1;
  const dx = (e.clientX - resizeStartX) / z;

  const isWest = resizeHandle.includes("w");
  const nextWidth = Math.max(
    80,
    Math.round(isWest ? resizeStartWidth - dx : resizeStartWidth + dx),
  );

  const widthMap = props.model.rawMap.get("width") as import("yjs").Map<string>;
  widthMap.set("expanded", String(nextWidth));

  if (isWest) {
    const posMap = props.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("x", Math.round(resizeStartPosX + dx));
  }
}

function onResizePointerUp(e: PointerEvent) {
  if (resizePointerId !== e.pointerId) return;
  resizePointerId = null;
  resizeHandle = null;
  isDragging.value = false;
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
    :data-note-id="id"
    :class="frameClasses"
    :style="transform"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div class="border-border flex items-center gap-1 border-b px-2 py-1 text-xs font-medium">
      <button
        v-if="model.collapsing.enabled.value && !model.readOnly.value"
        class="text-muted-foreground hover:text-foreground focus:outline-none"
        @pointerdown.stop="toggleCollapsed"
      >
        <ChevronDown v-if="!model.collapsing.collapsed.value" class="h-3 w-3" />
        <ChevronRight v-else class="h-3 w-3" />
      </button>
      <span v-if="!model.head.enabled.value" class="text-muted-foreground flex-1 truncate">
        Note
      </span>
      <span v-else class="flex-1" />

      <!-- Link icon -->
      <a
        v-if="model.link.value"
        :href="model.link.value"
        target="_blank"
        rel="noopener noreferrer"
        class="text-muted-foreground hover:text-primary pointer-events-auto ml-auto"
        title="Open link"
        @pointerdown.stop
      >
        <ExternalLink class="h-3 w-3" />
      </a>
    </div>

    <!-- head editor -->
    <div
      v-if="model.head.enabled.value && !model.collapsing.collapsed.value"
      class="px-2 pt-1"
      @pointerdown.stop
    >
      <NoteTiptapEditor
        :fragment="headFrag!"
        :editable="!model.readOnly.value"
        placeholder="Head…"
      />
    </div>

    <!-- body editor -->
    <div
      v-if="model.body.enabled.value && !model.collapsing.collapsed.value"
      class="px-2 pb-1"
      @pointerdown.stop
    >
      <NoteTiptapEditor
        :fragment="bodyFrag!"
        :editable="!model.readOnly.value"
        placeholder="Body…"
      />
    </div>

    <!-- 8 resize handles -->
    <template v-if="model.resizable.value && !model.readOnly.value">
      <div
        v-for="h in ([
          { key: 'nw', cls: '-top-1.5 -left-1.5 cursor-nwse-resize' },
          { key: 'n', cls: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
          { key: 'ne', cls: '-top-1.5 -right-1.5 cursor-nesw-resize' },
          { key: 'e', cls: '-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize' },
          { key: 'se', cls: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
          { key: 's', cls: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
          { key: 'sw', cls: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
          { key: 'w', cls: '-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize' },
        ] as const)"
        :key="h.key"
        class="bg-primary absolute h-3 w-3 rounded-full"
        :class="h.cls"
        @pointerdown="(e: PointerEvent) => onResizePointerDown(e, h.key)"
        @pointermove="onResizePointerMove"
        @pointerup="onResizePointerUp"
        @pointercancel="onResizePointerUp"
      />
    </template>

    <!-- arrow handles -->
    <template v-if="selected && !model.readOnly.value">
      <div
        v-for="h in ([
          { cls: '-top-3 left-1/2 -translate-x-1/2' },
          { cls: '-right-3 top-1/2 -translate-y-1/2' },
          { cls: '-bottom-3 left-1/2 -translate-x-1/2' },
          { cls: '-left-3 top-1/2 -translate-y-1/2' },
        ] as const)"
        :key="h.cls"
        class="bg-primary/80 hover:bg-primary absolute h-2.5 w-2.5 cursor-crosshair rounded-full"
        :class="h.cls"
        @pointerdown.stop="(e: PointerEvent) => {
          emit('arrowDragStart', { noteId: props.id });
        }"
      />
    </template>

    <!-- container children -->
    <template v-if="model.container.enabled.value && childModels?.length && !model.collapsing.collapsed.value">
      <div
        class="border-border pointer-events-none absolute inset-x-0 bottom-0 border-t"
        :class="model.container.horizontal.value ? 'left-0 right-0 top-0 bottom-0 border-t-0 border-l' : ''"
        :style="model.container.horizontal.value ? 'left: 100%; top: 0; width: auto; height: 100%;' : 'top: 3rem'"
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
