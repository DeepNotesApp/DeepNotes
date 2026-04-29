import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

import { Y_FRAG_PROSEMIRROR } from "./page-editor-constants";

export function createPageEditorTipTapExtensions(opts: {
  ydoc: Y.Doc;
  collabCaretProvider: { awareness: Awareness };
}) {
  const { ydoc, collabCaretProvider } = opts;
  return [
    StarterKit.configure({
      undoRedo: false,
    }),
    Underline,
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: false,
    }),
    Placeholder.configure({
      placeholder: "Write something…",
    }),
    Collaboration.configure({
      document: ydoc,
      field: Y_FRAG_PROSEMIRROR,
    }),
    CollaborationCaret.configure({
      provider: collabCaretProvider,
      user: {
        name: "You",
        color: "#64748b",
      },
    }),
  ];
}

export const PAGE_EDITOR_TIPTAP_CLASS =
  "max-w-none min-h-40 px-3 py-2 text-sm leading-relaxed focus:outline-none";
