import { watchUntilTrue } from '@stdlib/vue';
import type { Editor } from '@tiptap/vue-3';
import type { ComputedRef, UnwrapNestedRefs } from 'vue';

import type { PageArrow } from '../arrows/arrow';
import type { NoteTextSection } from '../notes/note';
import type { PageNote } from '../notes/note';
import type { Page } from '../page';

export interface IEditingReact {
  elemId: string | null;

  elem: ComputedRef<PageNote | PageArrow | null>;
  active: ComputedRef<boolean>;
  section?: NoteTextSection;
  editor: ComputedRef<Editor | null>;
}

export class PageEditing {
  readonly page: Page;

  readonly react: UnwrapNestedRefs<IEditingReact>;

  constructor({ page }: { page: Page }) {
    this.page = page;

    this.react = reactive({
      elemId: null,

      elem: computed(
        () =>
          this.page.notes.fromId(this.react.elemId) ??
          this.page.arrows.fromId(this.react.elemId),
      ),

      active: computed(() => this.react.elem != null),

      editor: computed(() => {
        if (this.react.elem?.type === 'note') {
          return this.react.elem.react[this.react.section!].editor;
        } else if (this.react.elem?.type === 'arrow') {
          return this.react.elem.react.editor;
        } else {
          return null;
        }
      }),
    });
  }

  async start(elem: PageNote | PageArrow, section?: NoteTextSection) {
    if (this.react.elemId === elem.id) {
      return;
    }

    if (this.react.active) {
      this.stop();
    }

    if (this.page.react.readOnly || elem.react.collab.readOnly) {
      return;
    }

    elem.react.editing = true;

    this.react.elemId = elem.id;

    if (elem.type === 'note') {
      if (section != null) {
        this.react.section = section;
      } else if (elem.react.topSection !== 'container') {
        this.react.section = elem.react.topSection;
      }
    }

    this.page.selection.set(elem);

    await nextTick();
    await watchUntilTrue(() => elem.react.loaded);

    this.page.selection.set(elem);

    for (const editor of elem.react.editors) {
      editor.setEditable(true);
    }

    this.react.editor?.commands.focus('all', { scrollIntoView: false });
  }

  stop() {
    if (this.react.elem == null) {
      return;
    }

    for (const editor of this.react.elem.react.editors) {
      editor.commands.blur();

      editor.setEditable(false);
    }

    this.react.elem.react.editing = false;

    this.react.elemId = null;
  }
}
