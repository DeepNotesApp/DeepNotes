import { mergeAttributes, Node, wrappingInputRule } from '@tiptap/vue-3';
import { once } from 'lodash';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

export interface TaskItemOptions {
  onReadOnlyChecked?: (node: ProseMirrorNode, checked: boolean) => boolean;
  nested: boolean;
  HTMLAttributes: Record<string, any>;
}

export const TaskItem = once(() =>
  Node.create<TaskItemOptions>({
    name: 'taskItem',

    addOptions() {
      return {
        nested: false,
        HTMLAttributes: {},
      };
    },

    content() {
      return this.options.nested ? 'paragraph block*' : 'paragraph+';
    },

    defining: true,

    addAttributes() {
      return {
        checked: {
          default: false,
          keepOnSplit: false,
          parseHTML: (element) =>
            element.getAttribute('data-checked') === 'true',
          renderHTML: (attributes) => ({
            'data-checked': attributes.checked,
          }),
        },
      };
    },

    parseHTML() {
      return [
        {
          tag: `li[data-type="${this.name}"]`,
          priority: 51,
        },
      ];
    },

    renderHTML({ node, HTMLAttributes }) {
      return [
        'li',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-type': this.name,
        }),
        [
          'label',
          [
            'input',
            {
              type: 'checkbox',
              checked: node.attrs.checked ? 'checked' : null,
            },
          ],
          ['span'],
        ],
        ['div', 0],
      ];
    },

    addKeyboardShortcuts() {
      const shortcuts = {
        Enter: () => this.editor.commands.splitListItem(this.name),
        'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
      };

      if (!this.options.nested) {
        return shortcuts;
      }

      return {
        ...shortcuts,
        Tab: () => this.editor.commands.sinkListItem(this.name),
      };
    },

    addNodeView() {
      return ({ node, HTMLAttributes }) => {
        const listItem = document.createElement('li');
        const checkboxWrapper = document.createElement('label');
        const checkboxStyler = document.createElement('span');
        const checkbox = document.createElement('input');
        const content = document.createElement('div');

        checkboxWrapper.contentEditable = 'false';
        checkbox.type = 'checkbox';
        checkbox.tabIndex = -1;

        checkbox.addEventListener('click', (event) => {
          event.preventDefault();
        });
        checkbox.addEventListener('dblclick', (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        checkbox.addEventListener('pointerdown', (event) => {
          event.stopPropagation();
        });

        Object.entries(this.options.HTMLAttributes).forEach(([key, value]) => {
          listItem.setAttribute(key, value);
        });

        listItem.dataset.checked = node.attrs.checked;
        if (node.attrs.checked) {
          checkbox.setAttribute('checked', 'checked');
        }

        checkboxWrapper.append(checkbox, checkboxStyler);
        listItem.append(checkboxWrapper, content);

        Object.entries(HTMLAttributes).forEach(([key, value]) => {
          listItem.setAttribute(key, value);
        });

        return {
          dom: listItem,
          contentDOM: content,
          update: (updatedNode) => {
            if (updatedNode.type !== this.type) {
              return false;
            }

            listItem.dataset.checked = updatedNode.attrs.checked;
            checkbox.checked = updatedNode.attrs.checked;

            return true;
          },
        };
      };
    },

    addInputRules() {
      return [
        wrappingInputRule({
          find: /^\s*(\[([( |x])?\])\s$/,
          type: this.type,
          getAttributes: (match) => ({
            checked: match[match.length - 1] === 'x',
          }),
        }),
      ];
    },
  }),
);
