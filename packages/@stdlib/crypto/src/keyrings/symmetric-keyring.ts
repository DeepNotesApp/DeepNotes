import sodium from 'libsodium-wrappers-sumo';

import type { KeyPair, PrivateKey, PublicKey, SymmetricKey } from '..';
import type { DataLayer } from '..';
import { wrapSymmetricKey } from '..';
import type { IKeyring, KeyMetadata } from './keyring';
import { createKeyring } from './keyring';

export function createSymmetricKeyring(
  value = sodium.crypto_aead_xchacha20poly1305_ietf_keygen(),
  params?: { raw?: boolean; locked?: boolean },
) {
  const _keyring = createKeyring(value, params);

  return new (class SymmetricKeyring implements IKeyring, SymmetricKey {
    keys: SymmetricKey[] = [];

    get topKey(): SymmetricKey {
      return this.keys[0];
    }

    addKey(key = sodium.crypto_aead_xchacha20poly1305_ietf_keygen()) {
      return createSymmetricKeyring(_keyring.addKey(key).wrappedValue);
    }

    constructor() {
      this.keys = _keyring.keys.map((key) => wrapSymmetricKey(key));
    }

    get keyMetadata(): KeyMetadata[] {
      return _keyring.keyMetadata;
    }
    get content(): Uint8Array {
      return _keyring.content;
    }
    get wrappedValue(): Uint8Array {
      return _keyring.wrappedValue;
    }
    get value(): Uint8Array {
      return _keyring.value;
    }

    get layers(): DataLayer[] {
      return _keyring.layers;
    }
    get topLayer(): any {
      return _keyring.topLayer;
    }
    hasLayer(layer: DataLayer) {
      return _keyring.hasLayer(layer);
    }
    countLayerType(layer: DataLayer) {
      return _keyring.countLayerType(layer);
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
        _keyring.wrapSymmetric(symmetricKey, params).wrappedValue,
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
        _keyring.unwrapSymmetric(symmetricKey, params).wrappedValue,
      );
    }

    wrapAsymmetric(
      keyPair: KeyPair,
      recipientsPublicKey: PublicKey,
      params?: { padding?: boolean },
    ) {
      return createSymmetricKeyring(
        _keyring.wrapAsymmetric(keyPair, recipientsPublicKey, params)
          .wrappedValue,
      );
    }
    unwrapAsymmetric(privateKey: PrivateKey, params?: { padding?: boolean }) {
      return createSymmetricKeyring(
        _keyring.unwrapAsymmetric(privateKey, params).wrappedValue,
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
      let _error;

      for (let i = 0; i < this.keys.length; i++) {
        try {
          return this.keys[i].decrypt(ciphertext, params);
        } catch (error) {
          _error = error;
        }
      }

      throw _error;
    }
  })();
}
export type SymmetricKeyring = ReturnType<typeof createSymmetricKeyring>;
