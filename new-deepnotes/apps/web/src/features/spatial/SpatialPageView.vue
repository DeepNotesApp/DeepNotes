<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import SpatialWorldCanvas from "./SpatialWorldCanvas.vue";
import DisplayNote from "./DisplayNote.vue";
import DisplayArrow from "./DisplayArrow.vue";
import CanvasContextMenu from "./CanvasContextMenu.vue";
import NoteContextMenu from "./NoteContextMenu.vue";
import FindReplaceDialog from "./FindReplaceDialog.vue";
import ScreenshotDialog from "./ScreenshotDialog.vue";
import CollabAvatars from "./CollabAvatars.vue";
import CanvasToolbar from "./CanvasToolbar.vue";
import FloatingCameraButtons from "./FloatingCameraButtons.vue";
import { useSpatialPage } from "./useSpatialPage";
import { useSpatialSelection } from "./selection";
import { useSpatialEditing } from "./useSpatialEditing";
import { useSpatialUndoRedo } from "./undo-redo";
import { useSpatialKeyboard } from "./useSpatialKeyboard";
import { provideNoteHeights } from "./useNoteHeights";
import { useBoxSelection } from "./useBoxSelection";
import { useArrowDrag } from "./useArrowDrag";
import { useArrowReconnect } from "./useArrowReconnect";
import { useNoteDrag } from "./useNoteDrag";
import { useCanvasActions } from "./useCanvasActions";
import { useCanvasContextMenu } from "./useCanvasContextMenu";
import { useNoteContextMenu } from "./useNoteContextMenu";
import { YPAGE_NOTE_KEY } from "@deepnotes/collab-wire";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";
import { copySelection, readClipboardPayload } from "./clipboard";

