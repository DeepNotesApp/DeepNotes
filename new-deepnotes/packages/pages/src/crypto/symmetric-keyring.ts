import type { KeyPair } from "./key-pair.js";
import type { PrivateKey } from "./private-key.js";
import type { PublicKey } from "./public-key.js";
import type { SymmetricKey } from "./symmetric-key.js";
import { wrapSymmetricKey } from "./symmetric-key.js";
import type { IKeyring, KeyMetadata } from "./keyring.js";
import { createKeyring } from "./keyring.js";
import { DataLayer } from "./wrapped-data.js";

const KEY_SIZE = 32;

function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  // Fallback for Node.js environments
  const { randomBytes } = require('node:crypto');
  return new Uint8Array(randomBytes(length));
}

export function createSymmetricKeyring(
  value = getRandomBytes(KEY_SIZE),
  params?: { raw?: boolean; locked?: boolean },
): any {
  const _keyring = createKeyring(value, params);

  return new (class SymmetricKeyring implements IKeyring {
    keys: SymmetricKey[] = [];

    get topKey(): SymmetricKey {
      return this.keys[0]!;
    }

    addKey(key = getRandomBytes(KEY_SIZE)) {
      return createSymmetricKeyring(_keyring.addKey(key).wrappedValue);
    }

    constructor() {
      this.keys = _keyring.keys.map((key: Uint8Array) =>
        wrapSymmetricKey(key),
      );
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

    get layers() {
      return _keyring.layers;
    }
    get topLayer() {
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
      let lastError: unknown;
      for (let i = 0; i < this.keys.length; i++) {
        try {
          return this.keys[i]!.decrypt(ciphertext, params);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    }
  })();
}

export type SymmetricKeyring = ReturnType<typeof createSymmetricKeyring>;
