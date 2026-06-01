<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { Button } from "@/components/ui/button";
import { Undo, Redo, RotateCcw, Search, Maximize } from "lucide-vue-next";

import SpatialWorldCanvas from "./SpatialWorldCanvas.vue";
import DisplayNote from "./DisplayNote.vue";
import DisplayArrow from "./DisplayArrow.vue";
import CanvasContextMenu from "./CanvasContextMenu.vue";
import FindReplaceDialog from "./FindReplaceDialog.vue";
import { useSpatialPage } from "./useSpatialPage";
import { useSpatialSelection } from "./selection";
import { useSpatialEditing } from "./useSpatialEditing";
import { useSpatialUndoRedo } from "./undo-redo";
import { useSpatialKeyboard } from "./useSpatialKeyboard";
import { screenToWorld } from "./spatial-viewport-math";
import { provideNoteHeights } from "./useNoteHeights";
import { useBoxSelection } from "./useBoxSelection";
import { useArrowDrag } from "./useArrowDrag";
import { useArrowReconnect } from "./useArrowReconnect";
import { useNoteDrag } from "./useNoteDrag";
import { copySelection, pastePayload } from "./clipboard";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";

const props = defineProps<{
  ydoc: any;
  defaultNoteTemplate?: Partial<ClipboardNote> | null;
  defaultArrowTemplate?: Partial<ClipboardArrow> | null;
}>();

const emit = defineEmits<{
  'select-note': [id: string | null, model: any]
  'select-arrow': [id: string | null, model: any]
  'note-drag-start': [id: string]
  'note-drag-end': [id: string]
}>();

const canvasRef = ref<{
  camX: number;
  camY: number;
  zoom: number;
  rootEl: HTMLElement | null;
  resetView: () => void;
  fitToScreen: (bounds: { minX: number; minY: number; maxX: number; maxY: number }, padding?: number) => void;
} | null>(null);

const undoRedo = useSpatialUndoRedo(props.ydoc);

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
} = useSpatialPage(props.ydoc, undoRedo);

function getNoteZIndex(id: string): number {
  const note = noteList.value.find((n) => n.id === id);
  return note?.model.zIndex.value ?? 0;
}

function setNoteZIndex(id: string, z: number) {
  const note = noteList.value.find((n) => n.id === id);
  if (note) {
    const zMap = note.model.rawMap.get("zIndex") as import("yjs").Map<number>;
    if (zMap) zMap.set("value", z);
  }
}

const selection = useSpatialSelection({
  getNoteZIndex,
  setNoteZIndex,
});

const editing = useSpatialEditing();

// Provide reactive note-height map so DisplayArrow can read actual rendered heights
provideNoteHeights();

// Emit selection changes for properties panel
watch(() => selection.selectedIds.value, (ids: Set<string>) => {
  const noteIds = selection.selectedOfKind('note')
  const arrowIds = selection.selectedOfKind('arrow')

  if (noteIds.length === 1) {
    const note = noteList.value.find(n => n.id === noteIds[0])
    if (note) {
      emit('select-note', note.id, note.model)
    }
  } else {
    emit('select-note', null, null)
  }

  if (arrowIds.length === 1) {
    const arrow = arrowList.value.find(a => a.id === arrowIds[0])
    if (arrow) {
      emit('select-arrow', arrow.id, arrow.model)
    }
  } else {
    emit('select-arrow', null, null)
  }
})

const pasteCount = ref(0);

// --- find/replace dialog state ---
const findReplaceOpen = ref(false);

// --- context menu state ---
const contextMenu = ref<{
  open: boolean;
  x: number;
  y: number;
}>({ open: false, x: 0, y: 0 });

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

// --- extracted composables ---
const { onCanvasPointerDown, onCanvasPointerMove, onCanvasPointerUp } = useBoxSelection({
  canvasRef,
  selection,
  editing,
  rootNoteList,
  noteList,
  parentOf,
});

const { arrowDrag, previewLine, onArrowDragStart } = useArrowDrag({
  canvasRef,
  noteList,
  createArrow,
  defaultArrowTemplate: props.defaultArrowTemplate,
});

const { reconnectingArrowId, reconnectingFrom, hoveredNoteId, onArrowReconnectStart } = useArrowReconnect({
  canvasRef,
  arrowList,
  noteList,
  parentOf,
});

