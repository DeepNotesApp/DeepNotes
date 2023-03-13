import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import MathBlock from './MathBlock.vue';

export const MathBlockExtension = Node.create({
  name: 'MathBlock',

  group: 'block',

  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)];
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
