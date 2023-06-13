import { listenPointerEvents } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';
import { refProp, watchUntilTrue } from '@stdlib/vue';
import type { UnwrapRef } from 'vue';

import type { Page } from '../page';

export interface IDraggingReact {
  active: boolean;

  currentPos: Vec2;

  dropRegionId?: string;
  dropIndex?: number;
}

export class NoteDragging {
  readonly page: Page;

  react: UnwrapRef<IDraggingReact>;

  private _cancelPointerEvents?: () => void;

  constructor(input: { page: Page }) {
    this.page = input.page;

    this.react = refProp<IDraggingReact>(this, 'react', {
      active: false,

      currentPos: new Vec2(),
    });
  }

  start(event: PointerEvent) {
    if (this.page.react.readOnly) {
      return;
    }

    // Prevent dragging unmovable notes

    if (
      this.page.activeElem.react.value?.type !== 'note' ||
      !this.page.activeElem.react.value.react.collab.movable
    ) {
      if (event.pointerType !== 'mouse') {
        this.page.panning.start(event);
      }

      return;
    }

    this.react = {
      active: false,

      currentPos: this.page.pos.eventToClient(event),
    };

    this._cancelPointerEvents = listenPointerEvents(event, {
      dragStartDistance: 5,

      dragStart: this._dragStart,
      dragUpdate: this._dragUpdate,
      dragEnd: this._dragFinish,
    });
  }

  private _dragStart = async (event: PointerEvent) => {
    this.react.active = true;

    // Update note dragging states

    for (const selectedNote of this.page.selection.react.notes) {
      selectedNote.react.dragging = selectedNote.react.collab.movable;

      if (!selectedNote.react.dragging) {
        this.page.selection.remove(selectedNote);
      }
    }

    // Drag out of note

    if (this.page.activeRegion.react.value.type === 'note') {
      await this._dragOut();
    }

    this._dragUpdate(event);
  };

  private _dragUpdate = (event: PointerEvent) => {
    const clientPos = this.page.pos.eventToClient(event);

    const worldDelta = this.page.sizes.screenToWorld2D(
      clientPos.sub(this.react.currentPos),
    );

    this.react.currentPos = clientPos;

    // Move selected notes

    this.page.collab.doc.transact(() => {
      for (const selectedNote of this.page.selection.react.notes) {
        const newPos = new Vec2(selectedNote.react.collab.pos).add(worldDelta);

        selectedNote.react.collab.pos.x = newPos.x || 0;
        selectedNote.react.collab.pos.y = newPos.y || 0;
      }
    });
  };

  private async _dragOut(): Promise<void> {
    // Store note positions

    const prevCenters = new Map<string, Vec2>();

    for (const selectedNote of this.page.selection.react.notes) {
      const worldRect = selectedNote.getWorldRect('note-frame');

      if (worldRect == null) {
        continue;
      }

      prevCenters.set(selectedNote.id, worldRect.center);
    }

    // Move notes to page region

    const oldRegion = this.page.activeRegion.react.value;

    this.page.selection.moveToRegion(this.page);

    // Obtain active region

    if (oldRegion.type === 'page') {
      return;
    }

    // Adjust note positions and sizes
    // With mouse in the center of the active element

    if (oldRegion.react.collab.container.spatial) {
      // Drag out of spatial container

      const containerWorldTopLeft = oldRegion.getContainerWorldRect()?.topLeft;

      if (containerWorldTopLeft == null) {
        return;
      }

      this.page.collab.doc.transact(() => {
        for (const selectedNote of this.page.selection.react.notes) {
          const newPos = new Vec2(selectedNote.react.collab.pos).add(
            containerWorldTopLeft,
          );

          selectedNote.react.collab.pos.x = newPos.x;
          selectedNote.react.collab.pos.y = newPos.y;
        }
      });
    } else {
      // Drag out of list container

      await nextTick();

      const activeElem = this.page.activeElem.react.value;

      if (activeElem?.type !== 'note') {
        return;
      }

      await Promise.all(
        this.page.selection.react.notes.map((note) =>
          watchUntilTrue(() => note.react.loaded),
        ),
      );

      this.page.collab.doc.transact(() => {
        for (const selectedNote of this.page.selection.react.notes) {
          const worldPos = this.page.pos.clientToWorld(this.react.currentPos);
          const mouseOffset = worldPos.sub(prevCenters.get(activeElem.id)!);

          const prevCenter = prevCenters.get(selectedNote.id)!;

          const worldRect = selectedNote.getWorldRect('note-frame');

          if (worldRect == null) {
            continue;
          }

          const worldSize = worldRect.size;

          const result = prevCenter
            .add(mouseOffset)
            .add(
              worldSize.mul(
                new Vec2(selectedNote.react.collab.anchor).subScalar(0.5),
              ),
            );

          selectedNote.react.collab.pos.x = result.x;
          selectedNote.react.collab.pos.y = result.y;
        }
      });
    }
  }

  private _dragFinish = () => {
    this.react.active = false;

    for (const selectedNote of this.page.selection.react.notes) {
      selectedNote.react.dragging = false;
    }
  };

  cancel = () => {
    this._cancelPointerEvents?.();

    this._dragFinish();
  };
}
