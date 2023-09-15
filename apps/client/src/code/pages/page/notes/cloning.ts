import type { PageElem } from '../elems/elem';
import type { Page } from '../page';

export class NoteCloning {
  readonly page: Page;

  constructor(input: { page: Page }) {
    this.page = input.page;
  }

  async perform(options?: { shiftNotes?: boolean }) {
    if (this.page.react.readOnly) {
      return;
    }

    // Serialize selection

    const serialObject = this.page.app.serialization.serialize(
      this.page.selection.react,
    );

    // Shift notes before deserialization

    if (options?.shiftNotes ?? true) {
      for (const noteIndex of serialObject.root.noteIdxs) {
        const serialNote = serialObject.notes[noteIndex];

        serialNote.pos.x += 8;
        serialNote.pos.y += 8;
      }
    }

    // Deserialize into structure

    let destIndex;
    if (this.page.selection.react.notes.length > 0)
      destIndex = this.page.selection.react.notes.at(-1)!.react.index + 1;

    const destRegion = this.page.activeRegion.react.value;

    const { notes, arrows } = this.page.app.serialization.deserialize(
      serialObject,
      destRegion,
      destIndex,
    );

    // Select clones

    this.page.selection.set(...(notes as PageElem[]).concat(arrows));

    // Scroll into view

    if (this.page.selection.react.notes.length > 0) {
      await nextTick();

      const lastSelectedNote = this.page.selection.react.notes.at(-1)!;

      lastSelectedNote.scrollIntoView();
    }
  }
}
