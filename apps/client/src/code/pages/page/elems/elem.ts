import { once } from 'lodash';
import type { ComputedRef, UnwrapNestedRefs } from 'vue';
import { z } from 'zod';

import { wrapSlim } from '../../slim';
import { IArrowCollabDefault } from '../arrows/arrow';
import { INoteCollabDefault } from '../notes/note-collab';
import type { Page } from '../page';
import type { PageRegion } from '../regions/region';

export type ElemType = 'note' | 'arrow';

export const IElemCollab = once(() =>
  z.object({
    regionId: z.string().nullable().default(null),
  }),
);
export type IElemCollab = z.infer<ReturnType<typeof IElemCollab>>;

export interface IElemReact {
  collab: ComputedRef<IElemCollab>;

  region: ComputedRef<PageRegion>;

  visible: ComputedRef<boolean>;

  active: boolean;
  selected: boolean;
  editing: boolean;

  index: number;
}

export const PageElem = once(
  () =>
    class {
      readonly page: Page;

      readonly id: string;
      type!: ElemType;

      readonly react: UnwrapNestedRefs<IElemReact>;

      private readonly _collab?: IElemCollab;

      constructor({
        page,
        id,
        index,
        collab,
      }: {
        page: Page;
        id: string;
        index: number;
        collab?: IElemCollab;
      }) {
        this.page = page;

        this.id = id;

        this._collab = collab;

        this.react = reactive({
          collab: computed(() => {
            if (this._collab != null) {
              return this._collab;
            }

            const collab = this.page[`${this.type}s`].react.collab[this.id];

            if (collab == null) {
              return undefined as any;
            }

            if (this.type === 'note') {
              return wrapSlim(collab, INoteCollabDefault());
            } else {
              return wrapSlim(collab, IArrowCollabDefault());
            }
          }),

          region: computed(
            () => this.page.regions.fromId(this.react.collab?.regionId!)!,
          ),

          visible: computed(() => {
            if (this.react.region.type === 'page') {
              return true;
            }

            if (!this.react.region.react.container.visible) {
              return false;
            }

            return this.react.region.react.visible;
          }),

          index,

          active: this.page.activeElem.is(this.id),
          selected: this.page.selection.has(this),
          editing: this.page.editing.react.elemId === this.id,
        });
      }
    },
);
export type PageElem = InstanceType<ReturnType<typeof PageElem>>;
