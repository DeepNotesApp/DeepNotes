import { Awareness } from "y-protocols/awareness";
import { createPageYDoc } from "@deepnotes/collab-wire";

export function createPageCollabDoc() {
  const ydoc = createPageYDoc();
  const collabAwareness = new Awareness(ydoc);
  const collabCaretProvider = { awareness: collabAwareness };

  return {
    ydoc,
    collabAwareness,
    collabCaretProvider,
  };
}
