<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import SpatialWorldCanvas from "./SpatialWorldCanvas.vue";
import DisplayNote from "./DisplayNote.vue";
import DisplayArrow from "./DisplayArrow.vue";
import { useSpatialPage } from "./useSpatialPage";
import { useSpatialSelection } from "./selection";
import { screenToWorld } from "./spatial-viewport-math";

const props = defineProps<{
  ydoc: any;
}>();

const canvasRef = ref<{
  camX: number;
  camY: number;
  zoom: number;
  rootEl: HTMLElement | null;
} | null>(null);

const {
  noteList,
  rootNoteList,
  arrowList,
  parentOf,
  createNoteAt,
  deleteNote,
  deleteArrow,
  createArrow,
  moveNoteIntoContainer,
  moveNoteOutOfContainer,
} = useSpatialPage(props.ydoc);

const selection = useSpatialSelection();

const noteById = computed(() => {
  const map = new Map<string, (typeof noteList.value)[0]["model"]>();
  for (const n of noteList.value) {
    map.set(n.id, n.model);
  }
  return map;
});

const notesByZIndex = computed(() => {
  return [...rootNoteList.value].sort(
    (a, b) => a.model.zIndex.value - b.model.zIndex.value,
  );
});

function onCanvasDoubleClick(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas || !canvas.rootEl) return;

  const rect = canvas.rootEl.getBoundingClientRect();
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

// --- box selection state ---
const DRAG_THRESHOLD = 4;
let boxState: {
  active: boolean;
  startX: number;
  startY: number;
  ctrl: boolean;
} | null = null;

function onCanvasPointerDown(e: PointerEvent) {
  // Only handle left-click on the canvas background (not notes/arrows).
  // SpatialWorldCanvas calls preventDefault() when panning (space/middle),
  // so we skip if default is prevented to avoid fighting pan.
  if (e.target !== e.currentTarget || e.button !== 0 || e.defaultPrevented)
    return;

  boxState = {
    active: false,
    startX: e.clientX,
    startY: e.clientY,
    ctrl: e.ctrlKey || e.metaKey,
  };

  if (!boxState.ctrl) {
    selection.clear();
  }
}

function onCanvasPointerMove(e: PointerEvent) {
  if (!boxState) return;

  const dx = e.clientX - boxState.startX;
  const dy = e.clientY - boxState.startY;

  if (!boxState.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    boxState.active = true;
    selection.startBoxSelect(boxState.startX, boxState.startY);
  }

  if (boxState.active) {
    selection.updateBoxSelect(e.clientX, e.clientY);
  }
}

function onCanvasPointerUp() {
  if (!boxState) return;

  if (boxState.active) {
    finalizeBoxSelect();
  } else {
    // Click on empty canvas without drag: already cleared in pointerdown
    // unless Ctrl was held, in which case we do nothing.
  }

  boxState = null;
}

function rectsIntersect(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function finalizeBoxSelect() {
  const result = selection.endBoxSelect();
  const canvas = canvasRef.value;
  if (!result.start || !result.end || !canvas || !canvas.rootEl) return;

  const rect = canvas.rootEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const z = canvas.zoom;
  const camX = canvas.camX;
  const camY = canvas.camY;

  const w1 = screenToWorld(result.start.x, result.start.y, cx, cy, camX, camY, z);
  const w2 = screenToWorld(result.end.x, result.end.y, cx, cy, camX, camY, z);

  const boxX = Math.min(w1.x, w2.x);
  const boxY = Math.min(w1.y, w2.y);
  const boxW = Math.max(w1.x, w2.x) - boxX;
  const boxH = Math.max(w1.y, w2.y) - boxY;

  for (const note of rootNoteList.value) {
    const nx = note.model.pos.value.x;
    const ny = note.model.pos.value.y;
    const nwStr = note.model.width.value.expanded;
    const nw = nwStr === "Auto" ? 160 : parseFloat(nwStr);
    const nh = 80; // approximate note height for box-select

    if (rectsIntersect(boxX, boxY, boxW, boxH, nx, ny, nw, nh)) {
      selection.select(note.id, "note", true);
    }
  }
}

// --- drag into/out of container ---
function getNoteEffectiveWorldPos(
  noteId: string,
): { x: number; y: number } | null {
  const entry = noteList.value.find((n) => n.id === noteId);
  if (!entry) return null;
  const parentId = parentOf.value.get(noteId);
  if (!parentId) {
    return { x: entry.model.pos.value.x, y: entry.model.pos.value.y };
  }
  const parent = noteList.value.find((n) => n.id === parentId);
  if (!parent) return { x: entry.model.pos.value.x, y: entry.model.pos.value.y };
  return {
    x: parent.model.pos.value.x + entry.model.pos.value.x,
    y:
      parent.model.pos.value.y +
      entry.model.pos.value.y +
      48 /* container content offset */,
  };
}

function getNoteRect(noteId: string) {
  const entry = noteList.value.find((n) => n.id === noteId);
  if (!entry) return null;
  const pos = getNoteEffectiveWorldPos(noteId);
  if (!pos) return null;
  const wStr = entry.model.width.value.expanded;
  const w = wStr === "Auto" ? 160 : parseFloat(wStr);
  const h = 80;
  return { x: pos.x, y: pos.y, width: w, height: h };
}

function onNoteDragEnd(noteId: string) {
  const noteRect = getNoteRect(noteId);
  if (!noteRect) return;

  const currentParentId = parentOf.value.get(noteId);

  // Find overlapping container notes (excluding self and descendants)
  let bestContainerId: string | null = null;
  let bestOverlapArea = 0;

  for (const note of noteList.value) {
    if (note.id === noteId) continue;
    if (!note.model.container.enabled.value) continue;

    // Prevent dropping into own descendants
    const descendants = new Set<string>();
    function collect(id: string) {
      const m = noteById.value.get(id);
      if (!m) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const childId of (m as any).container.children.value as string[]) {
        descendants.add(childId);
        collect(childId);
      }
    }
    collect(noteId);
    if (descendants.has(note.id)) continue;

    const containerRect = getNoteRect(note.id);
    if (!containerRect) continue;

    const overlapX =
      Math.max(0, Math.min(noteRect.x + noteRect.width, containerRect.x + containerRect.width) - Math.max(noteRect.x, containerRect.x));
    const overlapY =
      Math.max(0, Math.min(noteRect.y + noteRect.height, containerRect.y + containerRect.height) - Math.max(noteRect.y, containerRect.y));
    const overlapArea = overlapX * overlapY;

    if (overlapArea > bestOverlapArea) {
      bestOverlapArea = overlapArea;
      bestContainerId = note.id;
    }
  }

  if (bestContainerId && bestContainerId !== currentParentId) {
    moveNoteIntoContainer(noteId, bestContainerId);
  } else if (!bestContainerId && currentParentId) {
    moveNoteOutOfContainer(noteId);
  }
}