const props = defineProps<{
  ydoc: any;
  awareness?: any;
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
  zoomIn: () => void;
  zoomOut: () => void;
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
    note.model.rawMap.set("zIndex", z);
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

// --- screenshot dialog state ---
const screenshotOpen = ref(false);

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

const { onCanvasDoubleClick, fitToScreen } = useCanvasActions({
  canvasRef,
  rootNoteList,
  selectedNoteIds: selection.selectedIds,
  createNoteAt,
  defaultNoteTemplate: props.defaultNoteTemplate,
});

function insertNoteAtCenter() {
  const camX = canvasRef.value?.camX ?? 0;
  const camY = canvasRef.value?.camY ?? 0;
  createNoteAt(camX, camY, props.defaultNoteTemplate);
}

function insertArrowBetweenSelected() {
  const noteIds = selection.selectedOfKind('note');
  if (noteIds.length === 2) {
    createArrow(noteIds[0]!, noteIds[1]!, props.defaultArrowTemplate);
    return true;
  }
  return false;
}

function zoomIn() {
  canvasRef.value?.zoomIn();
}

function zoomOut() {
  canvasRef.value?.zoomOut();
}

defineExpose({
  insertNoteAtCenter,
  insertArrowBetweenSelected,
  zoomIn,
  zoomOut,
  fitToScreen,
});

const {
  contextMenu,
  onCanvasContextMenu,
  handleContextMenuCreateNote,
  handleContextMenuPaste,
  handleContextMenuDeleteSelected,
  handleContextMenuCopySelected,
  handleContextMenuCutSelected,
} = useCanvasContextMenu({
  canvasRef,
  selection,
  noteList,
  arrowList,
  createNoteAt,
  createArrow,
  deleteNote,
  deleteArrow,
  defaultNoteTemplate: props.defaultNoteTemplate,
  pasteCount,
});

// --- note context menu ---
const {
  contextMenu: noteContextMenu,
  onNoteContextMenu,
  handleNoteContextMenuDelete,
  handleNoteContextMenuBringToFront,
  handleNoteContextMenuSendToBack,
} = useNoteContextMenu({
  noteList,
  deleteNote,
});

async function handleContextMenuDuplicateSelected() {
  await handleContextMenuCopySelected();
  const payload = await readClipboardPayload();
  if (payload) {
    await handleContextMenuPaste(payload);
  }
}

function handleContextMenuSelectAll() {
  for (const note of noteList.value) {
    selection.select(note.id, "note", true);
  }
  for (const arrow of arrowList.value) {
    selection.select(arrow.id, "arrow", true);
  }
}

async function handleNoteContextMenuCopy() {
  const noteId = noteContextMenu.value.noteId;
  if (noteId) {
    selection.select(noteId, "note");
    await handleContextMenuCopySelected();
  }
}

async function handleNoteContextMenuCut() {
  const noteId = noteContextMenu.value.noteId;
  if (noteId) {
    selection.select(noteId, "note");
    await handleContextMenuCopySelected();
    handleContextMenuDeleteSelected();
  }
}

async function handleNoteContextMenuPaste() {
  const payload = await readClipboardPayload();
  if (payload) {
    await handleContextMenuPaste(payload);
  }
}

async function handleNoteContextMenuDuplicate() {
  const noteId = noteContextMenu.value.noteId;
  if (noteId) {
    selection.select(noteId, "note");
    await handleContextMenuCopySelected();
    const payload = await readClipboardPayload();
    if (payload) {
      await handleContextMenuPaste(payload);
    }
  }
}

function handleNoteContextMenuSelectAll() {
  for (const note of noteList.value) {
    selection.select(note.id, "note", true);
  }
  for (const arrow of arrowList.value) {
    selection.select(arrow.id, "arrow", true);
  }
}

function nudgeNotes(dx: number, dy: number) {
  for (const note of noteList.value) {
    if (selection.isSelected(note.id)) {
      const posMap = note.model.rawMap.get(YPAGE_NOTE_KEY.pos) as any;
      if (posMap) {
        posMap.set("x", (posMap.get("x") ?? 0) + dx);
        posMap.set("y", (posMap.get("y") ?? 0) + dy);
      }
    }
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
  screenshotOpen,
  pasteCount,
  getCamPos: () => ({
    x: canvasRef.value?.camX ?? 0,
    y: canvasRef.value?.camY ?? 0,
  }),
  getZoom: () => canvasRef.value?.zoom ?? 1,
  nudgeNotes,
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
    <CanvasToolbar
      class="absolute top-2 left-14 right-14 z-20"
      :selected-note-ids="selection.selectedOfKind('note')"
      :can-undo="undoRedo.canUndo()"
      :can-redo="undoRedo.canRedo()"
      @undo="undoRedo.undo()"
      @redo="undoRedo.redo()"
      @insert-note="insertNoteAtCenter()"
      @insert-arrow="insertArrowBetweenSelected()"
    />
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
        @context-menu="onNoteContextMenu(note.id, $event)"
      />
    </SpatialWorldCanvas>

    <!-- Right-side floating camera buttons -->
    <FloatingCameraButtons
      class="absolute top-14 right-3 z-20"
      :zoom="canvasRef?.zoom ?? 1"
      :can-undo="undoRedo.canUndo()"
      :can-redo="undoRedo.canRedo()"
      @reset-zoom="canvasRef?.resetView()"
      @fit-to-screen="fitToScreen()"
      @undo="undoRedo.undo()"
      @redo="undoRedo.redo()"
    />

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
    <CollabAvatars v-if="props.awareness" :awareness="props.awareness" />

    <!-- Bottom-right: selection count -->
    <div
      v-if="selection.selected.value.length > 0"
      class="bg-card border-border pointer-events-none absolute bottom-3 right-3 rounded-md border px-2 py-1 text-xs shadow-sm"
    >
      {{ selection.selected.value.length }} item{{ selection.selected.value.length === 1 ? "" : "s" }} selected
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
      @duplicate-selected="handleContextMenuDuplicateSelected"
      @select-all="handleContextMenuSelectAll"
      @close="contextMenu.open = false"
    />

    <!-- Note context menu -->
    <NoteContextMenu
      :x="noteContextMenu.x"
      :y="noteContextMenu.y"
      :open="noteContextMenu.open"
      @close="noteContextMenu.open = false"
      @delete="handleNoteContextMenuDelete"
      @copy="handleNoteContextMenuCopy"
      @cut="handleNoteContextMenuCut"
      @paste="handleNoteContextMenuPaste"
      @duplicate="handleNoteContextMenuDuplicate"
      @select-all="handleNoteContextMenuSelectAll"
      @bring-to-front="handleNoteContextMenuBringToFront"
      @send-to-back="handleNoteContextMenuSendToBack"
    />

    <!-- Find/Replace dialog -->
    <FindReplaceDialog
      :open="findReplaceOpen"
      :notes="noteList"
      @close="findReplaceOpen = false"
    />

    <!-- Screenshot dialog -->
    <ScreenshotDialog
      :open="screenshotOpen"
      :canvas-element="canvasRef?.rootEl ?? null"
      :selected-note-ids="Array.from(selection.selectedIds.value)"
      :notes="noteList"
      :zoom="canvasRef?.zoom ?? 1"
      :cam-x="canvasRef?.camX ?? 0"
      :cam-y="canvasRef?.camY ?? 0"
      @close="screenshotOpen = false"
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
