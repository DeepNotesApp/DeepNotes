import type { Page } from '../page';

export class PageElems {
  readonly page: Page;

  constructor(input: { page: Page }) {
    this.page = input.page;
  }

  setup() {
    this.page.notes.createAndObserveIds(this.page.react.collab.noteIds);
    this.page.notes.observeMap();

    this.page.arrows.createAndObserveIds(this.page.react.collab.arrowIds);
    this.page.arrows.observeMap();
  }
}
