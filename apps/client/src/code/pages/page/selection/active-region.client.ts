import type { ComputedRef, UnwrapNestedRefs } from 'vue';

import type { Page } from '../page.client';
import type { PageRegion } from '../regions/region.client';

export interface IActiveRegionReact {
  id: string;

  value: ComputedRef<PageRegion>;
}

export class PageActiveRegion {
  readonly page: Page;

  readonly react: UnwrapNestedRefs<IActiveRegionReact>;

  constructor({ page }: { page: Page }) {
    this.page = page;

    this.react = reactive({
      id: this.page.id,

      value: computed(() => this.page.regions.fromId(this.react.id)),
    });
  }
}
