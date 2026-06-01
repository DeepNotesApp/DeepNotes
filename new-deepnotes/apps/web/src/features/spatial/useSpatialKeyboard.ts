import type { Ref } from "vue";
import type { SpatialSelection } from "./selection";
import type { SpatialEditing } from "./useSpatialEditing";
import type { SpatialUndoRedo } from "./undo-redo";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";
import { copySelection, pastePayload, readClipboardPayload } from "./clipboard";
import {
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
  distributeHorizontally,
  distributeVertically,
} from "./alignment";

export interface UseSpatialKeyboardInput {
  selection: SpatialSelection;
  editing: SpatialEditing;
  undoRedo: SpatialUndoRedo;
  noteList: Ref<{ id: string; model: any }[]>;
  arrowList: Ref<{ id: string; model: any }[]>;
  rootNoteList: Ref<{ id: string; model: any }[]>;
  deleteNote: (id: string) => void;
  deleteArrow: (id: string) => void;
  createNoteAt: (x: number, y: number, template?: Partial<ClipboardNote> | null) => string;
  createArrow: (sourceId: string, targetId: string, template?: Partial<ClipboardArrow> | null) => string;
  defaultNoteTemplate?: Partial<ClipboardNote> | null;
  defaultArrowTemplate?: Partial<ClipboardArrow> | null;
  findReplaceOpen: Ref<boolean>;
  pasteCount: Ref<number>;
  getCamPos: () => { x: number; y: number };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("[contenteditable='true'], [contenteditable='']"))
    return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useSpatialKeyboard(input: UseSpatialKeyboardInput) {
  async function onKeyDown(e: KeyboardEvent) {
    if (isTypingTarget(e.target)) return;

    if (e.key === "Escape") {
      input.editing.stopEditing();
      return;
    }

    // When actively editing a note/arrow, don't delete selected elements.
    if (input.editing.editingId.value) {
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if (input.selection.selectedIds.value.size > 0) {
        for (const id of input.selection.selectedOfKind("note")) {
          input.deleteNote(id);
        }
        for (const id of input.selection.selectedOfKind("arrow")) {
          input.deleteArrow(id);
        }
        input.selection.clear();
      }
      return;
    }

    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      input.selection.selectAll(input.rootNoteList.value.map((n) => n.id));
      return;
    }

    if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (e.shiftKey) {
        input.undoRedo.redo();
      } else {
        input.undoRedo.undo();
      }
      return;
    }

    if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const selectedNotes = input.noteList.value.filter((n) =>
        input.selection.isSelected(n.id),
      );
      const selectedArrows = input.arrowList.value.filter((a) =>
        input.selection.isSelected(a.id),
      );
      if (selectedNotes.length > 0) {
        await copySelection(selectedNotes, selectedArrows);
      }
      return;
    }

    if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
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
      return;
    }

    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const payload = await readClipboardPayload();
      if (payload && payload.notes.length > 0) {
        const cam = input.getCamPos();
        const offset = input.pasteCount.value * 32;
        input.pasteCount.value += 1;

        const result = pastePayload(payload, {
          createNote: input.createNoteAt,
          createArrow: input.createArrow,
          offsetX: cam.x + offset,
          offsetY: cam.y + offset,
        });

        input.selection.clear();
        for (const id of result.noteIds) {
          input.selection.select(id, "note", true);
        }
      }
      return;
    }

    if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      input.findReplaceOpen.value = true;
      return;
    }

    // Alignment shortcuts (Ctrl+Shift+...)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      const selectedNotes = input.noteList.value.filter((n) =>
        input.selection.isSelected(n.id),
      );
      if (selectedNotes.length >= 2) {
        switch (e.key) {
          case "l":
            e.preventDefault();
            alignLeft(selectedNotes);
            return;
          case "c":
            e.preventDefault();
            alignCenter(selectedNotes);
            return;
          case "r":
            e.preventDefault();
            alignRight(selectedNotes);
            return;
          case "t":
            e.preventDefault();
            alignTop(selectedNotes);
            return;
          case "m":
            e.preventDefault();
            alignMiddle(selectedNotes);
            return;
          case "b":
            e.preventDefault();
            alignBottom(selectedNotes);
            return;
          case "h":
            e.preventDefault();
            distributeHorizontally(selectedNotes);
            return;
          case "v":
            e.preventDefault();
            distributeVertically(selectedNotes);
            return;
        }
      }
    }
  }

  return { onKeyDown };
}
