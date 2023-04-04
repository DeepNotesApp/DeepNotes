import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import type { Vec2 } from '@stdlib/misc';
import { getClipboardText, setClipboardText } from '@stdlib/misc';
import { watchUntilTrue } from '@stdlib/vue';
import { every } from 'lodash';
import { pack, unpack } from 'msgpackr';

import { ISerialObject } from '../../serialization';
import type { Page } from '../page';
import type { PageElem } from './elem';

export class PageClipboard {
  static readonly encryptionKey = new Uint8Array([
    69, 81, 22, 76, 49, 33, 121, 37, 173, 129, 122, 252, 249, 34, 8, 159, 139,
    239, 81, 9, 54, 150, 47, 180, 154, 134, 236, 198, 23, 130, 39, 195,
  ]);

  readonly page: Page;

  constructor({ page }: { page: Page }) {
    this.page = page;
  }

  copy() {
    // Serialize selection

    const clipboardObj = this.page.app.serialization.serialize(
      this.page.selection.react,
    );

    // Subtract center

    if (this.page.activeRegion.react.value.type === 'page') {
      const worldRect = this.page.regions.getWorldRect(
        this.page.selection.react,
      );

      if (worldRect == null) {
        return;
      }

      const worldCenter = worldRect.center;

      for (const noteIndex of clipboardObj.root.noteIdxs) {
        const clipboardNote = clipboardObj.notes[noteIndex];

        clipboardNote.pos.x -= worldCenter.x;
        clipboardNote.pos.y -= worldCenter.y;
      }
    }

    // Copy to clipboard

    const encryptedClipboardText = bytesToBase64(
      wrapSymmetricKey(PageClipboard.encryptionKey).encrypt(
        pack(clipboardObj),
        {
          padding: true,
          associatedData: { context: 'Clipboard' },
        },
      ),
    );

    setClipboardText(encryptedClipboardText);
  }

  async paste(text?: string) {
    if (this.page.react.readOnly) {
      return;
    }

    try {
      // Get from clipboard

      const encryptedClipboardText = text ?? (await getClipboardText());

      const clipboardData =
        process.env.DEV && encryptedClipboardText.startsWith('{')
          ? JSON.parse(encryptedClipboardText)
          : unpack(
              wrapSymmetricKey(PageClipboard.encryptionKey).decrypt(
                base64ToBytes(encryptedClipboardText),
                {
                  padding: true,
                  associatedData: { context: 'Clipboard' },
                },
              ),
            );

      const clipboardObj = ISerialObject().parse(clipboardData);

      // Get destination center

      const selectionWorldRect = this.page.regions.getWorldRect(
        this.page.selection.react,
      );

      let destCenter: Vec2;

      if (selectionWorldRect != null) {
        if (this.page.activeRegion.react.value.type === 'page') {
          destCenter = selectionWorldRect.center.addScalar(8);
        } else {
          destCenter = selectionWorldRect.center.addScalar(8);
        }
      } else {
        if (this.page.activeRegion.react.value.type === 'page') {
          destCenter = this.page.camera.react.pos;
        } else {
          destCenter =
            this.page.activeRegion.react.value.getContainerWorldRect()!
              .halfSize;
        }
      }

      // Center notes around destination center

      for (const noteIndex of clipboardObj.root.noteIdxs) {
        const clipboardNote = clipboardObj.notes[noteIndex];

        clipboardNote.pos.x += destCenter.x;
        clipboardNote.pos.y += destCenter.y;
      }

      // Deserialize into structure

      let destIndex;
      if (this.page.selection.react.notes.length > 0) {
        destIndex = this.page.selection.react.notes.at(-1)!.react.index + 1;
      }

      const destRegion = this.page.activeRegion.react.value;

      const { notes, arrows } = this.page.app.serialization.deserialize(
        clipboardObj,
        destRegion,
        destIndex,
      );

      // Recenter notes around destination center

      await nextTick();
      await watchUntilTrue(() => every(notes, (note) => note.react.loaded));

      const notesCenter = this.page.regions.getWorldRect({
        notes,
        arrows: [],
      })?.center;

      if (notesCenter != null) {
        const centerOffset = destCenter.sub(notesCenter);

        this.page.collab.doc.transact(() => {
          for (const note of notes) {
            note.react.collab.pos.x += centerOffset.x;
            note.react.collab.pos.y += centerOffset.y;
          }
        });
      }

      // Select notes

      this.page.selection.set(...(notes as PageElem[]).concat(arrows));
    } catch (error) {
      $quasar().notify({
        message: 'Failed to paste from clipboard.',
        type: 'negative',
      });

      mainLogger().error(error);
    }
  }

  cut() {
    this.copy();

    this.page.deleting.perform();
  }
}
