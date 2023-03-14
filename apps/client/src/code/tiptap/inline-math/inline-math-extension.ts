import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import InlineMath from './InlineMath.vue';

export const InlineMathExtension = Node.create({
  name: 'InlineMath',

  group: 'inline',
  content: 'text*',

  marks: '',

  atom: true,
  inline: true,
  defining: true,
  isolating: true,
  code: true,

  addAttributes() {
    return {
      content: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span.inline-math' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'inline-math' })];
  },

  addNodeView() {
    return VueNodeViewRenderer(InlineMath);
  },

  addCommands(): any {
    return {
      addInlineMath:
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
