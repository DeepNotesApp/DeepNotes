import { Vec2 } from '@stdlib/misc';

import type { Page } from '../page';
import { roundTimeToMinutes } from './date';
import type { PageNote } from './note';

export class NoteDropping {
  readonly page: Page;

  constructor(args: { page: Page }) {
    this.page = args.page;
  }

  async perform(parentNote: PageNote, dropIndex?: number) {
    this.page.dragging.finalRegionId = parentNote.id;

    this.page.collab.doc.transact(() => {
      const containerWorldPos = parentNote.getContainerWorldRect()?.topLeft;

      if (containerWorldPos == null) {
        return;
      }

      const date = roundTimeToMinutes(Date.now());

      for (const selectedNote of this.page.selection.react.notes) {
        const newPos = new Vec2(selectedNote.react.collab.pos).sub(
          containerWorldPos,
        );

        selectedNote.react.collab.pos.x = newPos.x;
        selectedNote.react.collab.pos.y = newPos.y;

        if (date !== this.page.collab.store.notes[selectedNote.id]?.movedAt) {
          this.page.collab.store.notes[selectedNote.id].movedAt = date;
        }
      }
    });

    dropIndex ??= parentNote.react.notes.length;

    this.page.selection.moveToRegion(
      parentNote,
      parentNote.react.notes[dropIndex - 1]?.id,
    );

    this.page.dragging.cancel();

    await nextTick();

    const lastSelectedNote = this.page.selection.react.notes.at(-1)!;

    lastSelectedNote.scrollIntoView();
  }
}
