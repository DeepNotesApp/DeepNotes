import type { Ref } from "vue";
import type { SpatialSelection } from "./selection";
import type { SpatialEditing } from "./useSpatialEditing";
import type { NoteModel } from "./note-model";
import { screenToWorld } from "./spatial-viewport-math";
import { getNoteRect, rectsIntersect } from "./note-geometry";
import { useNoteHeights } from "./useNoteHeights";

const DRAG_THRESHOLD = 4;

interface BoxSelectionState {
  active: boolean;
  startX: number;
  startY: number;
  ctrl: boolean;
}

export interface UseBoxSelectionInput {
  canvasRef: Ref<{
    camX: number;
    camY: number;
    zoom: number;
    rootEl: HTMLElement | null;
  } | null>;
  selection: SpatialSelection;
  editing: SpatialEditing;
  rootNoteList: Ref<{ id: string; model: NoteModel }[]>;
  noteList: Ref<{ id: string; model: NoteModel }[]>;
  parentOf: Ref<Map<string, string>>;
}

export function useBoxSelection(input: UseBoxSelectionInput) {
  const { heights: noteHeights, originOffsets: noteOriginOffsets } = useNoteHeights();
  let boxState: BoxSelectionState | null = null;

  function onCanvasPointerDown(e: PointerEvent) {
    if (e.target !== e.currentTarget || e.button !== 0 || e.defaultPrevented)
      return;

    input.editing.stopEditing();

    boxState = {
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      ctrl: e.ctrlKey || e.metaKey,
    };

    if (!boxState.ctrl) {
      input.selection.clear();
    }
  }

  function onCanvasPointerMove(e: PointerEvent) {
    if (!boxState) return;

    const dx = e.clientX - boxState.startX;
    const dy = e.clientY - boxState.startY;

    if (!boxState.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      boxState.active = true;
      input.selection.startBoxSelect(boxState.startX, boxState.startY);
    }

    if (boxState.active) {
      input.selection.updateBoxSelect(e.clientX, e.clientY);
    }
  }

  function onCanvasPointerUp() {
    if (!boxState) return;

    if (boxState.active) {
      finalizeBoxSelect();
    }

    boxState = null;
  }

  function finalizeBoxSelect() {
    const result = input.selection.endBoxSelect();
    const canvas = input.canvasRef.value;
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

    for (const note of input.rootNoteList.value) {
      const noteRect = getNoteRect(note.id, input.noteList.value, input.parentOf.value, noteHeights.value, noteOriginOffsets.value);
      if (!noteRect) continue;

      if (
        rectsIntersect(
          boxX,
          boxY,
          boxW,
          boxH,
          noteRect.x,
          noteRect.y,
          noteRect.width,
          noteRect.height,
        )
      ) {
        input.selection.select(note.id, "note", true);
      }
    }
  }

  return {
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
  };
}
