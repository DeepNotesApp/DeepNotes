import { Vec2 } from '@stdlib/misc';
import type { Y } from '@syncedstore/core';
import { getYjsValue } from '@syncedstore/core';
import type { Factories } from 'src/code/factories';

import type { Page } from '../page';
import type { PageRegion } from '../regions/region';
import type { PageNote } from './note';
import type { INoteCollabComplete } from './note-collab';

export class PageNotes {
  readonly factories: Factories;

  readonly page: Page;

  readonly react = reactive({
    map: shallowReactive({} as Record<string, PageNote>),

    collab: computed(() => this.page.collab.store.notes),
  });

  constructor(input: { factories: Factories; page: Page }) {
    this.factories = input.factories;

    this.page = input.page;
  }

  fromId(noteId: string | null, regionId?: string | null): PageNote | null {
    const note = this.react.map[noteId!];

    if (
      note != null &&
      (regionId === undefined || note.react.collab.regionId === regionId)
    ) {
      return note;
    } else {
      return null;
    }
  }
  fromIds(noteIds: string[], regionId?: string): PageNote[] {
    const noteIdsSet = new Set<string>();

    const notesArray = [];

    for (const noteId of noteIds) {
      if (noteIdsSet.has(noteId)) {
        continue;
      }

      noteIdsSet.add(noteId);

      const note = this.fromId(noteId, regionId);

      if (note != null) {
        notesArray.push(note);
      }
    }

    return notesArray;
  }

  createAndObserveChildren(noteId: string, index: number): void {
    let note = this.fromId(noteId);

    if (note == null) {
      if (this.react.collab[noteId] == null || this.react.map[noteId] != null) {
        return;
      }

      note = this.factories.PageNote({ page: this.page, id: noteId, index });

      this.react.map[note.id] = note;

      this.createAndObserveIds(note.react.collab.noteIds);
      this.page.arrows.createAndObserveIds(note.react.collab.arrowIds);
    } else {
      this.page.selection.remove(note);

      note.react.index = index;
    }
  }
  createAndObserveIds(noteIds: string[]) {
    for (let index = 0; index < noteIds.length; index++) {
      this.createAndObserveChildren(noteIds[index], index);
    }

    (getYjsValue(noteIds) as Y.Array<string>).observe((event) => {
      let index = 0;

      for (const delta of event.changes.delta) {
        if (delta.retain != null) {
          index += delta.retain;
        }

        if (delta.insert != null) {
          for (const noteId of delta.insert) {
            this.createAndObserveChildren(noteId, index);
          }
        }
      }
    });
  }

  observeMap() {
    (getYjsValue(this.react.collab) as Y.Map<INoteCollabComplete>).observe(
      (event) => {
        for (const [noteId, change] of event.changes.keys) {
          if (change.action === 'delete') {
            delete this.react.map[noteId];
          }
        }
      },
    );
  }

  async create(
    region: PageRegion,
    worldPos: Vec2,
    center = true,
    destIndex?: number,
  ) {
    if (this.page.react.readOnly) {
      return;
    }

    const note = this.page.app.serialization.deserialize(
      internals.pages.defaultNote,
      region,
      destIndex,
    ).notes[0];

    await this.page.editing.start(note);

    note.react.collab.pos.x = worldPos.x;
    note.react.collab.pos.y = worldPos.y;

    if (center) {
      const worldSize = note.getWorldRect('note-frame')?.size;

      if (worldSize != null) {
        const newPos = new Vec2(note.react.collab.pos).add(
          worldSize.mul(new Vec2(note.react.collab.anchor).subScalar(0.5)),
        );

        note.react.collab.pos.x = newPos.x;
        note.react.collab.pos.y = newPos.y;
      }
    }

    return note;
  }
}
