import { addHours } from '@stdlib/misc';
import { pack } from 'msgpackr';
import { describe } from 'vitest';

import { DataLayer, wrapSymmetricKey } from '..';
import { createKeyring } from './keyring';

describe('Keyring', () => {
  it('should work with new format', () => {
    const keyring = createKeyring(
      new Uint8Array([
        3,
        ...pack({
          layers: [1, 2, 1, 0],
          metadata: {
            keys: [
              { rotationDate: new Date() },
              { rotationDate: new Date() },
              { rotationDate: new Date() },
            ],
          },
          content: new Uint8Array(96),
        }),
      ]),
    );

    expect(keyring.layers).toEqual([1, 2, 1, 0]);
  });

  it('should work with old format', () => {
    const keyring = createKeyring(
      new Uint8Array([1, 2, 1, 0, ...new Uint8Array(32)]),
    );

    expect(keyring.layers).toEqual([1, 2, 1, 0]);
  });

  it('should have correct metadata on raw keyring', () => {
    let keyring = createKeyring(new Uint8Array([0, ...new Uint8Array(96)]));

    expect(keyring.layers).toEqual([DataLayer.Raw]);

    keyring = keyring.wrapSymmetric(wrapSymmetricKey(new Uint8Array(32)));

    expect(keyring.layers).toEqual([DataLayer.Symmetric, DataLayer.Raw]);

    keyring = keyring.unwrapSymmetric(wrapSymmetricKey(new Uint8Array(32)));

    expect(keyring.layers).toEqual([DataLayer.Raw]);

    expect(keyring.keyMetadata.length).toEqual(3);
    expect(keyring.keyMetadata[0].rotationDate).toBeTruthy();
    expect(keyring.keyMetadata[1].rotationDate).toBeTruthy();
    expect(keyring.keyMetadata[2].rotationDate).toBeTruthy();
  });

  it('should keep at least one key after trimming', () => {
    const currentDate = new Date();

    const keyring = createKeyring(
      new Uint8Array([
        3,
        ...pack({
          layers: [DataLayer.Raw],
          metadata: {
            keys: [
              { rotationDate: addHours(currentDate, -26) },
              { rotationDate: addHours(currentDate, -27) },
              { rotationDate: addHours(currentDate, -28) },
            ],
          },
          content: new Uint8Array(32 * 3),
        }),
      ]),
    );

    expect(keyring.keys.length).toEqual(1);
    expect(keyring.keyMetadata.length).toEqual(1);

    expect(keyring.keyMetadata[0].rotationDate).toEqual(
      addHours(currentDate, -26),
    );
  });

  it('should correctly trim expired keys', () => {
    const currentDate = new Date();

    const keyring = createKeyring(
      new Uint8Array([
        3,
        ...pack({
          layers: [DataLayer.Raw],
          metadata: {
            keys: [
              { rotationDate: addHours(currentDate, -12) },
              { rotationDate: addHours(currentDate, -22) },
              { rotationDate: addHours(currentDate, -26) },
              { rotationDate: addHours(currentDate, -27) },
            ],
          },
          content: new Uint8Array(32 * 4),
        }),
      ]),
    );

    expect(keyring.keys.length).toEqual(2);
    expect(keyring.keyMetadata.length).toEqual(2);

    expect(keyring.keyMetadata[0].rotationDate).toEqual(
      addHours(currentDate, -12),
    );
    expect(keyring.keyMetadata[1].rotationDate).toEqual(
      addHours(currentDate, -22),
    );
  });

  it("should reset old key's rotation date after rotation", () => {
    const currentDate = new Date();

    const oldKeyring = createKeyring(
      new Uint8Array([
        3,
        ...pack({
          layers: [DataLayer.Raw],
          metadata: {
            keys: [
              { rotationDate: addHours(currentDate, -12) },
              { rotationDate: addHours(currentDate, -22) },
              { rotationDate: addHours(currentDate, -26) },
              { rotationDate: addHours(currentDate, -27) },
            ],
          },
          content: new Uint8Array(32 * 4),
        }),
      ]),
    );

    const newKeyring = oldKeyring.addKey(new Uint8Array(32));

    expect(newKeyring.keys.length).toEqual(3);

    expect(newKeyring.keyMetadata[1].rotationDate).toSatisfy(
      (date: Date) => Math.abs(date.getTime() - currentDate.getTime()) < 1000,
    );
  });
});
