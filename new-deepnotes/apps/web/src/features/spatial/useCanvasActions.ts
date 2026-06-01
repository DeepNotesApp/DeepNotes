import { type Ref } from "vue";
import { screenToWorld } from "./spatial-viewport-math";
import type { ClipboardNote } from "./clipboard";
import type { NoteModel } from "./note-model";

export interface CanvasRef {
  camX: number;
  camY: number;
  zoom: number;
  rootEl: HTMLElement | null;
  resetView: () => void;
  fitToScreen: (bounds: { minX: number; minY: number; maxX: number; maxY: number }, padding?: number) => void;
}

export interface UseCanvasActionsInput {
  canvasRef: Ref<CanvasRef | null>;
  rootNoteList: Ref<{ id: string; model: NoteModel }[]>;
  createNoteAt: (x: number, y: number, template?: Partial<ClipboardNote> | null) => string;
  defaultNoteTemplate?: Partial<ClipboardNote> | null;
}

export function useCanvasActions(input: UseCanvasActionsInput) {
  function onCanvasDoubleClick(e: MouseEvent) {
    const canvas = input.canvasRef.value;
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

    input.createNoteAt(world.x, world.y, input.defaultNoteTemplate);
  }

  function fitToScreen() {
    const canvas = input.canvasRef.value;
    if (!canvas) return;

    if (input.rootNoteList.value.length === 0) {
      canvas.resetView();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const note of input.rootNoteList.value) {
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

  return { onCanvasDoubleClick, fitToScreen };
}
