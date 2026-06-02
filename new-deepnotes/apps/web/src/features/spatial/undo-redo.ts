import * as Y from "yjs";
import { getNotesMap, getArrowsMap, getPageMap, getNoteIds, getArrowIds, getNextZIndex } from "@deepnotes/collab-wire";

export type SpatialUndoRedo = ReturnType<typeof useSpatialUndoRedo>;

function addTypeToScope(um: Y.UndoManager, type: Y.AbstractType<any>): void {
  um.addToScope(type);
  if (type instanceof Y.Map) {
    type.forEach((value) => {
      if (value instanceof Y.AbstractType) {
        addTypeToScope(um, value);
      }
    });
  } else if (type instanceof Y.Array) {
    type.forEach((value) => {
      if (value instanceof Y.AbstractType) {
        addTypeToScope(um, value);
      }
    });
  }
}

export function useSpatialUndoRedo(ydoc: Y.Doc) {
  // Eagerly create lazy structures so they don't appear as undoable
  // mutations when useSpatialPage first accesses them.
  getNoteIds(ydoc);
  getArrowIds(ydoc);
  getNextZIndex(ydoc);

  const notesMap = getNotesMap(ydoc);
  const arrowsMap = getArrowsMap(ydoc);
  const pageMap = getPageMap(ydoc);

  const undoManager = new Y.UndoManager([notesMap, arrowsMap, pageMap], {
    captureTimeout: 500,
  });

  function undo() {
    if (undoManager.undoStack.length > 0) {
      undoManager.undo();
    }
  }

  function redo() {
    if (undoManager.redoStack.length > 0) {
      undoManager.redo();
    }
  }

  function canUndo(): boolean {
    return undoManager.undoStack.length > 0;
  }

  function canRedo(): boolean {
    return undoManager.redoStack.length > 0;
  }

  function stopCapturing() {
    undoManager.stopCapturing();
  }

  function registerNote(noteMap: Y.Map<unknown>): void {
    addTypeToScope(undoManager, noteMap);
  }

  function registerArrow(arrowMap: Y.Map<unknown>): void {
    addTypeToScope(undoManager, arrowMap);
  }

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    stopCapturing,
    registerNote,
    registerArrow,
    _undoManager: undoManager,
  };
}
