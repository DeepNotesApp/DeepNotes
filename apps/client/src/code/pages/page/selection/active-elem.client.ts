import type { ComputedRef, UnwrapNestedRefs } from 'vue';

import type { PageArrow } from '../arrows/arrow.client';
import type { PageElem } from '../elems/elem.client';
import type { ElemType } from '../elems/elem.client';
import type { PageNote } from '../notes/note.client';
import type { Page } from '../page.client';

export interface IActiveElemReact {
  id?: string;
  type?: ElemType;

  value: ComputedRef<PageNote | PageArrow | null>;

  exists: ComputedRef<boolean>;
}

export class PageActiveElem {
  readonly page: Page;

  readonly react: UnwrapNestedRefs<IActiveElemReact>;

  constructor({ page }: { page: Page }) {
    this.page = page;

    this.react = reactive({
      value: computed((): PageNote | PageArrow | null => {
        if (this.react.id == null || this.react.type == null) {
          return null;
        }

        const elems = this.page[`${this.react.type}s`];
        const activeElem = elems.react.map[this.react.id] ?? null;

        if (activeElem == null) {
          return null;
        }

        return activeElem;
      }),

      exists: computed(() => this.react.value != null),
    });
  }

  is(elemId: string) {
    return elemId === this.react.id;
  }

  set(elem: PageElem | null) {
    if (elem?.type === 'note') {
      (elem as PageNote).bringToTop();
    }

    if (this.react.value != null) {
      this.react.value.react.active = false;
    }

    const oldElemId = this.react.id;

    this.react.id = elem?.id;
    this.react.type = elem?.type;

    if (elem == null) {
      return;
    }

    elem.react.active = true;

    if (this.react.id === oldElemId) {
      return;
    }

    this.page.selection.add(elem);
  }

  clear() {
    this.set(null);
  }
}
