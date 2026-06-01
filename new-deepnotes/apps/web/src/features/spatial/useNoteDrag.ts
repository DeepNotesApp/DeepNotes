import { ref } from "vue";
import type { Ref } from "vue";
import type { NoteModel } from "./note-model";
import { screenToWorld } from "./spatial-viewport-math";
import { getNoteRect } from "./note-geometry";
import { useNoteHeights } from "./useNoteHeights";

export interface UseNoteDragInput {
  canvasRef: Ref<{
    camX: number;
    camY: number;
    zoom: number;
    rootEl: HTMLElement | null;
  } | null>;
  noteList: Ref<{ id: string; model: NoteModel }[]>;
  noteById: Ref<Map<string, NoteModel>>;
  parentOf: Ref<Map<string, string>>;
  moveNoteIntoContainer: (noteId: string, containerId: string) => void;
  moveNoteOutOfContainer: (noteId: string) => void;
}

export function useNoteDrag(input: UseNoteDragInput) {
  const { heights: noteHeights } = useNoteHeights();
  const draggingNoteId = ref<string | null>(null);
  const draggingNoteModel = ref<any>(null);
  const dragScreenX = ref(0);
  const dragScreenY = ref(0);
  const hoveredContainerId = ref<string | null>(null);

  function onNoteDragStart(noteId: string) {
    const note = input.noteList.value.find((n) => n.id === noteId);
    if (note) {
      draggingNoteId.value = noteId;
      draggingNoteModel.value = note.model;
      dragScreenX.value = 0;
      dragScreenY.value = 0;
      window.addEventListener('pointermove', onDragPointerMove);
      window.addEventListener('pointerup', onDragPointerUp);
    }
  }

  function onDragPointerMove(e: PointerEvent) {
    dragScreenX.value = e.clientX;
    dragScreenY.value = e.clientY;

    if (!draggingNoteId.value) return;

    const canvas = input.canvasRef.value;
    if (!canvas || !canvas.rootEl) return;

    const rect = canvas.rootEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const z = canvas.zoom;
    const camX = canvas.camX;
    const camY = canvas.camY;

    const world = screenToWorld(
      e.clientX,
      e.clientY,
      cx,
      cy,
      camX,
      camY,
      z,
    );

    let bestContainerId: string | null = null;

    for (const note of input.noteList.value) {
      if (note.id === draggingNoteId.value) continue;
      if (!note.model.container.enabled.value) continue;

      const containerRect = getNoteRect(note.id, input.noteList.value, input.parentOf.value, noteHeights.value);
      if (!containerRect) continue;

      if (
        world.x >= containerRect.x &&
        world.x <= containerRect.x + containerRect.width &&
        world.y >= containerRect.y &&
        world.y <= containerRect.y + containerRect.height
      ) {
        bestContainerId = note.id;
        break;
      }
    }

    hoveredContainerId.value = bestContainerId;
  }

  function onDragPointerUp() {
    window.removeEventListener('pointermove', onDragPointerMove);
    window.removeEventListener('pointerup', onDragPointerUp);
  }

  function onNoteDragEnd(noteId: string) {
    draggingNoteId.value = null;
    draggingNoteModel.value = null;
    const targetContainer = hoveredContainerId.value;
    hoveredContainerId.value = null;

    const noteRect = getNoteRect(noteId, input.noteList.value, input.parentOf.value, noteHeights.value);
    if (!noteRect) return;

    const currentParentId = input.parentOf.value.get(noteId);

    let bestContainerId: string | null = targetContainer;
    let bestOverlapArea = 0;

    if (!bestContainerId) {
      for (const note of input.noteList.value) {
        if (note.id === noteId) continue;
        if (!note.model.container.enabled.value) continue;

        const descendants = new Set<string>();
        function collect(id: string) {
          const m = input.noteById.value.get(id);
          if (!m) return;
          for (const childId of (m as any).container.children.value as string[]) {
            descendants.add(childId);
            collect(childId);
          }
        }
        collect(noteId);
        if (descendants.has(note.id)) continue;

        const containerRect = getNoteRect(note.id, input.noteList.value, input.parentOf.value, noteHeights.value);
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
    }

    if (bestContainerId && bestContainerId !== currentParentId) {
      input.moveNoteIntoContainer(noteId, bestContainerId);
    } else if (!bestContainerId && currentParentId) {
      input.moveNoteOutOfContainer(noteId);
    }
  }

  return {
    draggingNoteId,
    draggingNoteModel,
    dragScreenX,
    dragScreenY,
    hoveredContainerId,
    onNoteDragStart,
    onNoteDragEnd,
  };
}
