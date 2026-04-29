import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

export function createPageCollabDoc() {
  const ydoc = new Y.Doc();
  const collabAwareness = new Awareness(ydoc);
  const collabCaretProvider = { awareness: collabAwareness };

  return {
    ydoc,
    collabAwareness,
    collabCaretProvider,
  };
}
