import { Y } from '@syncedstore/core';
import { once } from 'lodash';
import { z } from 'zod';

import { IVec2 } from '../../utils';
import { IElemCollab } from '../elems/elem';
import { IRegionCollab } from '../regions/region';

const INoteCollabSize = once(() =>
  z.object({
    expanded: z.string().default('Auto'),
    collapsed: z.string().default('Auto'),
  }),
);

const INoteCollabSection = once(() =>
  z.object({
    height: INoteCollabSize().default({}),
  }),
);

const INoteCollabTextSection = (enabled: boolean) =>
  INoteCollabSection().extend({
    enabled: z.boolean().default(enabled),
    value: (z.any() as z.ZodType<Y.XmlFragment>).default(() => {
      const fragment = new Y.XmlFragment();

      const paragraph = new Y.XmlElement('paragraph');

      paragraph.insert(0, [new Y.XmlText('')]);

      fragment.insert(0, [paragraph]);

      return fragment;
    }),
    wrap: z.boolean().default(true),
  });

export const INoteCollab = once(() =>
  IElemCollab().merge(
    IRegionCollab().extend({
      link: z.string().default(''),

      anchor: IVec2(0.5, 0.5).default({ x: 0.5, y: 0.5 }),
      pos: IVec2(0, 0).default({ x: 0, y: 0 }),

      width: INoteCollabSize().default({}),

      head: INoteCollabTextSection(true).default({}),
      body: INoteCollabTextSection(false).default({}),

      container: INoteCollabSection()
        .extend({
          enabled: z.boolean().default(false),

          horizontal: z.boolean().default(false),
          spatial: z.boolean().default(false),

          wrapChildren: z.boolean().default(false),
          stretchChildren: z.boolean().default(true),

          forceColorInheritance: z.boolean().default(false),
        })
        .default({}),

      collapsing: z
        .object({
          enabled: z.boolean().default(false),
          collapsed: z.boolean().default(false),
          localCollapsing: z.boolean().default(false),
        })
        .default({}),

      movable: z.boolean().default(true),
      resizable: z.boolean().default(true),
      readOnly: z.boolean().default(false),

      color: z
        .object({
          inherit: z.boolean().default(false),
          value: z.string().default('grey'),
        })
        .default({}),

      zIndex: z.number().default(-1),
    }),
  ),
);
export type INoteCollabPartial = z.input<ReturnType<typeof INoteCollab>>;
export type INoteCollabComplete = z.output<ReturnType<typeof INoteCollab>>;

export const INoteCollabDefault = once(() => INoteCollab().parse({}));
