// MIT License

// Copyright (c) 2022 Jeet Mandaliya (Github Username: sereneinserenade)

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import type { Range } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import type { Node as ProsemirrorNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    find: {
      /**
       * @description Set find term in extension.
       */
      setFindTerm: (findTerm: string) => ReturnType;
    };
  }
}

interface TextNodesWithPosition {
  text: string;
  pos: number;
}

const getRegex = (
  s: string,
  disableRegex: boolean,
  caseSensitive: boolean,
): RegExp => {
  return RegExp(
    disableRegex ? s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') : s,
    caseSensitive ? 'gu' : 'gui',
  );
};

interface ProcessedFinds {
  decorationSet: DecorationSet;
  results: Range[];
}

function processFinds(
  doc: ProsemirrorNode,
  findTerm: RegExp,
  findResultClass: string,
): ProcessedFinds {
  const decorations: Decoration[] = [];
  let textNodesWithPosition: TextNodesWithPosition[] = [];
  const results: Range[] = [];

  let index = 0;

  if (!findTerm) {
    return { decorationSet: DecorationSet.empty, results: [] };
  }

  doc?.descendants((node, pos) => {
    if (node.isText) {
      if (textNodesWithPosition[index]) {
        textNodesWithPosition[index] = {
          text: textNodesWithPosition[index].text + node.text,
          pos: textNodesWithPosition[index].pos,
        };
      } else {
        textNodesWithPosition[index] = {
          text: `${node.text}`,
          pos,
        };
      }
    } else {
      index += 1;
    }
  });

  textNodesWithPosition = textNodesWithPosition.filter(Boolean);

  for (let i = 0; i < textNodesWithPosition.length; i += 1) {
    const { text, pos } = textNodesWithPosition[i];

    const matches = Array.from(text.matchAll(findTerm)).filter(([matchText]) =>
      matchText.trim(),
    );

    for (let j = 0; j < matches.length; j += 1) {
      const m = matches[j];

      if (m[0] === '') {
        break;
      }

      if (m.index !== undefined) {
        results.push({
          from: pos + m.index,
          to: pos + m.index + m[0].length,
        });
      }
    }
  }

  for (let i = 0; i < results.length; i += 1) {
    const r = results[i];
    decorations.push(
      Decoration.inline(r.from, r.to, { class: findResultClass }),
    );
  }

  return {
    decorationSet: DecorationSet.create(doc, decorations),
    results,
  };
}

export const findAndReplacePluginKey = new PluginKey('findAndReplace');

interface FindAndReplaceOptions {
  findResultClass: string;
  caseSensitive: boolean;
  disableRegex: boolean;
}

interface FindAndReplaceStorage {
  findTerm: string;
  results: Range[];
}

export const FindAndReplaceExtension = Extension.create<
  FindAndReplaceOptions,
  FindAndReplaceStorage
>({
  name: 'findAndReplace',

  addOptions() {
    return {
      findResultClass: 'find-result',
      caseSensitive: false,
      disableRegex: false,
    };
  },

  addCommands() {
    return {
      setFindTerm:
        (findTerm: string) =>
        ({ editor }) => {
          (editor.state as any).findAndReplace$.findTerm = findTerm;

          return false;
        },
    };
  },

  addProseMirrorPlugins() {
    const { findResultClass, disableRegex, caseSensitive } = this.options;

    return [
      new Plugin({
        key: findAndReplacePluginKey,
        state: {
          init: () => ({
            findTerm: '',
            lastFindTerm: '',
            results: [] as Range[],

            decorationSet: DecorationSet.empty,
          }),
          apply(tr, value) {
            if (!tr.docChanged && value.lastFindTerm === value.findTerm) {
              return value;
            }

            const newState = {
              ...value,

              lastFindTerm: value.findTerm,
            };

            if (!value.findTerm) {
              return {
                ...newState,

                results: [],

                decorationSet: DecorationSet.empty,
              };
            }

            const { decorationSet, results } = processFinds(
              tr.doc,
              getRegex(value.findTerm, disableRegex, caseSensitive),
              findResultClass,
            );

            return {
              ...newState,

              results: results,

              decorationSet,
            };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorationSet;
          },
        },
      }),
    ];
  },
});
