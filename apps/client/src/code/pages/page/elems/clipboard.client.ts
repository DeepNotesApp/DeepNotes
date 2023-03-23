import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { getClipboardText, setClipboardText } from '@stdlib/misc';
import { pack, unpack } from 'msgpackr';

import { ISerialObject } from '../../serialization.client';
import type { Page } from '../page.client';
import type { PageElem } from './elem.client';

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

    const worldRect = this.page.regions.getWorldRect(this.page.selection.react);

    if (worldRect == null) {
      return;
    }

    const worldCenter = worldRect.center;

    for (const noteIndex of clipboardObj.root.noteIdxs) {
      const clipboardNote = clipboardObj.notes[noteIndex];

      clipboardNote.pos.x -= worldCenter.x;
      clipboardNote.pos.y -= worldCenter.y;
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

      // Center notes around destination

      const worldRect = this.page.regions.getWorldRect(
        this.page.selection.react,
      );

      let destCenter;

      if (worldRect != null) {
        if (this.page.activeRegion.react.value.type === 'page') {
          destCenter = worldRect.center.addScalar(8);
        } else {
          destCenter = worldRect.center.addScalar(8);
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
