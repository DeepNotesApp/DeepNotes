import { useEditor } from "@tiptap/vue-3";
import * as Y from "yjs";
import { onBeforeUnmount, ref, watch } from "vue";
import {
  createPageEditorTipTapExtensions,
  PAGE_EDITOR_TIPTAP_CLASS,
} from "./page-editor-tiptap-extensions";

export function usePageEditor(opts: {
  ydoc: Y.Doc;
  collabCaretProvider: { awareness: import("y-protocols/awareness").Awareness };
  schedulePush: () => void;
  syncServerDocToYdoc: () => void;
}) {
  const { ydoc, collabCaretProvider, schedulePush, syncServerDocToYdoc } = opts;

  const legacyPlainToImport = ref<string | null>(null);
  const hydrating = ref(false);
  const yStateBytes = ref(0);

  const editor = useEditor({
    extensions: createPageEditorTipTapExtensions({ ydoc, collabCaretProvider }),
    editorProps: {
      attributes: {
        class: PAGE_EDITOR_TIPTAP_CLASS,
      },
    },
    onUpdate() {
      refreshYMetrics();
      if (!hydrating.value) {
        schedulePush();
      }
    },
    editable: false,
  });

  const ydocUpdateHandler = (_update: Uint8Array, origin: unknown) => {
    if (origin === "collab-ws-remote" || origin === "collab-hydrate") {
      return;
    }
    refreshYMetrics();
    if (!hydrating.value) {
      schedulePush();
    }
  };
  ydoc.on("updateV2", ydocUpdateHandler);

  function refreshYMetrics() {
    yStateBytes.value = Y.encodeStateAsUpdateV2(ydoc).byteLength;
  }

  function setEditorEditable(on: boolean) {
    const ed = editor.value;
    if (ed != null && !ed.isDestroyed) {
      ed.setEditable(on);
    }
  }

  watch(
    [editor, legacyPlainToImport],
    () => {
      const ed = editor.value;
      const t = legacyPlainToImport.value;
      if (ed == null || ed.isDestroyed || t == null) {
        return;
      }
      ed.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: t.length > 0 ? [{ type: "text", text: t }] : [],
          },
        ],
      });
      legacyPlainToImport.value = null;
      syncServerDocToYdoc();
      refreshYMetrics();
    },
    { flush: "post" },
  );

  onBeforeUnmount(() => {
    ydoc.off("updateV2", ydocUpdateHandler);
    const ed = editor.value;
    if (ed != null && !ed.isDestroyed) {
      ed.destroy();
    }
  });

  return {
    editor,
    legacyPlainToImport,
    hydrating,
    yStateBytes,
    refreshYMetrics,
    setEditorEditable,
  };
}
