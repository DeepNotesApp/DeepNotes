import { Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import NodeView from './NodeView.vue';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineMath: {
      addInlineMath: () => ReturnType;
    };
  }
}

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

  addCommands() {
    return {
      addInlineMath:
        () =>
        ({ commands, state }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              input: state.doc.textBetween(
                state.selection.from,
                state.selection.to,
              ),
            },
          }),
    };
  },
});
