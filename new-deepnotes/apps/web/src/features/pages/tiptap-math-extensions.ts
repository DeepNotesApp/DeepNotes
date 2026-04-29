import { Node, type NodeViewRenderer } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

import InlineMathNodeView from "./InlineMathNodeView.vue";
import MathBlockNodeView from "./MathBlockNodeView.vue";

/** TipTap `Node.create` types may resolve to the parent monorepo's `@tiptap/core` while Vue views use v3 — align at compile time. */
function vueNodeView(
  component: Parameters<typeof VueNodeViewRenderer>[0],
): NodeViewRenderer {
  return VueNodeViewRenderer(component) as unknown as NodeViewRenderer;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineMath: {
      addInlineMath: () => ReturnType;
    };
    mathBlock: {
      addMathBlock: () => ReturnType;
    };
  }
}

export const InlineMathTipTapExtension = Node.create({
  name: "inlineMath",

  group: "inline",

  atom: true,
  inline: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      input: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "inline-math",
        getAttrs: (el) => ({
          input: (el as HTMLElement).textContent?.trim() ?? "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return ["inline-math", {}, node.attrs.input ?? ""];
  },

  renderText({ node }) {
    return `$${node.attrs.input}$`;
  },

  addNodeView() {
    return vueNodeView(InlineMathNodeView);
  },

  addCommands() {
    return {
      addInlineMath:
        () =>
          ({ commands, state }) =>
            commands.insertContent({
              type: this.name,
              attrs: {
                input: state.doc.textBetween(state.selection.from, state.selection.to),
              },
            }),
    };
  },
});

export const MathBlockTipTapExtension = Node.create({
  name: "mathBlock",

  group: "block",

  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      input: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "math-block",
        getAttrs: (el) => ({
          input: (el as HTMLElement).textContent?.trim() ?? "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return ["math-block", {}, node.attrs.input ?? ""];
  },

  renderText({ node }) {
    return `\n$$\n${node.attrs.input}\n$$\n\n`;
  },

  addNodeView() {
    return vueNodeView(MathBlockNodeView);
  },

  addCommands() {
    return {
      addMathBlock:
        () =>
          ({ commands, state }) =>
            commands.insertContent({
              type: this.name,
              attrs: {
                input: state.doc.textBetween(state.selection.from, state.selection.to),
              },
            }),
    };
  },
});
