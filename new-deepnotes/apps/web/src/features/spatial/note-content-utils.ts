import { Editor } from "@tiptap/core";
import * as Y from "yjs";

import { createNoteEditorTipTapExtensions } from "./note-editor-tiptap-extensions";

/**
 * Populate a note's Y.XmlFragment with HTML content using a temporary
 * Tiptap Editor. The editor is created, content is set, and the editor is
 * immediately destroyed so the fragment retains the structured document.
 */
export function setNoteFragmentContent(
  fragment: Y.XmlFragment,
  html: string,
): void {
  const editor = new Editor({
    extensions: createNoteEditorTipTapExtensions({ fragment }),
    editable: false,
  });
  editor.commands.setContent(html);
  editor.destroy();
}
