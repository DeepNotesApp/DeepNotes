import { hasVertScrollbar } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';
import { isCtrlDown } from 'src/code/utils';

import type { Page } from '../page';

export class PageZooming {
  readonly page: Page;

  constructor(input: { page: Page }) {
    this.page = input.page;
  }

  perform(event: WheelEvent) {
    // Skip if already handled by a scrollbar

    if (isCtrlDown(event)) {
      event.preventDefault();

      const worldPos = this.page.pos.eventToWorld(event);

      const multiplier = event.deltaY > 0 ? 1 / 1.2 : 1.2;

      // Update camera zoom

      this.page.camera.react.zoom *= multiplier;

      // Update camera position

      this.page.camera.react.pos = worldPos.add(
        this.page.camera.react.pos.sub(worldPos).div(new Vec2(multiplier)),
      );

      this.page.fixDisplay();
    } else {
      let elem = event.target as HTMLElement | null;

      while (elem != null) {
        if (hasVertScrollbar(elem)) {
          return;
        }

        elem = elem.parentElement;
      }

      this.page.camera.react.pos = this.page.camera.react.pos.add(
        new Vec2(event.deltaX, event.deltaY).divScalar(
          Math.pow(this.page.camera.react.zoom, 0.8) * 2,
        ),
      );
    }
  }
}
