import { ref } from "vue";
import type { Ref } from "vue";
import type { NoteModel } from "./note-model";
import type { ArrowModel } from "./arrow-model";
import { screenToWorld } from "./spatial-viewport-math";
import { getNoteRect } from "./note-geometry";
import { useNoteHeights } from "./useNoteHeights";

export interface UseArrowReconnectInput {
  canvasRef: Ref<{
    camX: number;
    camY: number;
    zoom: number;
    rootEl: HTMLElement | null;
  } | null>;
  arrowList: Ref<{ id: string; model: ArrowModel }[]>;
  noteList: Ref<{ id: string; model: NoteModel }[]>;
  parentOf: Ref<Map<string, string>>;
}

export function useArrowReconnect(input: UseArrowReconnectInput) {
  const { heights: noteHeights, originOffsets: noteOriginOffsets } = useNoteHeights();
  const reconnectingArrowId = ref<string | null>(null);
  const reconnectingFrom = ref<'source' | 'target' | null>(null);
  const hoveredNoteId = ref<string | null>(null);

  function onArrowReconnectStart(arrowId: string, from: 'source' | 'target') {
    reconnectingArrowId.value = arrowId;
    reconnectingFrom.value = from;
    window.addEventListener('pointermove', onReconnectPointerMove);
    window.addEventListener('pointerup', onReconnectPointerUp);
  }

  function onReconnectPointerMove(e: PointerEvent) {
    if (!reconnectingArrowId.value) return;

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

    let bestNoteId: string | null = null;

    for (const note of input.noteList.value) {
      const noteRect = getNoteRect(note.id, input.noteList.value, input.parentOf.value, noteHeights.value, noteOriginOffsets.value);
      if (!noteRect) continue;

      if (
        world.x >= noteRect.x &&
        world.x <= noteRect.x + noteRect.width &&
        world.y >= noteRect.y &&
        world.y <= noteRect.y + noteRect.height
      ) {
        bestNoteId = note.id;
        break;
      }
    }

    hoveredNoteId.value = bestNoteId;
  }

  function onReconnectPointerUp() {
    window.removeEventListener('pointermove', onReconnectPointerMove);
    window.removeEventListener('pointerup', onReconnectPointerUp);

    if (reconnectingArrowId.value && hoveredNoteId.value && reconnectingFrom.value) {
      const arrow = input.arrowList.value.find(a => a.id === reconnectingArrowId.value);
      if (arrow) {
        if (reconnectingFrom.value === 'source') {
          arrow.model.source.value = hoveredNoteId.value;
        } else {
          arrow.model.target.value = hoveredNoteId.value;
        }
      }
    }

    reconnectingArrowId.value = null;
    reconnectingFrom.value = null;
    hoveredNoteId.value = null;
  }

  return {
    reconnectingArrowId,
    reconnectingFrom,
    hoveredNoteId,
    onArrowReconnectStart,
  };
}
