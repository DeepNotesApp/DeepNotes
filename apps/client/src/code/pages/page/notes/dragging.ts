import { listenPointerEvents } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';
import { refProp, watchUntilTrue } from '@stdlib/vue';
import { isCtrlDown } from 'src/code/utils/misc';
import type { UnwrapRef } from 'vue';

import type { Page } from '../page';
import { roundTimeToMinutes } from './date';
import type { PageNote } from './note';

export interface IDraggingReact {
  active: boolean;

  dropRegionId?: string;
  dropIndex?: number;
}

export class NoteDragging {
  readonly page: Page;

  react: UnwrapRef<IDraggingReact>;

  initialRegionId?: string;
  finalRegionId?: string;

  initialPointerPos: Vec2 = new Vec2();
  originalNotePositions: Record<string, Vec2> = {};

  private _cancelPointerEvents?: () => void;

  constructor(input: { page: Page }) {
    this.page = input.page;

    this.react = refProp<IDraggingReact>(this, 'react', {
      active: false,
    });
  }

  start(params: { note: PageNote; event: PointerEvent }) {
    if (this.page.react.readOnly) {
      return;
    }

    // Prevent dragging unmovable notes

    if (
      this.page.activeElem.react.value?.type === 'note' &&
      !this.page.activeElem.react.value.react.collab.movable
    ) {
      if (params.event.pointerType !== 'mouse') {
        this.page.panning.start(params.event);
      }

      return;
    }

    this.react = { active: false };

    this.initialPointerPos = this.page.pos.eventToClient(params.event);

    this._cancelPointerEvents = listenPointerEvents(params.event, {
      dragStartDistance: 5,

      dragStart: () => this._dragStart(params),
      dragUpdate: this._dragUpdate,
      dragEnd: this._dragFinish,
    });
  }

  private _dragStart = async (params: {
    note: PageNote;
    event: PointerEvent;
  }) => {
    this.initialRegionId = this.page.activeRegion.react.value.id;
    this.finalRegionId = this.page.id;

    if (isCtrlDown(params.event)) {
      this.page.selection.add(params.note);

      await this.page.cloning.perform({ shiftNotes: false });
    }

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

    // Store original note positions

    this.originalNotePositions = {};

    for (const selectedNote of this.page.selection.react.notes) {
      this.originalNotePositions[selectedNote.id] = new Vec2(
        selectedNote.react.collab.pos,
      );
    }

    this.react.active = true;
  };

  private _dragUpdate = (event: PointerEvent) => {
    if (!this.react.active) {
      return;
    }

    const clientPos = this.page.pos.eventToClient(event);

    const worldDiff = this.page.sizes.screenToWorld2D(
      clientPos.sub(this.initialPointerPos),
    );

    if (event.shiftKey) {
      if (Math.abs(worldDiff.x) < Math.abs(worldDiff.y)) {
        worldDiff.x = 0;
      } else {
        worldDiff.y = 0;
      }
    }

    // Move selected notes

    this.page.collab.doc.transact(() => {
      for (const selectedNote of this.page.selection.react.notes) {
        const newPos =
          this.originalNotePositions[selectedNote.id].add(worldDiff);

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
          const worldPos = this.page.pos.clientToWorld(this.initialPointerPos);
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
    if (this.react.active && this.finalRegionId !== this.initialRegionId) {
      const date = roundTimeToMinutes(Date.now());

      this.page.collab.doc.transact(() => {
        for (const selectedNote of this.page.selection.react.notes) {
          if (date !== this.page.collab.store.notes[selectedNote.id]?.movedAt) {
            this.page.collab.store.notes[selectedNote.id].movedAt = date;
          }
        }
      });
    }

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
