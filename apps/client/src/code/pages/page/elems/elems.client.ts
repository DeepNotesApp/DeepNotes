import type { Page } from '../page.client';

export class PageElems {
  readonly page: Page;

  constructor({ page }: { page: Page }) {
    this.page = page;
  }

  setup() {
    this.page.notes.createAndObserveIds(this.page.react.collab.noteIds);
    this.page.notes.observeMap();

    this.page.arrows.createAndObserveIds(this.page.react.collab.arrowIds);
    this.page.arrows.observeMap();
  }
}
