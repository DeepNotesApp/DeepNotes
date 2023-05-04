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
import type { Fragment, Slice } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { TaskItemExtension } from 'src/boot/tiptap/task-item.client';
import { ImageResizeExtension } from 'src/code/tiptap/image-resize/image-resize-extension';
import { InlineMathExtension } from 'src/code/tiptap/inline-math/inline-math-extension';
import { MathBlockExtension } from 'src/code/tiptap/math-block/math-block-extension';
import { YoutubeVideoExtension } from 'src/code/tiptap/youtube-video/extension';

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

  ImageResizeExtension().configure({
    inline: true,
    allowBase64: true,
  }),

  TaskListExtension,
  TaskItemExtension().configure({
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

  Extension.create({
    addProseMirrorPlugins() {
      return [
        columnResizing({}),

        new Plugin({
          props: {
            handlePaste(view: EditorView, event: ClipboardEvent, slice: Slice) {
              async function embedImages(content: Fragment) {
                const promises: Promise<any>[] = [];

                content.forEach((node) => {
                  promises.push(
                    (async () => {
                      try {
                        if (node.type.name === 'image') {
                          if (node.attrs.src.startsWith('data:image')) {
                            return;
                          }

                          let imageBlob: Blob | undefined;

                          if (event.clipboardData!.files.length > 0) {
                            imageBlob = event.clipboardData!.files[0];
                          }

                          if (imageBlob == null) {
                            const response = await fetch(node.attrs.src);

                            imageBlob = await response.blob();
                          }

                          const reader = new FileReader();

                          await new Promise<void>((resolve) => {
                            reader.addEventListener('loadend', (event) => {
                              (node.attrs as any).src = event.target!.result;

                              resolve();
                            });

                            reader.readAsDataURL(imageBlob!);
                          });
                        } else {
                          await embedImages(node.content);
                        }
                      } catch (error) {
                        mainLogger.error(error);
                      }
                    })(),
                  );
                });

                await Promise.all(promises);
              }

              void embedImages(slice.content).then(() => {
                const { state } = view;
                const { tr } = state;

                view.dispatch(tr.replaceSelection(slice).scrollIntoView());
              });

              return true;
            },
          },
        }),
      ];
    },
  }),

  InlineMathExtension,
  MathBlockExtension,

  HighlightExtension,

  YoutubeVideoExtension,
]);
