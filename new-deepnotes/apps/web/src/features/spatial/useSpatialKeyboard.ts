import type { Ref } from "vue";
import type { SpatialSelection } from "./selection";
import type { SpatialEditing } from "./useSpatialEditing";
import type { SpatialUndoRedo } from "./undo-redo";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";
import { copySelection, pastePayload, readClipboardPayload } from "./clipboard";
import { getNoteEditors } from "./note-editor-registry";
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
  screenshotOpen: Ref<boolean>;
  pasteCount: Ref<number>;
  getCamPos: () => { x: number; y: number };
  getZoom?: () => number;
  nudgeNotes?: (dx: number, dy: number) => void;
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
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        input.undoRedo.undo();
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

    if (e.key === "h" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      input.findReplaceOpen.value = true;
      return;
    }

    if (e.altKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      input.screenshotOpen.value = true;
      return;
    }

    if (e.key === "F2") {
      e.preventDefault();
      const active = input.selection.active.value;
      if (active) {
        input.editing.startEditing(active.id, active.kind);
      }
      return;
    }

    // Duplicate selection (Ctrl+D)
    if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const selectedNotes = input.noteList.value.filter((n) =>
        input.selection.isSelected(n.id),
      );
      const selectedArrows = input.arrowList.value.filter((a) =>
        input.selection.isSelected(a.id),
      );
      if (selectedNotes.length > 0) {
        await copySelection(selectedNotes, selectedArrows);
        const payload = await readClipboardPayload();
        if (payload) {
          const result = pastePayload(payload, {
            createNote: input.createNoteAt,
            createArrow: input.createArrow,
            offsetX: 20,
            offsetY: 20,
          });
          input.selection.clear();
          for (const id of result.noteIds) {
            input.selection.select(id, "note", true);
          }
        }
      }
      return;
    }

    // Nudge selected notes with arrow keys
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      const selectedNoteIds = Array.from(input.selection.selectedOfKind("note"));
      if (selectedNoteIds.length > 0 && input.nudgeNotes) {
        e.preventDefault();
        const zoom = input.getZoom?.() ?? 1;
        const step = 1 / zoom;
        let dx = 0;
        let dy = 0;
        switch (e.key) {
          case "ArrowUp":
            dy = -step;
            break;
          case "ArrowDown":
            dy = step;
            break;
          case "ArrowLeft":
            dx = -step;
            break;
          case "ArrowRight":
            dx = step;
            break;
        }
        input.nudgeNotes(dx, dy);
      }
      return;
    }

    // Active element navigation: Tab cycles selected notes, Enter starts editing
    if (e.key === "Tab" && input.selection.selected.value.length > 1) {
      e.preventDefault();
      const selected = input.selection.selected.value;
      const currentIndex = selected.findIndex(
        (s) => s.id === input.selection.activeId.value,
      );
      const nextIndex = e.shiftKey
        ? (currentIndex - 1 + selected.length) % selected.length
        : (currentIndex + 1) % selected.length;
      const next = selected[nextIndex];
      if (next) {
        input.selection.select(next.id, next.kind);
      }
      return;
    }

    if (e.key === "Enter" && input.selection.activeId.value && !input.editing.editingId.value) {
      e.preventDefault();
      const active = input.selection.active.value;
      if (active) {
        input.editing.startEditing(active.id, active.kind);
      }
      return;
    }

    // Selection formatting shortcuts (Ctrl+B/I/U) — apply across all selected note editors
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const selectedNoteIds = Array.from(input.selection.selectedOfKind("note"));
      if (selectedNoteIds.length > 0) {
        let command: ((editor: any) => void) | null = null;
        switch (e.key) {
          case "b":
            e.preventDefault();
            command = (ed) => ed.chain().focus().toggleBold().run();
            break;
          case "i":
            e.preventDefault();
            command = (ed) => ed.chain().focus().toggleItalic().run();
            break;
          case "u":
            e.preventDefault();
            command = (ed) => ed.chain().focus().toggleUnderline().run();
            break;
        }
        if (command) {
          for (const noteId of selectedNoteIds) {
            const editors = getNoteEditors(noteId);
            for (const ed of editors) {
              command(ed);
            }
          }
          return;
        }
      }
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
