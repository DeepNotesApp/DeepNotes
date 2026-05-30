import { computed, ref } from "vue";
import * as Y from "yjs";
import {
  addNoteToPage,
  addArrowToPage,
  getNotesMap,
  getNoteIds,
  getArrowsMap,
  getArrowIds,
  removeNoteFromPage,
  YPAGE_NOTE_KEY,
} from "@deepnotes/collab-wire";

import { useNoteModel, type NoteModel } from "./note-model";
import { useArrowModel, type ArrowModel } from "./arrow-model";

export type SpatialPage = ReturnType<typeof useSpatialPage>;

export function useSpatialPage(ydoc: Y.Doc) {
  const notesMap = getNotesMap(ydoc);
  const noteIdsArr = getNoteIds(ydoc);

  const noteIds = ref<string[]>(noteIdsArr.toArray());

  const noteModels = new Map<string, NoteModel>();
  const noteList = computed<{ id: string; model: NoteModel }[]>(() => {
    const result: { id: string; model: NoteModel }[] = [];
    for (const id of noteIds.value) {
      let model = noteModels.get(id);
      if (!model) {
        const noteMap = notesMap.get(id);
        if (noteMap) {
          model = useNoteModel(noteMap);
          noteModels.set(id, model);
        }
      }
      if (model) {
        result.push({ id, model });
      }
    }
    return result;
  });

  function refreshNoteIds() {
    noteIds.value = noteIdsArr.toArray();
  }

  notesMap.observe(refreshNoteIds);
  noteIdsArr.observe(refreshNoteIds);

  // --- arrows ---
  const arrowsMap = getArrowsMap(ydoc);
  const arrowIdsArr = getArrowIds(ydoc);
  const arrowIds = ref<string[]>(arrowIdsArr.toArray());

  const arrowModels = new Map<string, ArrowModel>();
  const arrowList = computed<{ id: string; model: ArrowModel }[]>(() => {
    const result: { id: string; model: ArrowModel }[] = [];
    for (const id of arrowIds.value) {
      let model = arrowModels.get(id);
      if (!model) {
        const arrowMap = arrowsMap.get(id);
        if (arrowMap) {
          model = useArrowModel(arrowMap);
          arrowModels.set(id, model);
        }
      }
      if (model) {
        result.push({ id, model });
      }
    }
    return result;
  });

  function refreshArrowIds() {
    arrowIds.value = arrowIdsArr.toArray();
  }

  arrowsMap.observe(refreshArrowIds);
  arrowIdsArr.observe(refreshArrowIds);

  function createNoteAt(worldX: number, worldY: number): string {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const note = addNoteToPage(ydoc, id);
    const pos = note.get(YPAGE_NOTE_KEY.pos) as Y.Map<number>;
    ydoc.transact(() => {
      pos.set("x", worldX);
      pos.set("y", worldY);
    });
    refreshNoteIds();
    return id;
  }

  function deleteNote(noteId: string) {
    removeNoteFromPage(ydoc, noteId);
    noteModels.delete(noteId);
    refreshNoteIds();
  }

  function createArrow(sourceId: string, targetId: string): string {
    const id = `arrow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const arrow = addArrowToPage(ydoc, id);
    ydoc.transact(() => {
      arrow.set("source", sourceId);
      arrow.set("target", targetId);
    });
    refreshArrowIds();
    return id;
  }

  return {
    noteIds,
    noteList,
    arrowList,
    createNoteAt,
    deleteNote,
    createArrow,
  };
}
