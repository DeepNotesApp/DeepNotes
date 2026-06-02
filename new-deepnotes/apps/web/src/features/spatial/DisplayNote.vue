<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from "vue";
import { ChevronDown, ChevronRight, ExternalLink } from "@lucide/vue";
import type { NoteModel } from "./note-model";
import NoteTiptapEditor from "./NoteTiptapEditor.vue";
import { useNoteHeights } from "./useNoteHeights";
import { CONTAINER_CONTENT_OFFSET_Y } from "./spatial-constants";
import {
  resolveNoteColor,
  noteTextColor,
  noteBorderColor,
  noteDividerColor,
} from "./color-utils";
import { isDark } from "@/features/theme/useThemePreference";

const props = defineProps<{
  id: string;
  model: NoteModel;
  zoom: number;
  selected?: boolean;
  isDropTarget?: boolean;
  childModels?: Array<{ id: string; model: NoteModel }>;
  parentColor?: string | null;
  posOverride?: { x: number; y: number };
  isFlexChild?: boolean;
  editingId?: string | null;
}>();

const isEditing = computed(() => props.editingId === props.id);

const emit = defineEmits<{
  select: [];
  toggle: [];
  shiftClick: [];
  dragstart: [id: string];
  dragend: [id: string];
  arrowDragStart: [payload: { noteId: string }];
  "edit-start": [];
  "context-menu": [e: MouseEvent];
}>();

const rootRef = ref<HTMLElement | null>(null);
const containerChildrenRef = ref<HTMLElement | null>(null);
const { heights: noteHeights, originOffsets: noteOriginOffsets } = useNoteHeights();

function publishHeight() {
  const el = rootRef.value;
  if (el) {
    noteHeights.value.set(props.id, el.offsetHeight);
  }
}

function publishOriginOffset() {
  const root = rootRef.value;
  const children = containerChildrenRef.value;
  if (root && children && props.model.container.enabled.value) {
    const offset = children.offsetTop - root.offsetTop;
    noteOriginOffsets.value.set(props.id, offset);
  }
}

onMounted(() => {
  publishHeight();
  publishOriginOffset();
});
onUpdated(() => {
  publishHeight();
  publishOriginOffset();
});

const noteColor = computed(() => {
  const c = props.model.color.value;
  const baseColor = c.inherit ? props.parentColor : null;
  if (baseColor) {
    return resolveNoteColor(baseColor, isDark.value);
  }
  return resolveNoteColor(c.value ?? "grey", isDark.value);
});

const textColor = computed(() => noteTextColor(isDark.value));
const borderColor = computed(() => noteBorderColor(isDark.value, props.selected));
const dividerColor = computed(() => noteDividerColor(isDark.value));

function sizeToCSS(size: string): string {
  if (/^-?\d+(\.\d+)?$/.test(size.trim())) {
    return `${size}px`;
  }
  return size;
}

const headHeightCSS = computed(() => {
  const h = props.model.head.height.value;
  const collapsed = props.model.collapsing.collapsed.value;
  if (!props.model.head.enabled.value) return undefined;
  if (collapsed) {
    const c = h.collapsed;
    if (c === "Auto" || c === "Minimum") {
      if (numEnabledSections.value === 1) return "0px";
      return sizeToCSS(h.expanded);
    }
    return sizeToCSS(c);
  }
  return sizeToCSS(h.expanded);
});

const bodyHeightCSS = computed(() => {
  const h = props.model.body.height.value;
  const collapsed = props.model.collapsing.collapsed.value;
  if (!props.model.body.enabled.value) return undefined;
  if (collapsed) {
    const c = h.collapsed;
    if (c === "Auto" || c === "Minimum") {
      if (numEnabledSections.value === 1) return "0px";
      return sizeToCSS(h.expanded);
    }
    return sizeToCSS(c);
  }
  return sizeToCSS(h.expanded);
});

const headFrag = computed(() => props.model.head.value.value);
const bodyFrag = computed(() => props.model.body.value.value);

const transform = computed(() => {
  const style: Record<string, string | number> = {};
  if (!props.isFlexChild) {
    const pos = props.posOverride ?? props.model.pos.value;
    style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    style.zIndex = props.model.zIndex.value;
  }
  const widthVal = (props.model.width as any)?.value ?? props.model.width;
  const w = widthVal?.expanded;
  style.width = w === "Auto" || w === "Minimum" ? "auto" : `${w}px`;
  const heightVal = (props.model.height as any)?.value ?? props.model.height;
  const h = heightVal?.expanded;
  if (h !== "Auto" && h !== "Minimum") {
    style.height = `${h}px`;
  }
  return style;
});

