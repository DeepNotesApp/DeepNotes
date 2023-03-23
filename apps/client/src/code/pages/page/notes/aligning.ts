import type { Rect } from '@stdlib/misc';

import type { Page } from '../page';
import type { PageNote } from './note';

export class NoteAligning {
  readonly page: Page;

  constructor({ page }: { page: Page }) {
    this.page = page;
  }

  alignLeft() {
    this.page.collab.doc.transact(() => {
      // Get note rects

      const noteRects = new Map<PageNote, Rect>();

      for (const note of this.page.selection.react.notes) {
        noteRects.set(note, note.react.relativeRect);
      }

      // Get minimum X

      const minX = Math.min(
        ...Array.from(noteRects.values()).map((rect) => rect.topLeft.x),
      );

      // Shift notes

      for (const [note, rect] of noteRects) {
        note.react.collab.pos.x -= rect.topLeft.x - minX;
      }
    });
  }
  alignRight() {
    this.page.collab.doc.transact(() => {
      // Get note rects

      const noteRects = new Map<PageNote, Rect>();

      for (const note of this.page.selection.react.notes) {
        noteRects.set(note, note.react.relativeRect);
      }

      // Get maximum X

      const maxX = Math.max(
        ...Array.from(noteRects.values()).map((rect) => rect.bottomRight.x),
      );

      // Shift notes

      for (const [note, rect] of noteRects) {
        note.react.collab.pos.x += maxX - rect.bottomRight.x;
      }
    });
  }

  alignTop() {
    this.page.collab.doc.transact(() => {
      // Get note rects

      const noteRects = new Map<PageNote, Rect>();

      for (const note of this.page.selection.react.notes) {
        noteRects.set(note, note.react.relativeRect);
      }

      // Get minimum Y

      const minY = Math.min(
        ...Array.from(noteRects.values()).map((rect) => rect.topLeft.y),
      );

      // Shift notes

      for (const [note, rect] of noteRects) {
        note.react.collab.pos.y -= rect.topLeft.y - minY;
      }
    });
  }
  alignBottom() {
    this.page.collab.doc.transact(() => {
      // Get note rects

      const noteRects = new Map<PageNote, Rect>();

      for (const note of this.page.selection.react.notes) {
        noteRects.set(note, note.react.relativeRect);
      }

      // Get maximum Y

      const maxY = Math.max(
        ...Array.from(noteRects.values()).map((rect) => rect.bottomRight.y),
      );

      // Shift notes

      for (const [note, rect] of noteRects) {
        note.react.collab.pos.y += maxY - rect.bottomRight.y;
      }
    });
  }

  alignCenterHorizontal() {
    this.page.collab.doc.transact(() => {
      // Get note rects

      const noteRects = new Map<PageNote, Rect>();

      for (const note of this.page.selection.react.notes) {
        noteRects.set(note, note.react.relativeRect);
      }

      // Get center X

      const centerX =
        Array.from(noteRects.values()).reduce(
          (sum, rect) => sum + rect.center.x,
          0,
        ) / noteRects.size;

      // Shift notes

      for (const [note, rect] of noteRects) {
        note.react.collab.pos.x -= rect.center.x - centerX;
      }
    });
  }
  alignCenterVertical() {
    this.page.collab.doc.transact(() => {
      // Get note rects

      const noteRects = new Map<PageNote, Rect>();

      for (const note of this.page.selection.react.notes) {
        noteRects.set(note, note.react.relativeRect);
      }

      // Get center Y

      const centerY =
        Array.from(noteRects.values()).reduce(
          (sum, rect) => sum + rect.center.y,
          0,
        ) / noteRects.size;

      // Shift notes

      for (const [note, rect] of noteRects) {
        note.react.collab.pos.y -= rect.center.y - centerY;
      }
    });
  }
}
