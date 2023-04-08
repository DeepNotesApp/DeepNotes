import type { KeyPair, PrivateKey, PublicKey, SymmetricKey } from '..';
import { wrapPrivateKey } from '..';
import { DataLayer } from '..';
import type { IKeyring, KeyMetadata } from './keyring';
import { createKeyring } from './keyring';

export function createPrivateKeyring(
  value: Uint8Array,
  params?: { raw?: boolean },
) {
  const _keyring = createKeyring(value, params);

  return new (class PrivateKeyring implements IKeyring, PrivateKey {
    keys: PrivateKey[] = [];

    get topKey(): PrivateKey {
      return this.keys[0];
    }

    addKey(key: Uint8Array) {
      return createPrivateKeyring(_keyring.addKey(key).wrappedValue);
    }

    constructor() {
      this.keys = _keyring.keys.map((key) => wrapPrivateKey(key));
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
      return createPrivateKeyring(
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
      return createPrivateKeyring(
        _keyring.unwrapSymmetric(symmetricKey, params).wrappedValue,
      );
    }

    wrapAsymmetric(
      keyPair: KeyPair,
      recipientsPublicKey: PublicKey,
      params?: { padding?: boolean },
    ) {
      return createPrivateKeyring(
        _keyring.wrapAsymmetric(keyPair, recipientsPublicKey, params)
          .wrappedValue,
      );
    }
    unwrapAsymmetric(privateKey: PrivateKey, params?: { padding?: boolean }) {
      return createPrivateKeyring(
        _keyring.unwrapAsymmetric(privateKey, params).wrappedValue,
      );
    }

    encrypt(
      plaintext: Uint8Array,
      recipientsPublicKey: PublicKey,
      sendersPublicKey: PublicKey,
      params?: { padding?: boolean },
    ): Uint8Array {
      if (_keyring.topLayer !== DataLayer.Raw) {
        throw new Error('Cannot encrypt with non-raw keyring.');
      }

      return this.topKey.encrypt(
        plaintext,
        recipientsPublicKey,
        sendersPublicKey,
        params,
      );
    }
    decrypt(
      ciphertext: Uint8Array,
      params?: { padding?: boolean },
    ): Uint8Array {
      if (_keyring.topLayer !== DataLayer.Raw) {
        throw new Error('Cannot decrypt with non-raw keyring.');
      }

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
export type PrivateKeyring = ReturnType<typeof createPrivateKeyring>;
