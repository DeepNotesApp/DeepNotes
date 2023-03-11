import sodium from 'libsodium-wrappers';

import type { KeyPair } from './key-pair';
import type { PrivateKey } from './private-key';
import type { PublicKey } from './public-key';
import type { SymmetricKey } from './symmetric-key';
import { wrapSymmetricKey } from './symmetric-key';
import { DataLayer, wrapData } from './wrapped-data';

export function createSymmetricKeyring(
  value = sodium.crypto_aead_xchacha20poly1305_ietf_keygen(),
  params?: { maxKeys?: number; raw?: boolean; locked?: boolean },
) {
  const _wrappedData = wrapData(value, {
    raw: value.length <= 32,

    ...params,
  });

  const _keys: SymmetricKey[] = [];

  if (_wrappedData.topLayer === DataLayer.Raw) {
    for (
      let i = 0;
      i <
      Math.min(
        _wrappedData.content.length / 32,
        params?.maxKeys ?? (process.env.DEV ? 1 : 3),
      );
      ++i
    ) {
      _keys.push(
        wrapSymmetricKey(
          _wrappedData.content.slice(i * 32, i * 32 + 32),
          params,
        ),
      );
    }

    _wrappedData.content = _wrappedData.content.slice(0, _keys.length * 32);
  }

  return new (class SymmetricKeyring implements SymmetricKey {
    lock() {
      params ??= {};
      params.locked = true;
    }

    get keys() {
      return _keys;
    }
    get topKey() {
      return _keys[0];
    }
    addKey() {
      if (_wrappedData.topLayer !== DataLayer.Raw) {
        throw new Error('Cannot add key to non-raw keyring.');
      }

      return createSymmetricKeyring(
        new Uint8Array([
          ..._wrappedData.layers,
          ...sodium.crypto_aead_xchacha20poly1305_ietf_keygen(),
          ..._wrappedData.content,
        ]),
        { ...params, raw: false },
      );
    }

    encrypt(
      plaintext: Uint8Array,
      params?: {
        nonce?: Uint8Array;
        includeNonce?: boolean;
        associatedData?: object;
        padding?: boolean;
      },
    ): Uint8Array {
      if (_wrappedData.topLayer !== DataLayer.Raw) {
        throw new Error('Cannot encrypt with non-raw keyring.');
      }

      return this.topKey.encrypt(plaintext, params);
    }
    decrypt(
      ciphertext: Uint8Array,
      params?: {
        nonce?: Uint8Array;
        includeNonce?: boolean;
        associatedData?: object;
        padding?: boolean;
      },
    ): Uint8Array {
      if (_wrappedData.topLayer !== DataLayer.Raw) {
        throw new Error('Cannot decrypt with non-raw keyring.');
      }

      let _error;

      for (let i = 0; i < _keys.length; i++) {
        try {
          return _keys[i].decrypt(ciphertext, params);
        } catch (error) {
          _error = error;
        }
      }

      throw _error;
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

    get fullValue(): Uint8Array {
      if (params?.locked) {
        throw new Error('Symmetric keyring is locked.');
      }

      return _wrappedData.value;
    }
    get content(): Uint8Array {
      if (params?.locked) {
        throw new Error('Symmetric keyring is locked.');
      }

      return _wrappedData.content;
    }
    get value(): Uint8Array {
      return this.topKey.value;
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
      return createSymmetricKeyring(
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
      return createSymmetricKeyring(
        _wrappedData.unwrapSymmetric(symmetricKey, params).value,
      );
    }

    wrapAsymmetric(
      keyPair: KeyPair,
      recipientsPublicKey: PublicKey,
      params?: { padding?: boolean },
    ) {
      return createSymmetricKeyring(
        _wrappedData.wrapAsymmetric(keyPair, recipientsPublicKey, params).value,
      );
    }
    unwrapAsymmetric(privateKey: PrivateKey, params?: { padding?: boolean }) {
      return createSymmetricKeyring(
        _wrappedData.unwrapAsymmetric(privateKey, params).value,
      );
    }
  })();
}

export type SymmetricKeyring = ReturnType<typeof createSymmetricKeyring>;
