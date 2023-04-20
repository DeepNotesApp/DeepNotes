import { Rect } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';

import type { Page } from '../page';
import type { IRegionElemsOutput, PageRegion } from './region';

export class PageRegions {
  readonly page: Page;

  constructor(input: { page: Page }) {
    this.page = input.page;
  }

  fromId(regionId: string): PageRegion {
    const note = this.page.notes.fromId(regionId);

    if (note != null) {
      return note;
    } else {
      return this.page;
    }
  }

  getWorldRect(regionElems: IRegionElemsOutput) {
    const regionWorldRect = new Rect(
      new Vec2(Infinity, Infinity),
      new Vec2(-Infinity, -Infinity),
    );

    for (const note of regionElems.notes) {
      const noteWorldRect = note.getWorldRect('note-frame');

      if (noteWorldRect == null) {
        continue;
      }

      regionWorldRect.topLeft.x = Math.min(
        regionWorldRect.topLeft.x,
        noteWorldRect.topLeft.x,
      );
      regionWorldRect.topLeft.y = Math.min(
        regionWorldRect.topLeft.y,
        noteWorldRect.topLeft.y,
      );

      regionWorldRect.bottomRight.x = Math.max(
        regionWorldRect.bottomRight.x,
        noteWorldRect.bottomRight.x,
      );
      regionWorldRect.bottomRight.y = Math.max(
        regionWorldRect.bottomRight.y,
        noteWorldRect.bottomRight.y,
      );
    }

    for (const arrow of regionElems.arrows) {
      const arrowWorldRect = arrow.getWorldRect();

      if (arrowWorldRect == null) {
        continue;
      }

      regionWorldRect.topLeft.x = Math.min(
        regionWorldRect.topLeft.x,
        arrowWorldRect.topLeft.x,
      );
      regionWorldRect.topLeft.y = Math.min(
        regionWorldRect.topLeft.y,
        arrowWorldRect.topLeft.y,
      );

      regionWorldRect.bottomRight.x = Math.max(
        regionWorldRect.bottomRight.x,
        arrowWorldRect.bottomRight.x,
      );
      regionWorldRect.bottomRight.y = Math.max(
        regionWorldRect.bottomRight.y,
        arrowWorldRect.bottomRight.y,
      );
    }

    if (isFinite(regionWorldRect.size.x) && isFinite(regionWorldRect.size.y)) {
      return regionWorldRect;
    }
  }
}
