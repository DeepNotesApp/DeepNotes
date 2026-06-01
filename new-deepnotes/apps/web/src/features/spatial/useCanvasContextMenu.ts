import { ref, type Ref } from "vue";
import { screenToWorld } from "./spatial-viewport-math";
import { copySelection, pastePayload } from "./clipboard";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";
import type { NoteModel } from "./note-model";
import type { ArrowModel } from "./arrow-model";
import type { SpatialSelection } from "./selection";

export interface CanvasRef {
  camX: number;
  camY: number;
  zoom: number;
  rootEl: HTMLElement | null;
}

export interface UseCanvasContextMenuInput {
  canvasRef: Ref<CanvasRef | null>;
  selection: SpatialSelection;
  noteList: Ref<{ id: string; model: NoteModel }[]>;
  arrowList: Ref<{ id: string; model: ArrowModel }[]>;
  createNoteAt: (x: number, y: number, template?: Partial<ClipboardNote> | null) => string;
  createArrow: (sourceId: string, targetId: string, template?: Partial<ClipboardArrow> | null) => string;
  deleteNote: (id: string) => void;
  deleteArrow: (id: string) => void;
  defaultNoteTemplate?: Partial<ClipboardNote> | null;
  pasteCount: Ref<number>;
}

export function useCanvasContextMenu(input: UseCanvasContextMenuInput) {
  const contextMenu = ref<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });

  function onCanvasContextMenu(e: MouseEvent) {
    e.preventDefault();
    const canvas = input.canvasRef.value;
    if (!canvas || !canvas.rootEl) return;

    contextMenu.value = {
      open: true,
      x: e.clientX,
      y: e.clientY,
    };
  }

  function handleContextMenuCreateNote(x: number, y: number) {
    const canvas = input.canvasRef.value;
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

    input.createNoteAt(world.x, world.y, input.defaultNoteTemplate);
  }

  async function handleContextMenuPaste(payload: { notes: ClipboardNote[]; arrows: ClipboardArrow[] }) {
    const canvas = input.canvasRef.value;
    const centerX = canvas?.camX ?? 0;
    const centerY = canvas?.camY ?? 0;
    const offset = input.pasteCount.value * 32;
    input.pasteCount.value += 1;

    const result = pastePayload(payload, {
      createNote: input.createNoteAt,
      createArrow: input.createArrow,
      offsetX: centerX + offset,
      offsetY: centerY + offset,
    });

    input.selection.clear();
    for (const id of result.noteIds) {
      input.selection.select(id, "note", true);
    }
  }

  function handleContextMenuDeleteSelected() {
    for (const id of input.selection.selectedOfKind("note")) {
      input.deleteNote(id);
    }
    for (const id of input.selection.selectedOfKind("arrow")) {
      input.deleteArrow(id);
    }
    input.selection.clear();
  }

  async function handleContextMenuCopySelected() {
    const selectedNotes = input.noteList.value.filter((n) =>
      input.selection.isSelected(n.id),
    );
    const selectedArrows = input.arrowList.value.filter((a) =>
      input.selection.isSelected(a.id),
    );
    if (selectedNotes.length > 0) {
      await copySelection(selectedNotes, selectedArrows);
    }
  }

  async function handleContextMenuCutSelected() {
    const selectedNotes = input.noteList.value.filter((n) =>
      input.selection.isSelected(n.id),
    );
    const selectedArrows = input.arrowList.value.filter((a) =>
      input.selection.isSelected(a.id),
    );
    if (selectedNotes.length > 0) {
      await copySelection(selectedNotes, selectedArrows);
      for (const id of input.selection.selectedOfKind("note")) {
        input.deleteNote(id);
      }
      for (const id of input.selection.selectedOfKind("arrow")) {
        input.deleteArrow(id);
      }
      input.selection.clear();
    }
  }

  return {
    contextMenu,
    onCanvasContextMenu,
    handleContextMenuCreateNote,
    handleContextMenuPaste,
    handleContextMenuDeleteSelected,
    handleContextMenuCopySelected,
    handleContextMenuCutSelected,
  };
}
