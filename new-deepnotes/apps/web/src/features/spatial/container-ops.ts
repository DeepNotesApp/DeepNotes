import { computed, type ComputedRef } from "vue";
import * as Y from "yjs";
import { getNotesMap, YPAGE_NOTE_KEY } from "@deepnotes/collab-wire";

import { CONTAINER_CONTENT_OFFSET_Y } from "./spatial-constants";
import type { NoteModel } from "./note-model";

export function useContainerOps(
  ydoc: Y.Doc,
  noteList: ComputedRef<{ id: string; model: NoteModel }[]>,
  noteModels: Map<string, NoteModel>,
) {
  const notesMap = getNotesMap(ydoc);

  const parentOf = computed(() => {
    const map = new Map<string, string>();
    for (const { id, model } of noteList.value) {
      for (const childId of model.container.children.value) {
        map.set(childId, id);
      }
    }
    return map;
  });

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

  function moveNoteIntoContainer(noteId: string, containerId: string): void {
    if (noteId === containerId) return;

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

    const currentParentId = parentOf.value.get(noteId);
    if (currentParentId) {
      removeChildFromContainer(currentParentId, noteId);
    }

    const noteEntry = noteList.value.find((n) => n.id === noteId);
    const containerEntry = noteList.value.find((n) => n.id === containerId);
    if (!noteEntry || !containerEntry) return;

    const notePos = noteEntry.model.pos.value;
    const containerPos = containerEntry.model.pos.value;

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
    const parentEntry = noteList.value.find(
      (n) => n.id === currentParentId,
    );
    if (!noteEntry || !parentEntry) return;

    const notePos = noteEntry.model.pos.value;
    const parentPos = parentEntry.model.pos.value;

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

  function reverseChildren(containerId: string): void {
    const containerNote = notesMap.get(containerId);
    if (!containerNote) return;
    const containerMap = containerNote.get(
      YPAGE_NOTE_KEY.container,
    ) as Y.Map<unknown>;
    const childrenArr = containerMap.get("children") as Y.Array<string>;
    const length = childrenArr.length;
    if (length < 2) return;

    const children = childrenArr.toArray();
    ydoc.transact(() => {
      childrenArr.delete(0, length);
      childrenArr.push(children.reverse());
    });
  }

  return {
    parentOf,
    addChildToContainer,
    removeChildFromContainer,
    moveNoteIntoContainer,
    moveNoteOutOfContainer,
    reverseChildren,
  };
}
