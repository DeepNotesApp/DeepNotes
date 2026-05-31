import { useEditor } from "@tiptap/vue-3";
import { onBeforeUnmount } from "vue";
import * as Y from "yjs";

import {
  createNoteEditorTipTapExtensions,
  NOTE_EDITOR_TIPTAP_CLASS,
} from "./note-editor-tiptap-extensions";

export function useNoteEditor(opts: {
  fragment: Y.XmlFragment;
  editable?: boolean;
  placeholder?: string;
}) {
  const { fragment, editable = true, placeholder } = opts;

  const editor = useEditor({
    extensions: createNoteEditorTipTapExtensions({ fragment, placeholder }),
    editorProps: {
      attributes: {
        class: NOTE_EDITOR_TIPTAP_CLASS,
      },
    },
    editable,
  });

  onBeforeUnmount(() => {
    const ed = editor.value;
    if (ed != null && !ed.isDestroyed) {
      ed.destroy();
    }
  });

  return {
    editor,
  };
}
