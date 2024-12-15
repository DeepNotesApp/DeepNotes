import 'highlight.js/styles/atom-one-dark.css';

import { columnResizing } from '@_ueberdosis/prosemirror-tables';
import CodeBlockLowlightExtension from '@tiptap/extension-code-block-lowlight';
import HighlightExtension from '@tiptap/extension-highlight';
import HorizontalRuleExtension from '@tiptap/extension-horizontal-rule';
import LinkExtension from '@tiptap/extension-link';
import SubscriptExtension from '@tiptap/extension-subscript';
import SuperscriptExtension from '@tiptap/extension-superscript';
import TableExtension from '@tiptap/extension-table';
import TableCellExtension from '@tiptap/extension-table-cell';
import TableHeaderExtension from '@tiptap/extension-table-header';
import TableRowExtension from '@tiptap/extension-table-row';
import TaskListExtension from '@tiptap/extension-task-list';
import TextAlignExtension from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/vue-3';
import { once } from 'lodash';
import { lowlight } from 'lowlight/lib/common';
import { ImageResizeExtension } from 'src/code/areas/tiptap/image-resize/extension';
import { InlineMathExtension } from 'src/code/areas/tiptap/inline-math/extension';
import { MathBlockExtension } from 'src/code/areas/tiptap/math-block/extension';
import { ProsemirrorPasteHandlerPlugin } from 'src/code/areas/tiptap/paste-handler';
import { TaskItemExtension } from 'src/code/areas/tiptap/task-item';
import { YoutubeVideoExtension } from 'src/code/areas/tiptap/youtube-video/extension';

import { FindAndReplaceExtension } from './find-and-replace';

export const extensions = once(() => [
  StarterKit.configure({
    history: false,
    codeBlock: false,

    horizontalRule: false,

    heading: {
      levels: [1, 2, 3],
    },
  }),

  HorizontalRuleExtension.configure({
    HTMLAttributes: {
      draggable: 'false',
    },
  }),

  UnderlineExtension,

  TextAlignExtension.configure({
    types: ['heading', 'paragraph'],
  }),

  SubscriptExtension,
  SuperscriptExtension,

  LinkExtension.configure({
    openOnClick: false,
    HTMLAttributes: {
      draggable: 'false',
    },
  }),

  ImageResizeExtension.configure({
    inline: true,
    allowBase64: true,
  }),

  TaskListExtension,
  TaskItemExtension.configure({
    nested: true,
    onReadOnlyChecked: () => true,
  }),

  TableExtension.configure({
    resizable: true,
  }),
  TableRowExtension,
  TableHeaderExtension,
  TableCellExtension,

  CodeBlockLowlightExtension.configure({
    lowlight,
  }),

  InlineMathExtension,
  MathBlockExtension,

  HighlightExtension,

  YoutubeVideoExtension,

  FindAndReplaceExtension,

  Extension.create({
    addProseMirrorPlugins() {
      return [columnResizing({}), ProsemirrorPasteHandlerPlugin];
    },
  }),
]);
