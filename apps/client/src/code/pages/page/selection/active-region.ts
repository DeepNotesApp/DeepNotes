import type { ComputedRef, UnwrapNestedRefs } from 'vue';

import type { Page } from '../page';
import type { PageRegion } from '../regions/region';

export interface IActiveRegionReact {
  id: string;

  value: ComputedRef<PageRegion>;
}

export class PageActiveRegion {
  readonly page: Page;

  readonly react: UnwrapNestedRefs<IActiveRegionReact>;

  constructor(input: { page: Page }) {
    this.page = input.page;

    this.react = reactive({
      id: this.page.id,

      value: computed(() => this.page.regions.fromId(this.react.id)),
    });
  }
}
