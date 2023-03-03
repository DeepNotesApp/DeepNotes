import type { Rect, Vec2 } from '@stdlib/misc';
import { isNanoID } from '@stdlib/misc';
import { once } from 'lodash';
import type { ComputedRef, UnwrapRef, WritableComputedRef } from 'vue';
import type { ZodType } from 'zod';
import { z } from 'zod';

import type { PageArrow } from '../arrows/arrow.client';
import type { PageElem } from '../elems/elem.client';
import type { PageNote } from '../notes/note.client';
import type { Page } from '../page.client';

export type PageRegion = Page | PageNote;

export const IRegionElemIds = once(() =>
  z.object({
    noteIds: z.string().refine(isNanoID).array().default([]),
    arrowIds: z.string().refine(isNanoID).array().default([]),
  }),
);
export type IRegionElemIdsInput = z.input<ReturnType<typeof IRegionElemIds>>;
export type IRegionElemIdsOutput = z.output<ReturnType<typeof IRegionElemIds>>;

export const IRegionCollab = once(() =>
  IRegionElemIds().extend({
    nextZIndex: z.number().default(0),
  }),
);
export type IRegionCollabInput = z.input<ReturnType<typeof IRegionCollab>>;
export type IRegionCollabOutput = z.output<ReturnType<typeof IRegionCollab>>;

export const IRegionElems = once(() =>
  z.object({
    notes: (z.any() as ZodType<PageNote>).array().default([]),
    arrows: (z.any() as ZodType<PageArrow>).array().default([]),
  }),
);
export type IRegionElemsInput = z.input<ReturnType<typeof IRegionElems>>;
export type IRegionElemsOutput = z.output<ReturnType<typeof IRegionElems>>;

export interface IRegionReact {
  collab: ComputedRef<IRegionCollabOutput>;

  _nextZIndex: number;
  nextZIndex: WritableComputedRef<number>;

  notes: ComputedRef<PageNote[]>;
  arrows: ComputedRef<PageArrow[]>;
  elems: ComputedRef<PageElem[]>;

  islandRoot: ComputedRef<PageRegion>;
  islandRegions: ComputedRef<Set<PageRegion>>;
}

export type RegionType = 'page' | 'note';

export interface IPageRegion {
  id: string;

  react: UnwrapRef<IRegionReact>;

  type: RegionType;

  getContainerClientRect(): Rect | undefined;
  getContainerWorldRect(): Rect | undefined;

  getOriginClientPos(): Vec2 | undefined;
  getOriginWorldPos(): Vec2 | undefined;
}

export function getIslandRoot(region: PageRegion): PageRegion {
  if (
    region.type === 'page' ||
    (!region.react.container.spatial && region.react.container.overflow)
  ) {
    return region;
  } else {
    return region.react.region.react.islandRoot;
  }
}

export function getIslandRegions(region: PageRegion): Set<PageRegion> {
  if (region.react.islandRoot !== region) {
    return region.react.islandRoot.react.islandRegions;
  } else {
    const regionStack = [region];

    const islandRegions = new Set<PageRegion>();

    while (regionStack.length > 0) {
      const region = regionStack.pop()!;

      if (islandRegions.has(region)) {
        continue;
      }

      islandRegions.add(region);

      for (const note of region.react.notes) {
        if (
          !note.react.collab.container.enabled ||
          (!note.react.container.spatial && note.react.container.overflow)
        ) {
          continue;
        }

        regionStack.push(note);
      }
    }

    return islandRegions;
  }
}