const contentStyle = computed(() => ({
  backgroundColor: noteColor.value,
  borderColor: borderColor.value,
  color: textColor.value,
}));

const containerSpatial = computed(() => props.model.container.spatial.value);
const containerHorizontal = computed(() => props.model.container.horizontal.value);
const containerWrapChildren = computed(() => props.model.container.wrapChildren.value);
const containerStretchChildren = computed(() => props.model.container.stretchChildren.value);

const isDragging = ref(false);

const topSection = computed<"head" | "body" | "container">(() => {
  if (props.model.head.enabled.value) return "head";
  if (props.model.body.enabled.value) return "body";
  return "container";
});

const bottomSection = computed<"head" | "body" | "container">(() => {
  if (props.model.collapsing.collapsed.value) return topSection.value;
  if (props.model.container.enabled.value) return "container";
  if (props.model.body.enabled.value) return "body";
  return "head";
});

const numEnabledSections = computed(() => {
  let n = 0;
  if (props.model.head.enabled.value) n++;
  if (props.model.body.enabled.value) n++;
  if (props.model.container.enabled.value) n++;
  return n;
});

const frameClasses = computed(() => {
  const ro = props.model.readOnly.value;
  const movable = props.model.movable.value && !ro;
  return [
    "pointer-events-auto select-none transition-opacity",
    props.isFlexChild ? "relative flex-none" : "absolute top-0 left-0",
    ro ? "cursor-not-allowed" : "",
    isDragging.value ? "opacity-70" : "",
    movable ? "cursor-grab active:cursor-grabbing" : "cursor-default",
    props.isDropTarget ? "ring-2 ring-accent ring-offset-2" : "",
    ro && !props.selected ? "ring-1 ring-destructive/30" : "",
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
  if (isEditing.value) return;
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
let resizeStartHeight = 0;
let resizeStartPosX = 0;
let resizeStartPosY = 0;
let resizingSection: "head" | "body" | null = null;

function onResizePointerDown(e: PointerEvent, handle: ResizeHandle) {
  if (e.button !== 0) return;
  if (props.model.readOnly.value) return;
  e.stopPropagation();
  resizePointerId = e.pointerId;
  resizeHandle = handle;
  resizingSection = null;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  const widthVal = (props.model.width as any)?.value ?? props.model.width;
  const w = widthVal?.expanded;
  resizeStartWidth = w === "Auto" ? 160 : parseFloat(w ?? "160");
  const heightVal = (props.model.height as any)?.value ?? props.model.height;
  const h = heightVal?.expanded;
  resizeStartHeight = h === "Auto" ? 80 : parseFloat(h ?? "80");
  resizeStartPosX = props.model.pos.value.x;
  resizeStartPosY = props.model.pos.value.y;
  isDragging.value = true;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
}

function onSectionResizePointerDown(e: PointerEvent, section: "head" | "body") {
  if (e.button !== 0) return;
  if (props.model.readOnly.value) return;
  e.stopPropagation();
  resizePointerId = e.pointerId;
  resizeHandle = "s";
  resizingSection = section;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  const sectionMap = props.model.rawMap.get(section) as import("yjs").Map<unknown>;
  const hMap = sectionMap.get("height") as import("yjs").Map<string>;
  const hVal = hMap.get("expanded") ?? "Auto";
  resizeStartHeight = hVal === "Auto" || hVal === "Minimum" ? 80 : parseFloat(hVal);
  isDragging.value = true;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
}

function onSectionCornerResizePointerDown(e: PointerEvent, handle: ResizeHandle, section: "head" | "body") {
  if (e.button !== 0) return;
  if (props.model.readOnly.value) return;
  e.stopPropagation();
  resizePointerId = e.pointerId;
  resizeHandle = handle;
  resizingSection = section;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  const widthVal = (props.model.width as any)?.value ?? props.model.width;
  const w = widthVal?.expanded;
  resizeStartWidth = w === "Auto" ? 160 : parseFloat(w ?? "160");
  const sectionMap = props.model.rawMap.get(section) as import("yjs").Map<unknown>;
  const hMap = sectionMap.get("height") as import("yjs").Map<string>;
  const hVal = hMap.get("expanded") ?? "Auto";
  resizeStartHeight = hVal === "Auto" || hVal === "Minimum" ? 80 : parseFloat(hVal);
  resizeStartPosX = props.model.pos.value.x;
  resizeStartPosY = props.model.pos.value.y;
  isDragging.value = true;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
}

function onResizePointerMove(e: PointerEvent) {
  if (resizePointerId !== e.pointerId || !resizeHandle) return;
  const z = props.zoom || 1;
  const dx = (e.clientX - resizeStartX) / z;
  const dy = (e.clientY - resizeStartY) / z;

  if (resizingSection) {
    const nextHeight = Math.max(
      40,
      Math.round(resizeStartHeight + dy),
    );
    const sectionMap = props.model.rawMap.get(resizingSection) as import("yjs").Map<unknown>;
    const hMap = sectionMap.get("height") as import("yjs").Map<string>;
    hMap.set("expanded", String(nextHeight));

    const isWest = resizeHandle.includes("w");
    if (isWest || resizeHandle.includes("e")) {
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
    return;
  }

  const isWest = resizeHandle.includes("w");
  const nextWidth = Math.max(
    80,
    Math.round(isWest ? resizeStartWidth - dx : resizeStartWidth + dx),
  );

  const isNorth = resizeHandle.includes("n");
  const nextHeight = Math.max(
    40,
    Math.round(isNorth ? resizeStartHeight - dy : resizeStartHeight + dy),
  );

  const widthMap = props.model.rawMap.get("width") as import("yjs").Map<string>;
  widthMap.set("expanded", String(nextWidth));

  const heightMap = props.model.rawMap.get("height") as import("yjs").Map<string>;
  heightMap.set("expanded", String(nextHeight));

  if (isWest) {
    const posMap = props.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("x", Math.round(resizeStartPosX + dx));
  }
  if (isNorth) {
    const posMap = props.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("y", Math.round(resizeStartPosY + dy));
  }
}

function onResizePointerUp(e: PointerEvent) {
  if (resizePointerId !== e.pointerId) return;
  resizePointerId = null;
  resizeHandle = null;
  resizingSection = null;
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

function onContextMenu(e: MouseEvent) {
  if (props.model.readOnly.value) return;
  e.stopPropagation();
  emit("context-menu", e);
}
</script>

<template>
  <div
    ref="rootRef"
    data-testid="display-note"
    :data-note-id="id"
    :class="frameClasses"
    :style="transform"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="emit('edit-start')"
    @contextmenu="onContextMenu"
  >
    <!-- Note content wrapper: background, border, radius -->
    <div
      class="relative overflow-hidden"
      :style="[contentStyle, { borderRadius: '7px', borderWidth: '1px', borderStyle: 'solid' }]"
    >
      <!-- head section -->
      <div
        v-if="model.head.enabled.value && !model.collapsing.collapsed.value"
        class="flex"
        :style="{ height: headHeightCSS, minHeight: '36.45px' }"
      >
        <div class="flex-1" @dblclick.stop="emit('edit-start')" @focusin="emit('edit-start')">
          <NoteTiptapEditor
            :fragment="headFrag!"
            :editable="isEditing && !model.readOnly.value"
            placeholder="Head…"
            :note-id="id"
            section="head"
          />
        </div>
        <button
          v-if="model.collapsing.enabled.value && topSection === 'head' && !model.readOnly.value"
          class="flex items-center justify-center focus:outline-none"
          style="width: 32px; min-height: 36.45px"
          :style="{ color: textColor }"
          @pointerdown.stop="toggleCollapsed"
        >
          <ChevronDown v-if="!model.collapsing.collapsed.value" class="h-4 w-4" />
          <ChevronRight v-else class="h-4 w-4" />
        </button>
      </div>

      <!-- divider head -> body -->
      <div
        v-if="
          !model.collapsing.collapsed.value &&
          model.head.enabled.value &&
          (model.body.enabled.value || model.container.enabled.value)
        "
        class="relative"
        :style="{ height: '1px', backgroundColor: dividerColor }"
      >
        <div
          v-if="model.resizable.value && !model.readOnly.value && props.selected"
          class="absolute z-[2147483646] cursor-ns-resize"
          style="top: -3px; left: 0; right: 0; height: 7px;"
          @pointerdown="(e: PointerEvent) => onSectionResizePointerDown(e, 'head')"
          @pointermove="onResizePointerMove"
          @pointerup="onResizePointerUp"
          @pointercancel="onResizePointerUp"
        />
        <template v-if="model.resizable.value && !model.readOnly.value && props.selected && !isFlexChild">
          <div
            class="absolute z-[2147483647] h-2.5 w-2.5 rounded-full"
            style="left: 0%; top: 0%; background-color: #2196f3; transform: translate(-50%, -50%);"
            @pointerdown="(e: PointerEvent) => onSectionCornerResizePointerDown(e, 'sw', 'head')"
            @pointermove="onResizePointerMove"
            @pointerup="onResizePointerUp"
            @pointercancel="onResizePointerUp"
          />
          <div
            class="absolute z-[2147483647] h-2.5 w-2.5 rounded-full"
            style="left: 100%; top: 0%; background-color: #2196f3; transform: translate(-50%, -50%);"
            @pointerdown="(e: PointerEvent) => onSectionCornerResizePointerDown(e, 'se', 'head')"
            @pointermove="onResizePointerMove"
            @pointerup="onResizePointerUp"
            @pointercancel="onResizePointerUp"
          />
        </template>
      </div>

      <!-- body section -->
      <div
        v-if="model.body.enabled.value && !model.collapsing.collapsed.value"
        class="flex"
        :style="{ height: bodyHeightCSS, minHeight: '36.45px' }"
      >
        <div class="flex-1" @dblclick.stop="emit('edit-start')" @focusin="emit('edit-start')">
          <NoteTiptapEditor
            :fragment="bodyFrag!"
            :editable="isEditing && !model.readOnly.value"
            placeholder="Body…"
            :note-id="id"
            section="body"
          />
        </div>
        <button
          v-if="model.collapsing.enabled.value && topSection === 'body' && !model.readOnly.value"
          class="flex items-center justify-center focus:outline-none"
          style="width: 32px; min-height: 36.45px"
          :style="{ color: textColor }"
          @pointerdown.stop="toggleCollapsed"
        >
          <ChevronDown v-if="!model.collapsing.collapsed.value" class="h-4 w-4" />
          <ChevronRight v-else class="h-4 w-4" />
        </button>
      </div>

      <!-- divider body -> container -->
      <div
        v-if="
          !model.collapsing.collapsed.value &&
          model.body.enabled.value &&
          model.container.enabled.value
        "
        class="relative"
        :style="{ height: '1px', backgroundColor: dividerColor }"
      >
        <div
          v-if="model.resizable.value && !model.readOnly.value && props.selected"
          class="absolute z-[2147483646] cursor-ns-resize"
          style="top: -3px; left: 0; right: 0; height: 7px;"
          @pointerdown="(e: PointerEvent) => onSectionResizePointerDown(e, 'body')"
          @pointermove="onResizePointerMove"
          @pointerup="onResizePointerUp"
          @pointercancel="onResizePointerUp"
        />
        <template v-if="model.resizable.value && !model.readOnly.value && props.selected && !isFlexChild">
          <div
            class="absolute z-[2147483647] h-2.5 w-2.5 rounded-full"
            style="left: 0%; top: 0%; background-color: #2196f3; transform: translate(-50%, -50%);"
            @pointerdown="(e: PointerEvent) => onSectionCornerResizePointerDown(e, 'sw', 'body')"
            @pointermove="onResizePointerMove"
            @pointerup="onResizePointerUp"
            @pointercancel="onResizePointerUp"
          />
          <div
            class="absolute z-[2147483647] h-2.5 w-2.5 rounded-full"
            style="left: 100%; top: 0%; background-color: #2196f3; transform: translate(-50%, -50%);"
            @pointerdown="(e: PointerEvent) => onSectionCornerResizePointerDown(e, 'se', 'body')"
            @pointermove="onResizePointerMove"
            @pointerup="onResizePointerUp"
            @pointercancel="onResizePointerUp"
          />
        </template>
      </div>

      <!-- container section -->
      <div
        v-if="model.container.enabled.value && !model.collapsing.collapsed.value"
        style="min-height: 52.5px"
      />
    </div>

    <!-- Link icon (absolute, top center) -->
    <div
      v-if="model.link.value"
      class="pointer-events-none absolute left-1/2"
      style="top: 2px; transform: translate(-50%, -50%)"
    >
      <a
        :href="model.link.value"
        target="_blank"
        rel="noopener noreferrer"
        class="pointer-events-auto"
        @pointerdown.stop
      >
        <ExternalLink class="h-3.5 w-3.5" :style="{ color: textColor }" />
      </a>
    </div>

    <!-- Resize bars -->
    <template v-if="model.resizable.value && !model.readOnly.value && props.selected">
      <div
        v-for="bar in ([
          { side: 'n', top: '-3px', left: '0', right: '0', height: '7px', cursor: 'ns-resize' },
          { side: 's', bottom: '-3px', left: '0', right: '0', height: '7px', cursor: 'ns-resize' },
          { side: 'e', right: '-3px', top: '0', bottom: '0', width: '7px', cursor: 'ew-resize' },
          { side: 'w', left: '-3px', top: '0', bottom: '0', width: '7px', cursor: 'ew-resize' },
        ] as const)"
        :key="bar.side"
        class="absolute z-[2147483646]"
        :style="bar"
        @pointerdown="(e: PointerEvent) => onResizePointerDown(e, bar.side)"
        @pointermove="onResizePointerMove"
        @pointerup="onResizePointerUp"
        @pointercancel="onResizePointerUp"
      />
    </template>

    <!-- Corner resize handles -->
    <template v-if="model.resizable.value && !model.readOnly.value && props.selected">
      <div
        v-for="h in ([
          { key: 'nw', top: '0%', left: '0%', cursor: 'nwse-resize' },
          { key: 'ne', top: '0%', left: '100%', cursor: 'nesw-resize' },
          { key: 'sw', top: '100%', left: '0%', cursor: 'nesw-resize' },
          { key: 'se', top: '100%', left: '100%', cursor: 'nwse-resize' },
        ] as const)"
        :key="h.key"
        class="absolute z-[2147483647] h-2.5 w-2.5 rounded-full"
        :style="[h, { backgroundColor: '#2196f3', transform: 'translate(-50%, -50%)' }]"
        @pointerdown="(e: PointerEvent) => onResizePointerDown(e, h.key)"
        @pointermove="onResizePointerMove"
        @pointerup="onResizePointerUp"
        @pointercancel="onResizePointerUp"
      />
    </template>

    <!-- Arrow handles -->
    <template v-if="selected && !model.readOnly.value">
      <svg
        v-for="h in ([
          { anchor: { x: -1, y: 0 }, style: { top: '50%', left: '-20px', transform: 'translate(-50%, -50%) rotateZ(-90deg)' } },
          { anchor: { x: 1, y: 0 }, style: { top: '50%', right: '-20px', transform: 'translate(50%, -50%) rotateZ(90deg)' } },
          { anchor: { x: 0, y: -1 }, style: { top: '-20px', left: '50%', transform: 'translate(-50%, -50%) rotateZ(0deg)' } },
          { anchor: { x: 0, y: 1 }, style: { bottom: '-20px', left: '50%', transform: 'translate(-50%, 50%) rotateZ(180deg)' } },
        ] as const)"
        :key="`${h.anchor.x}-${h.anchor.y}`"
        class="note-arrow-handle absolute cursor-copy"
        style="width: 20px; height: 27px; z-index: 2147483647;"
        :style="h.style"
        @pointerdown.stop="(e: PointerEvent) => { emit('arrowDragStart', { noteId: props.id }); }"
      >
        <path d="M 6 27 L 14 27 L 14 14 L 20 14 L 10 0 L 0 14 L 6 14 Z" stroke="none" fill="#2196f3" />
      </svg>
    </template>

    <!-- container children -->
    <template v-if="model.container.enabled.value && childModels?.length && !model.collapsing.collapsed.value">
      <div
        ref="containerChildrenRef"
        data-testid="container-children"
        class="absolute inset-x-0 bottom-0 overflow-visible"
        :class="[
          containerSpatial
            ? ''
            : [
                containerHorizontal ? 'flex flex-row' : 'flex flex-col',
                containerWrapChildren ? 'flex-wrap' : 'flex-nowrap',
                containerStretchChildren ? 'items-stretch' : 'items-start',
              ],
        ]"
        :style="{ top: `${CONTAINER_CONTENT_OFFSET_Y}px` }"
      >
        <DisplayNote
          v-for="child in childModels"
          :key="child.id"
          :id="child.id"
          :model="child.model"
          :zoom="zoom"
          :parent-color="noteColor"
          :is-flex-child="!containerSpatial"
          @dragend="$emit('dragend', $event)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.note-arrow-handle {
  opacity: 0.15;
  pointer-events: auto;
}
.note-arrow-handle:hover {
  opacity: 0.8;
}
</style>
