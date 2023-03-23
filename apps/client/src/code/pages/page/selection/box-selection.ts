import { listenPointerEvents } from '@stdlib/misc';
import { Rect } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';
import type { ComputedRef, UnwrapNestedRefs } from 'vue';

import type { Page } from '../page';
import type { PageRegion } from '../regions/region';

export interface IBoxSelectionReact {
  active: boolean;

  regionId?: string;
  region: ComputedRef<PageRegion>;

  startPos: Vec2;
  endPos: Vec2;
}

export class PageBoxSelection {
  static readonly MIN_DISTANCE = 5;

  readonly page: Page;

  readonly react: UnwrapNestedRefs<IBoxSelectionReact>;

  downEvent!: PointerEvent;
  touchTimer: NodeJS.Timeout | null = null;

  constructor({ page }: { page: Page }) {
    this.page = page;

    this.react = reactive({
      active: false,

      region: computed(() => this.page.regions.fromId(this.react.regionId!)),

      startPos: new Vec2(),
      endPos: new Vec2(),
    });
  }

  start(event: PointerEvent, region: PageRegion) {
    const clientPos = this.page.pos.eventToClient(event);

    const containerClientPos = region.getContainerClientRect()?.topLeft;

    if (containerClientPos == null) {
      return;
    }

    const offsetPos = clientPos.sub(containerClientPos);

    this.react.active = false;

    this.react.regionId = region.id;

    this.react.startPos = new Vec2(offsetPos);
    this.react.endPos = new Vec2(offsetPos);

    this.downEvent = event;

    if (event.pointerType === 'mouse') {
      listenPointerEvents(event, {
        move: this._pointerMove,
        up: this._pointerUp,
      });

      return;
    } else {
      // Only activate box-selection if the touch stays
      // in the same place for 300ms

      this.clearTimer();

      this.touchTimer = setTimeout(() => {
        this.react.active = true;
        this.touchTimer = null;

        listenPointerEvents(event, {
          move: this._pointerMove,
          up: this._pointerUp,
        });
      }, 300);

      listenPointerEvents(event, {
        move: this._timerPointerMove,
        up: this.clearTimer,
      });
    }
  }

  private _pointerMove = (event: PointerEvent) => {
    const clientPos = this.page.pos.eventToClient(event);

    const containerClientPos =
      this.react.region.getContainerClientRect()?.topLeft;

    if (containerClientPos == null) {
      return;
    }

    const offsetPos = clientPos.sub(containerClientPos);

    if (!this.react.active) {
      const dist = offsetPos.sub(this.react.startPos).length();

      this.react.active = dist >= PageBoxSelection.MIN_DISTANCE;

      if (!this.react.active) {
        return;
      }
    }

    this.react.endPos = new Vec2(offsetPos);
  };

  private _pointerUp = (event: PointerEvent) => {
    if (!this.react.active) {
      return;
    }

    this.react.active = false;

    const containerClientPos =
      this.react.region.getContainerClientRect()?.topLeft;

    if (containerClientPos == null) {
      return;
    }

    const boxClientRect = new Rect(
      new Vec2(
        Math.min(this.react.startPos.x, this.react.endPos.x),
        Math.min(this.react.startPos.y, this.react.endPos.y),
      ).add(containerClientPos),
      new Vec2(
        Math.max(this.react.startPos.x, this.react.endPos.x),
        Math.max(this.react.startPos.y, this.react.endPos.y),
      ).add(containerClientPos),
    );

    this.page.collab.doc.transact(() => {
      for (const note of this.react.region.react.notes) {
        const noteClientRect = note.getClientRect('note-frame');

        if (noteClientRect == null) {
          continue;
        }

        if (!boxClientRect.intersectsRect(noteClientRect)) {
          continue;
        }

        if (note.react.selected && !event.shiftKey && !internals.mobileAltKey) {
          this.page.selection.remove(note);
        } else {
          this.page.selection.add(note);
        }
      }

      for (const arrow of this.react.region.react.arrows) {
        const arrowClientRect = arrow.getClientRect();

        if (arrowClientRect == null) {
          continue;
        }

        if (!boxClientRect.containsVec2(arrowClientRect.center)) {
          continue;
        }

        if (
          arrow.react.selected &&
          !event.shiftKey &&
          !internals.mobileAltKey
        ) {
          this.page.selection.remove(arrow);
        } else {
          this.page.selection.add(arrow);
        }
      }
    });
  };

  private _timerPointerMove = (event: PointerEvent) => {
    if (this.touchTimer == null || this.react.active) {
      return;
    }

    const clientPos = this.page.pos.eventToClient(event);
    const clientTopLeft = this.react.region.getContainerClientRect()?.topLeft;

    if (clientTopLeft == null) {
      return;
    }

    const offsetPos = clientPos.sub(clientTopLeft);

    const dist = offsetPos.sub(this.react.startPos).length();

    if (dist >= PageBoxSelection.MIN_DISTANCE) {
      this.clearTimer();

      this.page.panning.start(this.downEvent);
    }
  };

  clearTimer = () => {
    clearTimeout(this.touchTimer!);

    this.touchTimer = null;
  };
}
