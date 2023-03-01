import { minmax, Vec2 } from '@stdlib/misc';
import type { ComputedRef, UnwrapNestedRefs } from 'vue';

import type { Page } from '../page.client';
import type { IRegionElemsOutput } from '../regions/region.client';

export interface ICameraReact {
  pos: Vec2;

  zoom: number;

  handleScale: ComputedRef<number>;
}

export class PageCamera {
  readonly page: Page;

  readonly react: UnwrapNestedRefs<ICameraReact>;

  constructor({ page }: { page: Page }) {
    this.page = page;

    this.react = reactive({
      pos: new Vec2(),

      zoom: 1,

      handleScale: computed(() => minmax(1 / this.react.zoom, 1, 3)),
    });
  }

  resetZoom() {
    this.react.zoom = 1;

    this.page.fixDisplay();
  }

  fitToScreen() {
    let regionElems: IRegionElemsOutput;

    if (
      this.page.selection.react.notes.length > 0 ||
      this.page.selection.react.arrows.length > 0
    ) {
      regionElems = this.page.selection.react;
    } else {
      regionElems = this.page.react;
    }

    const worldRect = this.page.regions.getWorldRect(regionElems);

    if (worldRect == null) {
      this.react.pos = new Vec2();
      this.resetZoom();
      return;
    }

    const displayRect = this.page.rects.fromDisplay();

    this.react.pos = worldRect.center;

    this.react.zoom = Math.min(
      (Math.min(60, displayRect.size.x / 4) - displayRect.size.x / 2) /
        (worldRect.topLeft.x - this.react.pos.x),
      (Math.min(60, displayRect.size.y / 4) - displayRect.size.y / 2) /
        (worldRect.topLeft.y - this.react.pos.y),
    );

    this.react.zoom = Math.min(this.react.zoom, 1);

    this.page.fixDisplay();
  }
}
