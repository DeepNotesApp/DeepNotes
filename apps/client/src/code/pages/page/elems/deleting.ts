import type { PageArrow } from '../arrows/arrow';
import type { PageNote } from '../notes/note';
import type { Page } from '../page';

export class PageDeleting {
  readonly page: Page;

  constructor(input: { page: Page }) {
    this.page = input.page;
  }

  perform() {
    if (this.page.react.readOnly) {
      return;
    }

    // Root regions will never be deleted this way
    // All container regions will always be deleted
    // Only need to sort the first level elements

    this.page.collab.doc.transact(() => {
      // Delete arrows

      const arrowSet = new Set<PageArrow>(this.page.selection.react.arrows);

      for (const selectedNote of this.page.selection.react.notes) {
        for (const arrow of this.page.arrows.fromIds(
          Array.from(selectedNote.incomingArrowIds),
        )) {
          arrowSet.add(arrow);
        }
        for (const arrow of this.page.arrows.fromIds(
          Array.from(selectedNote.outgoingArrowIds),
        )) {
          arrowSet.add(arrow);
        }
        for (const arrow of selectedNote.react.arrows) {
          arrowSet.add(arrow);
        }
      }

      const sortedArrows = Array.from(arrowSet).sort(
        (a, b) => b.react.index - a.react.index,
      );

      for (const arrow of sortedArrows) {
        arrow.removeFromRegion();

        if (this.page.collab.store.arrows[arrow.id] != null) {
          delete this.page.collab.store.arrows[arrow.id];
        }
      }

      // Delete notes

      const selectedNotes = this.page.selection.react.notes.slice();

      selectedNotes.sort((a, b) => b.react.index - a.react.index);

      for (const selectedNote of selectedNotes) {
        this.deleteNote(selectedNote);

        selectedNote.removeFromRegion();
      }
    });

    this.page.selection.clear();
  }

  deleteNote(note: PageNote) {
    this.page.collab.doc.transact(() => {
      for (const childNote of note.react.notes) {
        this.deleteNote(childNote);
      }

      for (const arrow of note.react.arrows) {
        if (this.page.collab.store.arrows[arrow.id] != null) {
          delete this.page.collab.store.arrows[arrow.id];
        }
      }

      if (this.page.collab.store.notes[note.id] != null) {
        delete this.page.collab.store.notes[note.id];
      }
    });
  }
}
