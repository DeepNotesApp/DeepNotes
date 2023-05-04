import { Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import NodeView from './NodeView.vue';

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
    return VueNodeViewRenderer(NodeView);
  },

  addCommands(): any {
    return {
      addMathBlock:
        (options: any) =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    };
  },
});
