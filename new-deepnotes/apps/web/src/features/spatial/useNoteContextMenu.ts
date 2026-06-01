import { ref, type Ref } from "vue";
import type { NoteModel } from "./note-model";

export interface UseNoteContextMenuInput {
  noteList: Ref<{ id: string; model: NoteModel }[]>;
  deleteNote: (id: string) => void;
}

export function useNoteContextMenu(input: UseNoteContextMenuInput) {
  const contextMenu = ref<{
    open: boolean;
    x: number;
    y: number;
    noteId: string | null;
  }>({ open: false, x: 0, y: 0, noteId: null });

  function onNoteContextMenu(noteId: string, e: MouseEvent) {
    e.preventDefault();
    contextMenu.value = {
      open: true,
      x: e.clientX,
      y: e.clientY,
      noteId,
    };
  }

  function handleNoteContextMenuDelete() {
    const id = contextMenu.value.noteId;
    if (id) {
      input.deleteNote(id);
    }
  }

  function handleNoteContextMenuBringToFront() {
    const id = contextMenu.value.noteId;
    if (!id) return;
    const note = input.noteList.value.find((n) => n.id === id);
    if (!note) return;
    const allZ = input.noteList.value.map((n) => n.model.zIndex.value);
    const maxZ = allZ.length > 0 ? Math.max(...allZ) : 0;
    const zMap = note.model.rawMap.get("zIndex") as import("yjs").Map<number>;
    if (zMap) zMap.set("value", maxZ + 1);
  }

  function handleNoteContextMenuSendToBack() {
    const id = contextMenu.value.noteId;
    if (!id) return;
    const note = input.noteList.value.find((n) => n.id === id);
    if (!note) return;
    const allZ = input.noteList.value.map((n) => n.model.zIndex.value);
    const minZ = allZ.length > 0 ? Math.min(...allZ) : 0;
    const zMap = note.model.rawMap.get("zIndex") as import("yjs").Map<number>;
    if (zMap) zMap.set("value", minZ - 1);
  }

  return {
    contextMenu,
    onNoteContextMenu,
    handleNoteContextMenuDelete,
    handleNoteContextMenuBringToFront,
    handleNoteContextMenuSendToBack,
  };
}
