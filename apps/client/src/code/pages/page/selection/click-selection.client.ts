import type { PageElem } from '../elems/elem.client';
import type { Page } from '../page.client';

export class PageClickSelection {
  readonly page: Page;

  constructor({ page }: { page: Page }) {
    this.page = page;
  }

  perform(elem: PageElem, event: PointerEvent) {
    this.page.collab.doc.transact(() => {
      // Container shift-selection

      if (
        elem.react.region.type === 'note' &&
        event.shiftKey &&
        this.page.activeElem.react.value?.type === 'note' &&
        elem?.type === 'note'
      ) {
        const fromIndex = this.page.activeElem.react.value.react.index;
        const toIndex = elem.react.index;

        const step = Math.sign(toIndex - fromIndex);

        for (let i = fromIndex; i !== toIndex; i += step) {
          this.page.selection.add(
            this.page.activeRegion.react.value.react.notes[i],
          );
        }
      }

      // Clear selection if not holding Ctrl or Shift
      // And the clicked element is not selected

      if (
        !event.ctrlKey &&
        !event.shiftKey &&
        !internals.mobileAltKey &&
        !elem.react.selected
      ) {
        this.page.selection.clear(elem.react.region);
      }

      // Remove element if selected and holding Ctrl
      // Else, just change the active element

      if ((event.ctrlKey || internals.mobileAltKey) && elem.react.selected) {
        this.page.selection.remove(elem);
      } else {
        this.page.activeElem.set(elem);
      }

      this.page.fixDisplay();
    });
  }
}
