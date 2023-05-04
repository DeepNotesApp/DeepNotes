import { Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import NodeView from './NodeView.vue';

export const InlineMathExtension = Node.create({
  name: 'inlineMath',

  group: 'inline',

  marks: '',

  atom: true,
  inline: true,
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
        tag: 'inline-math',
        getAttrs: (elem) => ({ input: (elem as any).innerText }),
      },
    ];
  },

  renderHTML({ HTMLAttributes: { input } }) {
    return ['inline-math', input];
  },
  renderText({ node }) {
    return `$${node.attrs.input}$`;
  },

  addNodeView() {
    return VueNodeViewRenderer(NodeView);
  },

  addCommands(): any {
    return {
      addInlineMath:
        (options: any) =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    };
  },
});
