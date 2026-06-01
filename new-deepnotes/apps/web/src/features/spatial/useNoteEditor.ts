import { useEditor } from "@tiptap/vue-3";
import { onBeforeUnmount, watch } from "vue";
import * as Y from "yjs";

import {
  createNoteEditorTipTapExtensions,
  NOTE_EDITOR_TIPTAP_CLASS,
} from "./note-editor-tiptap-extensions";
import { registerNoteEditor } from "./note-editor-registry";

export function useNoteEditor(opts: {
  fragment: Y.XmlFragment;
  editable?: boolean;
  placeholder?: string;
  noteId?: string;
  section?: "head" | "body" | "label";
}) {
  const { fragment, editable = true, placeholder, noteId, section = "body" } = opts;

  const editor = useEditor({
    extensions: createNoteEditorTipTapExtensions({ fragment, placeholder }),
    editorProps: {
      attributes: {
        class: NOTE_EDITOR_TIPTAP_CLASS,
      },
    },
    editable,
  });

  let unregister: (() => void) | null = null;

  watch(
    () => editor.value,
    (ed) => {
      if (ed && noteId) {
        unregister?.();
        unregister = registerNoteEditor(noteId, section, ed);
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    unregister?.();
    const ed = editor.value;
    if (ed != null && !ed.isDestroyed) {
      ed.destroy();
    }
  });

  return {
    editor,
  };
}
