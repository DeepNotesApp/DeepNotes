import 'highlight.js/styles/atom-one-dark.css';

import { columnResizing } from '@_ueberdosis/prosemirror-tables';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/vue-3';
import { once } from 'lodash';
import { lowlight } from 'lowlight/lib/common';
import type { Fragment, Slice } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { TaskItem } from 'src/boot/tiptap/task-item.client';
import { ImageResizeExtension } from 'src/code/tiptap/image-resize/image-resize-extension';
import { InlineMathExtension } from 'src/code/tiptap/inline-math/inline-math-extension';
import { MathBlockExtension } from 'src/code/tiptap/math-block/math-block-extension';

export const extensions = once(() => [
  StarterKit.configure({
    history: false,
    codeBlock: false,

    horizontalRule: false,

    heading: {
      levels: [1, 2, 3],
    },
  }),

  HorizontalRule.configure({
    HTMLAttributes: {
      draggable: 'false',
    },
  }),

  Underline,

  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),

  Subscript,
  Superscript,

  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      draggable: 'false',
    },
  }),

  ImageResizeExtension().configure({
    inline: true,
    allowBase64: true,
  }),

  TaskList,
  TaskItem().configure({
    nested: true,
    onReadOnlyChecked: () => true,
  }),

  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,

  CodeBlockLowlight.configure({
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
                        mainLogger().error(error);
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
]);
