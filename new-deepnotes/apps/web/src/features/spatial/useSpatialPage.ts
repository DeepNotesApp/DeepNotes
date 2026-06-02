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

import { marked } from "marked";

import { useContainerOps } from "./container-ops";
import { useNoteModel, type NoteModel } from "./note-model";
import { useArrowModel, type ArrowModel } from "./arrow-model";
import type { SpatialUndoRedo } from "./undo-redo";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";
import { applyNoteTemplate, applyArrowTemplate } from "./useSpatialPage-templates";
import { setNoteFragmentContent } from "./note-content-utils";
import { pastePayload, cloneSelection } from "./clipboard";

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
        applyNoteTemplate(note, template);
      }
    });

    undoRedo?.stopCapturing();
    refreshNoteIds();
    return id;
  }

  const {
    parentOf,
    addChildToContainer,
    removeChildFromContainer,
    moveNoteIntoContainer,
    moveNoteOutOfContainer,
    reverseChildren,
  } = useContainerOps(ydoc, noteList, noteModels);

  const rootNoteList = computed(() =>
    noteList.value.filter((n) => !parentOf.value.has(n.id)),
  );

  function deleteNote(noteId: string) {
    const noteMap = notesMap.get(noteId);
    if (noteMap?.get(YPAGE_NOTE_KEY.readOnly) === true) return;

    const parentId = parentOf.value.get(noteId);
    if (parentId) {
      removeChildFromContainer(parentId, noteId);
    }
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
        applyArrowTemplate(arrow, template);
      }
    });

    undoRedo?.stopCapturing();
    refreshArrowIds();
    return id;
  }

  function cloneNotes(
    noteEntries: { id: string; model: NoteModel }[],
    arrowEntries: { id: string; model: ArrowModel }[],
    offsetX = 20,
    offsetY = 20,
  ): { noteIds: string[]; arrowIds: string[] } {
    return cloneSelection(noteEntries, arrowEntries, {
      createNote: createNoteAt,
      createArrow,
      offsetX,
      offsetY,
    });
  }

  async function importChildrenFromFiles(
    containerId: string,
    files: File[],
  ): Promise<void> {
    const containerEntry = noteList.value.find((n) => n.id === containerId);
    if (!containerEntry) return;

    const containerPos = containerEntry.model.pos.value;

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const content = await file.text();

      // Create note at container position with small vertical offset so
      // imported notes don't all stack exactly on top of each other.
      const noteId = createNoteAt(
        containerPos.x,
        containerPos.y + i * 10,
      );

      // Enable container on the note so it can hold children
      const noteMap = notesMap.get(noteId);
      if (!noteMap) continue;

      ydoc.transact(() => {
        const headMap = noteMap.get(YPAGE_NOTE_KEY.head) as Y.Map<unknown>;
        headMap.set("enabled", true);

        const bodyMap = noteMap.get(YPAGE_NOTE_KEY.body) as Y.Map<unknown>;
        bodyMap.set("enabled", false);

        const containerMap = noteMap.get(
          YPAGE_NOTE_KEY.container,
        ) as Y.Map<unknown>;
        containerMap.set("enabled", false);
      });

      // Prepare HTML to insert
      let html: string;
      if (file.name.endsWith(".md")) {
        html = await marked.parse(content);
      } else {
        // Plain text: escape HTML and wrap in paragraph with <br> for newlines
        const escaped = content
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        html = `<p>${escaped}</p>`;
      }

      // Populate the head fragment
      const headMap = noteMap.get(YPAGE_NOTE_KEY.head) as Y.Map<unknown>;
      const fragment = headMap.get("value") as Y.XmlFragment;
      setNoteFragmentContent(fragment, html);

      // Move into target container
      moveNoteIntoContainer(noteId, containerId);
    }
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
    reverseChildren,
    importChildrenFromFiles,
    cloneNotes,
  };
}
