import { computed, ref } from "vue";
import type { Ref } from "vue";
import type { NoteModel } from "./note-model";
import { worldToScreen } from "./spatial-viewport-math";
import { useNoteHeights } from "./useNoteHeights";
import type { ClipboardArrow } from "./clipboard";

export interface UseArrowDragInput {
  canvasRef: Ref<{
    camX: number;
    camY: number;
    zoom: number;
    rootEl: HTMLElement | null;
  } | null>;
  noteList: Ref<{ id: string; model: NoteModel }[]>;
  createArrow: (sourceId: string, targetId: string, template?: Partial<ClipboardArrow> | null) => string;
  defaultArrowTemplate?: Partial<ClipboardArrow> | null;
}

export function useArrowDrag(input: UseArrowDragInput) {
  const { heights: noteHeights } = useNoteHeights();
  const arrowDrag = ref<{
    sourceId: string;
    endX: number;
    endY: number;
  } | null>(null);

  const previewLine = computed(() => {
    if (!arrowDrag.value || !input.canvasRef.value?.rootEl) return null;
    const sourceNote = input.noteList.value.find(
      (n) => n.id === arrowDrag.value!.sourceId,
    );
    if (!sourceNote) return null;

    const rect = input.canvasRef.value.rootEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const z = input.canvasRef.value.zoom;
    const camX = input.canvasRef.value.camX;
    const camY = input.canvasRef.value.camY;

    const widthVal = (sourceNote.model.width as any)?.value ?? sourceNote.model.width;
    const wStr = widthVal?.expanded;
    const w = wStr === "Auto" ? 160 : parseFloat(wStr ?? "160");
    const h = noteHeights.value.get(sourceNote.id) ?? 80;
    const sourceScreen = worldToScreen(
      sourceNote.model.pos.value.x + w / 2,
      sourceNote.model.pos.value.y + h / 2,
      cx,
      cy,
      camX,
      camY,
      z,
    );

    return {
      x1: sourceScreen.x,
      y1: sourceScreen.y,
      x2: arrowDrag.value.endX,
      y2: arrowDrag.value.endY,
    };
  });

  function onArrowDragStart(sourceId: string) {
    arrowDrag.value = { sourceId, endX: 0, endY: 0 };
    window.addEventListener("pointermove", onArrowDragMove);
    window.addEventListener("pointerup", onArrowDragEnd);
  }

  function onArrowDragMove(e: PointerEvent) {
    if (!arrowDrag.value) return;
    arrowDrag.value.endX = e.clientX;
    arrowDrag.value.endY = e.clientY;
  }

  function onArrowDragEnd(e: PointerEvent) {
    window.removeEventListener("pointermove", onArrowDragMove);
    window.removeEventListener("pointerup", onArrowDragEnd);

    if (!arrowDrag.value) return;
    const sourceId = arrowDrag.value.sourceId;
    arrowDrag.value = null;

    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    if (!targetEl) return;

    const noteEl = targetEl.closest("[data-note-id]") as HTMLElement | null;
    if (!noteEl) return;

    const targetId = noteEl.dataset.noteId;
    if (!targetId || targetId === sourceId) return;

    input.createArrow(sourceId, targetId, input.defaultArrowTemplate);
  }

  return {
    arrowDrag,
    previewLine,
    onArrowDragStart,
  };
}
