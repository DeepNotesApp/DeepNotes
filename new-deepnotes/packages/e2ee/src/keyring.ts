import { addDays } from "./datetime.js";

import type { KeyPair } from "./key-pair.js";
import type { PrivateKey } from "./private-key.js";
import type { PublicKey } from "./public-key.js";
import type { SymmetricKey } from "./symmetric-key.js";
import type { Wrappable } from "./wrapped-data.js";
import { DataLayer, WrappedData } from "./wrapped-data.js";

export interface KeyMetadata {
  rotationDate: Date;
}

export interface IKeyring extends Wrappable {
  get keyMetadata(): KeyMetadata[];

  get content(): Uint8Array;
  get wrappedValue(): Uint8Array;

  addKey(key: Uint8Array): IKeyring;
}

/** Legacy-style factory; return type is intentionally loose to avoid circular `IKeyring` inference. */
export function createKeyring(
  value: Uint8Array,
  params?: { raw?: boolean; locked?: boolean },
): any {
  const raw = params?.raw ?? value.length <= 32;

  const _wrappedData = new WrappedData(value, {
    raw,
  });

  return new (class Keyring implements Wrappable, IKeyring {
    keys: Uint8Array[] = [];

    constructor() {
      if (_wrappedData.topLayer !== DataLayer.Raw) {
        return;
      }

      this.keys = decodeKeys(_wrappedData.content);

      const meta = _wrappedData.metadata as { keys?: KeyMetadata[] };
      if (meta.keys == null) {
        meta.keys = new Array(this.keys.length).fill({
          rotationDate: new Date(),
        });
      }

      this.trimExpiredKeys();
    }

    trimExpiredKeys() {
      if (_wrappedData.topLayer !== DataLayer.Raw) {
        throw new Error("Cannot trim keys on non-raw keyring.");
      }

      const currentDate = new Date();
      const meta = _wrappedData.metadata as { keys: KeyMetadata[] };

      const unexpiredIndexes = this.keys
        .map((_, index) => index)
        .filter((index) => {
          return (
            index === 0 ||
            addDays(meta.keys[index]!.rotationDate, 1) > currentDate
          );
        });

      this.keys = this.keys.filter((_, index) =>
        unexpiredIndexes.includes(index),
      );
      _wrappedData.content = encodeKeys(this.keys);

      meta.keys = meta.keys.filter((_, index) =>
        unexpiredIndexes.includes(index),
      );
    }

    get layers() {
      return _wrappedData.layers;
    }
    get topLayer() {
      return _wrappedData.topLayer;
    }
    hasLayer(layer: DataLayer) {
      return _wrappedData.hasLayer(layer);
    }
    countLayerType(layer: DataLayer) {
      return _wrappedData.countLayerType(layer);
    }

    get topKey() {
      return this.keys[0];
    }

    get keyMetadata(): KeyMetadata[] {
      return (_wrappedData.metadata as { keys: KeyMetadata[] }).keys;
    }

    clone() {
      return createKeyring(_wrappedData.value);
    }

    addKey(key: Uint8Array) {
      if (_wrappedData.topLayer !== DataLayer.Raw) {
        throw new Error("Cannot add key to non-raw keyring.");
      }

      const result = this.clone();
      result.keyMetadata[0]!.rotationDate = new Date();
      result.keys.unshift(key);
      result.keyMetadata.unshift({ rotationDate: new Date() });
      result.trimExpiredKeys();
      return result;
    }

    get content() {
      return _wrappedData.content;
    }
    get wrappedValue() {
      return _wrappedData.value;
    }
    get value() {
      return this.topKey!;
    }

    wrapSymmetric(
      symmetricKey: SymmetricKey,
      params?: {
        nonce?: Uint8Array;
        includeNonce?: boolean;
        associatedData?: object;
        padding?: boolean;
      },
    ) {
      return createKeyring(
        _wrappedData.wrapSymmetric(symmetricKey, params).value,
      );
    }
    unwrapSymmetric(
      symmetricKey: SymmetricKey,
      params?: {
        nonce?: Uint8Array;
        associatedData?: object;
        padding?: boolean;
      },
    ) {
      return createKeyring(
        _wrappedData.unwrapSymmetric(symmetricKey, params).value,
      );
    }

    wrapAsymmetric(
      keyPair: KeyPair,
      recipientsPublicKey: PublicKey,
      params?: { padding?: boolean },
    ) {
      return createKeyring(
        _wrappedData.wrapAsymmetric(keyPair, recipientsPublicKey, params).value,
      );
    }
    unwrapAsymmetric(privateKey: PrivateKey, params?: { padding?: boolean }) {
      return createKeyring(
        _wrappedData.unwrapAsymmetric(privateKey, params).value,
      );
    }
  })();
}

export type Keyring = ReturnType<typeof createKeyring>;

export function decodeKeys(input: Uint8Array): Uint8Array[] {
  const keys: Uint8Array[] = [];
  for (let i = 0; i < input.length / 32; ++i) {
    keys.push(input.slice(i * 32, i * 32 + 32));
  }
  return keys;
}

export function encodeKeys(keys: Uint8Array[]): Uint8Array {
  return Uint8Array.from(
    keys.reduce<number[]>((acc, key) => acc.concat(Array.from(key)), []),
  );
}
