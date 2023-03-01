import type { ShallowReactive, UnwrapNestedRefs } from 'vue';

import type { Page } from './page/page.client';
import type { Pages } from './pages.client';

export interface IPageCacheReact {
  cache: ShallowReactive<Page[]>;
}

export class PageCache {
  readonly app: Pages;

  readonly react: UnwrapNestedRefs<IPageCacheReact>;

  constructor({ app }: { app: Pages }) {
    this.app = app;

    this.react = reactive({
      cache: shallowReactive([]),
    });
  }

  get(pageId: string): Page | null {
    return this.react.cache.find((page) => page.id === pageId) ?? null;
  }
  has(pageId: string): boolean {
    return this.get(pageId) != null;
  }

  add(page: Page): void {
    this.react.cache.push(page);

    if (this.react.cache.length > 3) {
      const page = this.react.cache.shift();

      page?.destroy();
    }
  }

  bump(pageId: string): void {
    const pageIdx = this.react.cache.findIndex((page) => page.id === pageId);

    if (pageIdx < 0) {
      return;
    }

    const [page] = this.react.cache.splice(pageIdx, 1);

    this.react.cache.push(page);
  }
}