const {
  draggingNoteId,
  draggingNoteModel,
  dragScreenX,
  dragScreenY,
  hoveredContainerId,
  onNoteDragStart,
  onNoteDragEnd,
} = useNoteDrag({
  canvasRef,
  noteList,
  noteById,
  parentOf,
  moveNoteIntoContainer,
  moveNoteOutOfContainer,
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

  createNoteAt(world.x, world.y, props.defaultNoteTemplate);
}

function fitToScreen() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  // Calculate bounding box of all root notes
  if (rootNoteList.value.length === 0) {
    canvas.resetView();
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const note of rootNoteList.value) {
    const wStr = note.model.width.value.expanded;
    const w = wStr === "Auto" ? 160 : parseFloat(wStr);
    const h = 80; // Default height estimate
    const x = note.model.pos.value.x;
    const y = note.model.pos.value.y;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  canvas.fitToScreen({ minX, minY, maxX, maxY }, 40);
}

function onCanvasContextMenu(e: MouseEvent) {
  e.preventDefault();
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

  contextMenu.value = {
    open: true,
    x: e.clientX,
    y: e.clientY,
  };
}

function handleContextMenuCreateNote(x: number, y: number) {
  const canvas = canvasRef.value;
  if (!canvas || !canvas.rootEl) return;

  const rect = canvas.rootEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const world = screenToWorld(
    x,
    y,
    cx,
    cy,
    canvas.camX,
    canvas.camY,
    canvas.zoom,
  );

  createNoteAt(world.x, world.y, props.defaultNoteTemplate);
}

async function handleContextMenuPaste(payload: { notes: ClipboardNote[]; arrows: ClipboardArrow[] }) {
  const canvas = canvasRef.value;
  const centerX = canvas?.camX ?? 0;
  const centerY = canvas?.camY ?? 0;
  const offset = pasteCount.value * 32;
  pasteCount.value += 1;

  const result = pastePayload(payload, {
    createNote: createNoteAt,
    createArrow: createArrow,
    offsetX: centerX + offset,
    offsetY: centerY + offset,
  });

  selection.clear();
  for (const id of result.noteIds) {
    selection.select(id, "note", true);
  }
}

function handleContextMenuDeleteSelected() {
  for (const id of selection.selectedOfKind("note")) {
    deleteNote(id);
  }
  for (const id of selection.selectedOfKind("arrow")) {
    deleteArrow(id);
  }
  selection.clear();
}

async function handleContextMenuCopySelected() {
  const selectedNotes = noteList.value.filter((n) =>
    selection.isSelected(n.id),
  );
  const selectedArrows = arrowList.value.filter((a) =>
    selection.isSelected(a.id),
  );
  if (selectedNotes.length > 0) {
    await copySelection(selectedNotes, selectedArrows);
  }
}

async function handleContextMenuCutSelected() {
  const selectedNotes = noteList.value.filter((n) =>
    selection.isSelected(n.id),
  );
  const selectedArrows = arrowList.value.filter((a) =>
    selection.isSelected(a.id),
  );
  if (selectedNotes.length > 0) {
    await copySelection(selectedNotes, selectedArrows);
    for (const id of selection.selectedOfKind("note")) {
      deleteNote(id);
    }
    for (const id of selection.selectedOfKind("arrow")) {
      deleteArrow(id);
    }
    selection.clear();
  }
}

// --- keyboard shortcuts ---
const { onKeyDown } = useSpatialKeyboard({
  selection,
  editing,
  undoRedo,
  noteList,
  arrowList,
  rootNoteList,
  deleteNote,
  deleteArrow,
  createNoteAt,
  createArrow,
  defaultNoteTemplate: props.defaultNoteTemplate,
  defaultArrowTemplate: props.defaultArrowTemplate,
  findReplaceOpen,
  pasteCount,
  getCamPos: () => ({
    x: canvasRef.value?.camX ?? 0,
    y: canvasRef.value?.camY ?? 0,
  }),
});

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <SpatialWorldCanvas
      ref="canvasRef"
      class="flex-1"
      @dblclick="onCanvasDoubleClick"
      @pointerdown="onCanvasPointerDown"
      @pointermove="onCanvasPointerMove"
      @pointerup="onCanvasPointerUp"
      @contextmenu="onCanvasContextMenu"
    >
      <DisplayArrow
        v-for="arrow in arrowList"
        :key="arrow.id"
        :id="arrow.id"
        :model="arrow.model"
        :source-model="noteById.get(arrow.model.source.value)"
        :target-model="noteById.get(arrow.model.target.value)"
        :selected="selection.isSelected(arrow.id)"
        @select="selection.select(arrow.id, 'arrow')"
        @toggle="selection.toggle(arrow.id, 'arrow')"
        @reconnect-start="onArrowReconnectStart"
        @edit-start="editing.startEditing(arrow.id, 'arrow')"
      />
      <DisplayNote
        v-for="note in notesByZIndex"
        :id="note.id"
        :key="note.id"
        :model="note.model"
        :zoom="canvasRef?.zoom ?? 1"
        :selected="selection.isSelected(note.id)"
        :is-drop-target="hoveredContainerId === note.id"
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
            ? createArrow(selection.activeId.value, note.id, props.defaultArrowTemplate)
            : undefined
        "
        @arrow-drag-start="onArrowDragStart($event.noteId)"
        @dragstart="onNoteDragStart"
        @dragend="onNoteDragEnd"
        @edit-start="editing.startEditing(note.id, 'note')"
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

    <!-- arrow drag preview line -->
    <svg
      v-if="previewLine"
      class="pointer-events-none absolute inset-0 z-50 overflow-visible"
    >
      <line
        :x1="previewLine.x1"
        :y1="previewLine.y1"
        :x2="previewLine.x2"
        :y2="previewLine.y2"
        stroke="currentColor"
        stroke-width="2"
        stroke-dasharray="4 4"
        class="text-primary"
      />
    </svg>

    <!-- === Floating UI === -->
    <!-- Right-side camera + undo/redo buttons -->
    <div
      class="pointer-events-none absolute top-14 right-3 bottom-3 z-20 flex flex-col items-end justify-start gap-1.5"
    >
      <div class="pointer-events-auto flex flex-col items-end gap-1.5">
        <!-- Zoom % -->
        <div
          class="bg-card border-border flex h-8 items-center justify-center rounded-md border px-2 text-xs font-medium shadow-sm"
        >
          {{ Math.round((canvasRef?.zoom ?? 1) * 100) }}%
        </div>

        <!-- Reset zoom -->
        <Button
          variant="secondary"
          size="icon"
          class="h-8 w-8 shadow-sm"
          title="Reset zoom"
          @click="canvasRef?.resetView()"
        >
          <RotateCcw class="h-4 w-4" />
        </Button>

        <!-- Fit to screen -->
        <Button
          variant="secondary"
          size="icon"
          class="h-8 w-8 shadow-sm"
          title="Fit to screen"
          @click="fitToScreen"
        >
          <Maximize class="h-4 w-4" />
        </Button>

        <!-- Find/Replace -->
        <Button
          variant="secondary"
          size="icon"
          class="h-8 w-8 shadow-sm"
          title="Find and Replace (Ctrl+F)"
          @click="findReplaceOpen = true"
        >
          <Search class="h-4 w-4" />
        </Button>

        <!-- Undo -->
        <Button
          variant="secondary"
          size="icon"
          class="h-8 w-8 shadow-sm"
          title="Undo (Ctrl+Z)"
          :disabled="!undoRedo.canUndo()"
          @click="undoRedo.undo()"
        >
          <Undo class="h-4 w-4" />
        </Button>

        <!-- Redo -->
        <Button
          variant="secondary"
          size="icon"
          class="h-8 w-8 shadow-sm"
          title="Redo (Ctrl+Shift+Z)"
          :disabled="!undoRedo.canRedo()"
          @click="undoRedo.redo()"
        >
          <Redo class="h-4 w-4" />
        </Button>
      </div>

      <!-- Spacer pushes bottom items down -->
      <div class="flex-1" />

      <!-- Bottom-right: selection count -->
      <div
        v-if="selection.selected.value.length > 0"
        class="bg-card border-border pointer-events-auto rounded-md border px-2 py-1 text-xs shadow-sm"
      >
        {{ selection.selected.value.length }} item{{ selection.selected.value.length === 1 ? "" : "s" }} selected
      </div>
    </div>

    <!-- Canvas context menu -->
    <CanvasContextMenu
      :x="contextMenu.x"
      :y="contextMenu.y"
      :open="contextMenu.open"
      :has-selection="selection.selected.value.length > 0"
      @create-note="handleContextMenuCreateNote"
      @paste="handleContextMenuPaste"
      @delete-selected="handleContextMenuDeleteSelected"
      @copy-selected="handleContextMenuCopySelected"
      @cut-selected="handleContextMenuCutSelected"
      @close="contextMenu.open = false"
    />

    <!-- Find/Replace dialog -->
    <FindReplaceDialog
      :open="findReplaceOpen"
      :notes="noteList"
      @close="findReplaceOpen = false"
    />

    <!-- Teleport overlay for dragged note -->
    <Teleport to="body">
      <div
        v-if="draggingNoteId && draggingNoteModel"
        class="pointer-events-none fixed z-[9999] opacity-70"
        :style="{
          left: `${dragScreenX}px`,
          top: `${dragScreenY}px`,
          transform: `translate(-50%, -50%) scale(${canvasRef?.zoom ?? 1})`,
        }"
      >
        <DisplayNote
          :id="draggingNoteId"
          :model="draggingNoteModel"
          :zoom="canvasRef?.zoom ?? 1"
          :selected="false"
          :child-models="[]"
          :pos-override="{ x: 0, y: 0 }"
        />
      </div>
    </Teleport>
  </div>
</template>