// --- keyboard shortcuts ---
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("[contenteditable='true'], [contenteditable='']"))
    return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function onKeyDown(e: KeyboardEvent) {
  if (isTypingTarget(e.target)) return;

  if (e.key === "Delete" || e.key === "Backspace") {
    if (selection.selectedIds.value.size > 0) {
      for (const id of selection.selectedOfKind("note")) {
        deleteNote(id);
      }
      for (const id of selection.selectedOfKind("arrow")) {
        deleteArrow(id);
      }
      selection.clear();
    }
    return;
  }

  if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    selection.selectAll(rootNoteList.value.map((n) => n.id));
    return;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
  <div class="space-y-2">
    <div class="text-muted-foreground text-xs">
      Double-click on the canvas to create a note. Scroll to pan, Ctrl+scroll to
      zoom. Click a note to select, Ctrl+click to multi-select, drag on empty
      canvas to box-select, Ctrl+A to select all, then press Delete to remove.
      Shift+click another note to connect with an arrow.
    </div>
    <div class="relative">
      <SpatialWorldCanvas
        ref="canvasRef"
        @dblclick="onCanvasDoubleClick"
        @pointerdown="onCanvasPointerDown"
        @pointermove="onCanvasPointerMove"
        @pointerup="onCanvasPointerUp"
      >
        <DisplayArrow
          v-for="arrow in arrowList"
          :key="arrow.id"
          :model="arrow.model"
          :source-model="noteById.get(arrow.model.source.value)"
          :target-model="noteById.get(arrow.model.target.value)"
          :selected="selection.isSelected(arrow.id)"
          @select="selection.select(arrow.id, 'arrow')"
          @toggle="selection.toggle(arrow.id, 'arrow')"
        />
        <DisplayNote
          v-for="note in notesByZIndex"
          :id="note.id"
          :key="note.id"
          :model="note.model"
          :zoom="canvasRef?.zoom ?? 1"
          :selected="selection.isSelected(note.id)"
          :child-models="
            note.model.container.children.value
              .map((childId) => {
                const model = noteById.get(childId);
                return model ? { id: childId, model } : null;
              })
              .filter((m): m is NonNullable<typeof m> => m !== null)
          "
          @select="selection.select(note.id, 'note')"
          @toggle="selection.toggle(note.id, 'note')"
          @shift-click="
            selection.activeId.value && selection.activeId.value !== note.id
              ? createArrow(selection.activeId.value, note.id)
              : undefined
          "
          @dragend="onNoteDragEnd"
        />
      </SpatialWorldCanvas>

      <!-- box selection overlay -->
      <div
        v-if="selection.boxSelecting.value && selection.boxRect.value"
        class="pointer-events-none absolute z-50 border border-primary bg-primary/10"
        :style="{
          left: `${selection.boxRect.value.x}px`,
          top: `${selection.boxRect.value.y}px`,
          width: `${selection.boxRect.value.width}px`,
          height: `${selection.boxRect.value.height}px`,
        }"
      />
    </div>
  </div>
</template>
