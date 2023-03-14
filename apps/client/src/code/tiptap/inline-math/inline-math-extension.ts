import '@benrbray/prosemirror-math/style/math.css';
import 'katex/dist/katex.min.css';

import {
  makeInlineMathInputRule,
  mathPlugin,
  REGEX_INLINE_MATH_DOLLARS,
} from '@benrbray/prosemirror-math';
import { mergeAttributes, Node } from '@tiptap/vue-3';
import { inputRules } from 'prosemirror-inputrules';

export const regex = /(?:^|\s)((?:\$)((?:[^*]+))(?:\$))$/;

export const InlineMathExtension = Node.create({
  name: 'math_inline',
  group: 'inline math',
  content: 'text*', // important!

  marks: '',

  inline: true, // important!
  atom: true, // important!
  code: true,

  parseHTML() {
    return [{ tag: 'math-inline' }]; // important!
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'math-inline',
      mergeAttributes({ class: 'math-node' }, HTMLAttributes),
      0,
    ];
  },

  addProseMirrorPlugins() {
    const inputRulePlugin = inputRules({
      rules: [makeInlineMathInputRule(REGEX_INLINE_MATH_DOLLARS, this.type)],
    });

    return [mathPlugin, inputRulePlugin];
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
