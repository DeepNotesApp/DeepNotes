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

  clientStartPos: Vec2;
  clientEndPos: Vec2;

  displayRect: ComputedRef<Rect>;
}

export class PageBoxSelection {
  readonly page: Page;

  readonly react: UnwrapNestedRefs<IBoxSelectionReact>;

  private _cancelPointerEvents?: () => void;

  constructor(input: { page: Page }) {
    this.page = input.page;

    this.react = reactive({
      active: false,

      region: computed(() => this.page.regions.fromId(this.react.regionId!)),

      clientStartPos: new Vec2(),
      clientEndPos: new Vec2(),

      displayRect: computed(() =>
        this.page.rects.clientToDisplay(
          new Rect(this.react.clientStartPos, this.react.clientEndPos),
        ),
      ),
    });
  }

  start(event: PointerEvent, region: PageRegion) {
    const clientPos = this.page.pos.eventToClient(event);

    this.react.active = false;

    this.react.regionId = region.id;

    this.react.clientStartPos = new Vec2(clientPos);
    this.react.clientEndPos = new Vec2(clientPos);

    if (event.pointerType === 'mouse') {
      this._cancelPointerEvents = listenPointerEvents(event, {
        dragStartDistance: 5,

        dragStart: this._dragStart,
        dragUpdate: this._dragUpdate,
        dragEnd: this._dragEnd,
      });
    } else {
      this._cancelPointerEvents = listenPointerEvents(event, {
        dragStartDistance: 5,
        dragStartDelay: 300,

        dragStart: this._dragStart,
        dragUpdate: this._dragUpdate,
        dragEnd: this._dragEnd,
      });
    }
  }

  private _dragStart = () => {
    this.react.active = true;
  };

  private _dragUpdate = (event: PointerEvent) => {
    this.react.clientEndPos = this.page.pos.eventToClient(event);
  };

  private _dragEnd = (event: PointerEvent) => {
    this.react.active = false;

    const boxClientRect = new Rect(
      new Vec2(
        Math.min(this.react.clientStartPos.x, this.react.clientEndPos.x),
        Math.min(this.react.clientStartPos.y, this.react.clientEndPos.y),
      ),
      new Vec2(
        Math.max(this.react.clientStartPos.x, this.react.clientEndPos.x),
        Math.max(this.react.clientStartPos.y, this.react.clientEndPos.y),
      ),
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

  cancel() {
    this.react.active = false;

    this._cancelPointerEvents?.();
  }
}
