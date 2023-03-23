import type { Y } from '@syncedstore/core';
import { getYjsValue } from '@syncedstore/core';
import { isString } from 'lodash';
import type { Factories } from 'src/code/factories';

import type { Page } from '../page';
import type { IArrowCollabOutput } from './arrow';
import type { PageArrow } from './arrow';

export class PageArrows {
  readonly factories: Factories;

  readonly page: Page;

  readonly react = reactive({
    map: shallowReactive({} as Record<string, PageArrow>),

    collab: computed(() => this.page.collab.store.arrows),
  });

  constructor({ factories, page }: { factories: Factories; page: Page }) {
    this.factories = factories;

    this.page = page;
  }

  fromId(arrowId: string | null): PageArrow | null {
    const arrow = this.react.map[arrowId!];

    if (arrow != null) {
      return arrow;
    } else {
      return null;
    }
  }
  fromIds(arrowIds: string[]): PageArrow[] {
    const arrowIdsSet = new Set<string>();

    const arrowsArray = [];

    for (const arrowId of arrowIds) {
      if (arrowIdsSet.has(arrowId)) {
        continue;
      }

      arrowIdsSet.add(arrowId);

      const arrow = this.fromId(arrowId);

      if (arrow != null) {
        arrowsArray.push(arrow);
      }
    }

    return arrowsArray;
  }

  create(arrowId: string, index: number) {
    let arrow = this.react.map[arrowId];

    if (arrow != null) {
      return arrow;
    }

    arrow = this.factories.PageArrow({
      page: this.page,
      id: arrowId,
      index,
    });

    this.react.map[arrow.id] = arrow;

    return arrow;
  }
  createAndObserveIds(arrowIds: string[]) {
    for (let index = 0; index < arrowIds.length; index++) {
      this.create(arrowIds[index], index);
    }

    (getYjsValue(arrowIds) as Y.Array<string>).observe((event) => {
      let index = 0;

      for (const delta of event.changes.delta) {
        if (delta.retain != null) {
          index += delta.retain;
        }

        if (delta.insert != null) {
          for (const arrowId of delta.insert) {
            this.create(arrowId, index);
          }
        }
      }
    });
  }

  observeMap() {
    (getYjsValue(this.react.collab) as Y.Map<IArrowCollabOutput>).observe(
      (event) => {
        for (const [arrowId, change] of event.changes.keys) {
          if (change.action !== 'delete') {
            continue;
          }

          // Remove arrow from outgoing arrows

          const source = change.oldValue._map.get('source')?.content.arr?.[0];

          if (isString(source)) {
            const note = this.page.notes.fromId(source);

            if (note != null) {
              note.outgoingArrowIds.delete(arrowId);
            }
          }

          // Remove arrow from incoming arrows

          const target = change.oldValue._map.get('target')?.content.arr?.[0];

          if (isString(target)) {
            const note = this.page.notes.fromId(target);

            if (note != null) {
              note.incomingArrowIds.delete(arrowId);
            }
          }

          // Remove arrow from map

          delete this.react.map[arrowId];
        }
      },
    );
  }
}
