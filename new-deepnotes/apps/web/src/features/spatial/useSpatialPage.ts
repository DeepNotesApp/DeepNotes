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
  removeArrowFromPage,
  YPAGE_NOTE_KEY,
} from "@deepnotes/collab-wire";

import { CONTAINER_CONTENT_OFFSET_Y } from "./spatial-constants";
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

  // --- container parent tracking ---
  const parentOf = computed(() => {
    const map = new Map<string, string>();
    for (const { id, model } of noteList.value) {
      for (const childId of model.container.children.value) {
        map.set(childId, id);
      }
    }
    return map;
  });

  const rootNoteList = computed(() =>
    noteList.value.filter((n) => !parentOf.value.has(n.id)),
  );

  function addChildToContainer(containerId: string, childId: string) {
    const containerNote = notesMap.get(containerId);
    if (!containerNote) return;
    const containerMap = containerNote.get(
      YPAGE_NOTE_KEY.container,
    ) as Y.Map<unknown>;
    const childrenArr = containerMap.get("children") as Y.Array<string>;
    if (!childrenArr.toArray().includes(childId)) {
      childrenArr.push([childId]);
    }
  }

  function removeChildFromContainer(containerId: string, childId: string) {
    const containerNote = notesMap.get(containerId);
    if (!containerNote) return;
    const containerMap = containerNote.get(
      YPAGE_NOTE_KEY.container,
    ) as Y.Map<unknown>;
    const childrenArr = containerMap.get("children") as Y.Array<string>;
    const idx = childrenArr.toArray().indexOf(childId);
    if (idx >= 0) {
      childrenArr.delete(idx, 1);
    }
  }

  function deleteNote(noteId: string) {
    // Remove from parent container if nested
    const parentId = parentOf.value.get(noteId);
    if (parentId) {
      removeChildFromContainer(parentId, noteId);
    }
    // Delete children recursively
    const model = noteModels.get(noteId);
    if (model) {
      for (const childId of [...model.container.children.value]) {
        deleteNote(childId);
      }
    }
    removeNoteFromPage(ydoc, noteId);
    noteModels.delete(noteId);
    refreshNoteIds();
  }

  function deleteArrow(arrowId: string) {
    removeArrowFromPage(ydoc, arrowId);
    arrowModels.delete(arrowId);
    refreshArrowIds();
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

  function moveNoteIntoContainer(
    noteId: string,
    containerId: string,
  ): void {
    if (noteId === containerId) return;

    // Prevent nesting a container inside itself or its descendants
    const descendants = new Set<string>();
    function collectDescendants(id: string) {
      const model = noteModels.get(id);
      if (!model) return;
      for (const childId of model.container.children.value) {
        descendants.add(childId);
        collectDescendants(childId);
      }
    }
    collectDescendants(noteId);
    if (descendants.has(containerId)) return;

    // Remove from current parent if any
    const currentParentId = parentOf.value.get(noteId);
    if (currentParentId) {
      removeChildFromContainer(currentParentId, noteId);
    }

    // Get positions
    const noteEntry = noteList.value.find((n) => n.id === noteId);
    const containerEntry = noteList.value.find((n) => n.id === containerId);
    if (!noteEntry || !containerEntry) return;

    const notePos = noteEntry.model.pos.value;
    const containerPos = containerEntry.model.pos.value;

    // Convert note world position to container-local position
    const localX = notePos.x - containerPos.x;
    const localY =
      notePos.y - containerPos.y - CONTAINER_CONTENT_OFFSET_Y;

    const noteMap = notesMap.get(noteId);
    const containerNote = notesMap.get(containerId);
    if (!noteMap || !containerNote) return;

    ydoc.transact(() => {
      const posMap = noteMap.get(YPAGE_NOTE_KEY.pos) as Y.Map<number>;
      posMap.set("x", localX);
      posMap.set("y", localY);

      const containerMap = containerNote.get(
        YPAGE_NOTE_KEY.container,
      ) as Y.Map<unknown>;
      const childrenArr = containerMap.get("children") as Y.Array<string>;
      if (!childrenArr.toArray().includes(noteId)) {
        childrenArr.push([noteId]);
      }
    });
  }

  function moveNoteOutOfContainer(noteId: string): void {
    const currentParentId = parentOf.value.get(noteId);
    if (!currentParentId) return;

    const noteEntry = noteList.value.find((n) => n.id === noteId);
    const parentEntry = noteList.value.find((n) => n.id === currentParentId);
    if (!noteEntry || !parentEntry) return;

    const notePos = noteEntry.model.pos.value;
    const parentPos = parentEntry.model.pos.value;

    // Convert container-local position to world position
    const worldX = notePos.x + parentPos.x;
    const worldY = notePos.y + parentPos.y + CONTAINER_CONTENT_OFFSET_Y;

    const noteMap = notesMap.get(noteId);
    if (!noteMap) return;

    ydoc.transact(() => {
      const posMap = noteMap.get(YPAGE_NOTE_KEY.pos) as Y.Map<number>;
      posMap.set("x", worldX);
      posMap.set("y", worldY);
    });

    removeChildFromContainer(currentParentId, noteId);
  }

  return {
    noteIds,
    noteList,
    rootNoteList,
    arrowList,
    parentOf,
    createNoteAt,
    deleteNote,
    deleteArrow,
    createArrow,
    addChildToContainer,
    removeChildFromContainer,
    moveNoteIntoContainer,
    moveNoteOutOfContainer,
  };
}
