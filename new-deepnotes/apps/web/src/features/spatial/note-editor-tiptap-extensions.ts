import Collaboration from "@tiptap/extension-collaboration";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Highlight } from "@tiptap/extension-highlight";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { Image } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import * as Y from "yjs";

import {
  InlineMathTipTapExtension,
  MathBlockTipTapExtension,
} from "../pages/tiptap-math-extensions";
import { YoutubeVideoTipTapExtension } from "../pages/tiptap-youtube-extension";

const noteEditorLowlight = createLowlight(common);

export function createNoteEditorTipTapExtensions(opts: {
  fragment: Y.XmlFragment;
  placeholder?: string;
}) {
  const { fragment, placeholder = "Write something…" } = opts;
  return [
    StarterKit.configure({
      undoRedo: false,
      codeBlock: false,
      horizontalRule: false,
      heading: {
        levels: [1, 2, 3],
      },
      link: false,
      underline: false,
    }),
    HorizontalRule.configure({
      HTMLAttributes: {
        draggable: "false",
      },
    }),
    Underline,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Subscript,
    Superscript,
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: false,
      HTMLAttributes: {
        draggable: "false",
      },
    }),
    Highlight.configure({ multicolor: false }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({
      lowlight: noteEditorLowlight,
    }),
    InlineMathTipTapExtension,
    MathBlockTipTapExtension,
    YoutubeVideoTipTapExtension.configure({
      inline: true,
      width: 640,
      height: 360,
      controls: true,
    }),
    Placeholder.configure({ placeholder }),
    Collaboration.configure({
      fragment,
    }),
  ];
}

export const NOTE_EDITOR_TIPTAP_CLASS =
  "min-h-[1.5em] px-2 py-1 text-xs leading-relaxed focus:outline-none";
