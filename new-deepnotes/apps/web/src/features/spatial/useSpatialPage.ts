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
import type { SpatialUndoRedo } from "./undo-redo";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";

export type SpatialPage = ReturnType<typeof useSpatialPage>;

export function useSpatialPage(ydoc: Y.Doc, undoRedo?: SpatialUndoRedo) {
  const notesMap = getNotesMap(ydoc);
  const noteIdsArr = getNoteIds(ydoc);

  const noteIds = ref<string[]>(noteIdsArr.toArray());

  const noteModels = new Map<string, NoteModel>();
  function getNoteModel(id: string): NoteModel | undefined {
    let model = noteModels.get(id);
    if (!model) {
      const noteMap = notesMap.get(id);
      if (noteMap) {
        model = useNoteModel(noteMap);
        noteModels.set(id, model);
      }
    }
    return model;
  }

  const noteList = computed<{ id: string; model: NoteModel }[]>(() => {
    const result: { id: string; model: NoteModel }[] = [];
    for (const id of noteIds.value) {
      const model = getNoteModel(id);
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

  function createNoteAt(
    worldX: number,
    worldY: number,
    template?: Partial<ClipboardNote> | null,
  ): string {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const note = addNoteToPage(ydoc, id);
    undoRedo?.registerNote(note);

    ydoc.transact(() => {
      const pos = note.get(YPAGE_NOTE_KEY.pos) as Y.Map<number>;
      pos.set("x", worldX);
      pos.set("y", worldY);

      if (template) {
        if (template.width) {
          const widthMap = note.get(YPAGE_NOTE_KEY.width) as Y.Map<string>;
          widthMap.set("expanded", template.width.expanded);
          widthMap.set("collapsed", template.width.collapsed);
        }
        if (template.head) {
          const headMap = note.get(YPAGE_NOTE_KEY.head) as Y.Map<unknown>;
          headMap.set("enabled", template.head.enabled);
          headMap.set("wrap", template.head.wrap);
          const headHeightMap = (headMap.get("height") as Y.Map<string>);
          headHeightMap.set("expanded", template.head.height.expanded);
          headHeightMap.set("collapsed", template.head.height.collapsed);
        }
        if (template.body) {
          const bodyMap = note.get(YPAGE_NOTE_KEY.body) as Y.Map<unknown>;
          bodyMap.set("enabled", template.body.enabled);
          bodyMap.set("wrap", template.body.wrap);
          const bodyHeightMap = (bodyMap.get("height") as Y.Map<string>);
          bodyHeightMap.set("expanded", template.body.height.expanded);
          bodyHeightMap.set("collapsed", template.body.height.collapsed);
        }
        if (template.container) {
          const containerMap = note.get(YPAGE_NOTE_KEY.container) as Y.Map<unknown>;
          containerMap.set("enabled", template.container.enabled);
          containerMap.set("spatial", template.container.spatial);
          containerMap.set("horizontal", template.container.horizontal);
          containerMap.set("wrapChildren", template.container.wrapChildren);
          containerMap.set("stretchChildren", template.container.stretchChildren);
          containerMap.set("forceColorInheritance", template.container.forceColorInheritance);
        }
        if (template.collapsing) {
          const collapsingMap = note.get(YPAGE_NOTE_KEY.collapsing) as Y.Map<boolean>;
          collapsingMap.set("enabled", template.collapsing.enabled);
          collapsingMap.set("collapsed", template.collapsing.collapsed);
          collapsingMap.set("localCollapsing", template.collapsing.localCollapsing);
        }
        if (template.color) {
          const colorMap = note.get(YPAGE_NOTE_KEY.color) as Y.Map<unknown>;
          colorMap.set("inherit", template.color.inherit);
          colorMap.set("value", template.color.value);
        }
        if (template.zIndex !== undefined) {
          note.set(YPAGE_NOTE_KEY.zIndex, template.zIndex);
        }
        if (template.link !== undefined) {
          note.set(YPAGE_NOTE_KEY.link, template.link);
        }
        if (template.movable !== undefined) {
          note.set(YPAGE_NOTE_KEY.movable, template.movable);
        }
        if (template.resizable !== undefined) {
          note.set(YPAGE_NOTE_KEY.resizable, template.resizable);
        }
        if (template.readOnly !== undefined) {
          note.set(YPAGE_NOTE_KEY.readOnly, template.readOnly);
        }
        if (template.anchor) {
          const anchorMap = note.get(YPAGE_NOTE_KEY.anchor) as Y.Map<number>;
          anchorMap.set("x", template.anchor.x);
          anchorMap.set("y", template.anchor.y);
        }
        if (template.createdAt !== undefined) {
          note.set(YPAGE_NOTE_KEY.createdAt, template.createdAt);
        }
        if (template.editedAt !== undefined) {
          note.set(YPAGE_NOTE_KEY.editedAt, template.editedAt);
        }
        if (template.movedAt !== undefined) {
          note.set(YPAGE_NOTE_KEY.movedAt, template.movedAt);
        }
      }
    });

    undoRedo?.stopCapturing();
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
    const noteMap = notesMap.get(noteId);
    if (noteMap?.get(YPAGE_NOTE_KEY.readOnly) === true) return;

    // Remove from parent container if nested
    const parentId = parentOf.value.get(noteId);
    if (parentId) {
      removeChildFromContainer(parentId, noteId);
    }
    // Delete children recursively
    const model = noteModels.get(noteId) ?? getNoteModel(noteId);
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
    const model = arrowModels.get(arrowId);
    if (model?.readOnly.value) return;

    removeArrowFromPage(ydoc, arrowId);
    arrowModels.delete(arrowId);
    refreshArrowIds();
  }

  function createArrow(
    sourceId: string,
    targetId: string,
    template?: Partial<ClipboardArrow> | null,
  ): string {
    const id = `arrow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const arrow = addArrowToPage(ydoc, id);
    undoRedo?.registerArrow(arrow);

    ydoc.transact(() => {
      arrow.set("source", sourceId);
      arrow.set("target", targetId);

      if (template) {
        if (template.sourceAnchor !== undefined) {
          arrow.set("sourceAnchor", template.sourceAnchor);
        }
        if (template.targetAnchor !== undefined) {
          arrow.set("targetAnchor", template.targetAnchor);
        }
        if (template.sourceHead !== undefined) {
          arrow.set("sourceHead", template.sourceHead);
        }
        if (template.targetHead !== undefined) {
          arrow.set("targetHead", template.targetHead);
        }
        if (template.bodyType !== undefined) {
          arrow.set("bodyType", template.bodyType);
        }
        if (template.bodyStyle !== undefined) {
          arrow.set("bodyStyle", template.bodyStyle);
        }
        if (template.color !== undefined) {
          arrow.set("color", template.color);
        }
        if (template.readOnly !== undefined) {
          arrow.set("readOnly", template.readOnly);
        }
        if (template.interregional !== undefined) {
          arrow.set("interregional", template.interregional);
        }
        if (template.fakePos !== undefined) {
          arrow.set("fakePos", template.fakePos);
        }
        if (template.looseEndpoint !== undefined) {
          arrow.set("looseEndpoint", template.looseEndpoint);
        }
        if (template.createdAt !== undefined) {
          arrow.set("createdAt", template.createdAt);
        }
        if (template.editedAt !== undefined) {
          arrow.set("editedAt", template.editedAt);
        }
      }
    });

    undoRedo?.stopCapturing();
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
