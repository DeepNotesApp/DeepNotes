import { Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import MathBlock from './MathBlock.vue';

export const MathBlockExtension = Node.create({
  name: 'mathBlock',

  group: 'block',

  marks: '',

  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      input: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'math-block',
        getAttrs: (elem) => ({ input: (elem as any).innerText }),
      },
    ];
  },

  renderHTML({ HTMLAttributes: { input } }) {
    return ['math-block', input];
  },
  renderText({ node }) {
    return `$$\n${node.attrs.input}\n$$\n\n`;
  },

  addNodeView() {
    return VueNodeViewRenderer(MathBlock);
  },

  addCommands(): any {
    return {
      addMathBlock:
        (attrs: any) =>
        ({ state, dispatch }: any) => {
          const { selection } = state;
          const position = selection.$cursor
            ? selection.$cursor.pos
            : selection.$to.pos;
          const node = this.type.create(attrs);
          const transaction = state.tr.insert(position, node);

          dispatch(transaction);
        },
    };
  },
});
