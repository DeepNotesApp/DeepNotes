import { concatUint8Arrays } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';

import type { PublicKey } from './public-key';

export function wrapPrivateKey(
  value: Uint8Array,
  params?: { locked?: boolean },
) {
  return new (class PrivateKey {
    get value() {
      if (params?.locked) {
        throw new Error('Private key is locked.');
      }

      return value;
    }

    lock() {
      params ??= {};
      params.locked = true;
    }

    encrypt(
      plaintext: Uint8Array,
      recipientsPublicKey: PublicKey,
      sendersPublicKey: PublicKey,
      params?: { padding?: boolean },
    ): Uint8Array {
      if (params?.padding) {
        plaintext = sodium.pad(plaintext, 8);
      }

      const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

      const ciphertext = sodium.crypto_box_easy(
        plaintext,
        nonce,
        recipientsPublicKey.value,
        value,
      );

      return concatUint8Arrays(sendersPublicKey.value, nonce, ciphertext);
    }
    decrypt(message: Uint8Array, params?: { padding?: boolean }): Uint8Array {
      const sendersPublicKey = message.slice(
        0,
        sodium.crypto_box_PUBLICKEYBYTES,
      );
      const nonce = message.slice(
        sendersPublicKey.length,
        sendersPublicKey.length + sodium.crypto_box_NONCEBYTES,
      );
      const ciphertext = message.slice(sendersPublicKey.length + nonce.length);

      let plaintext = sodium.crypto_box_open_easy(
        ciphertext,
        nonce,
        sendersPublicKey,
        value,
      );

      if (params?.padding) {
        plaintext = sodium.unpad(plaintext, 8);
      }

      return plaintext;
    }
  })();
}

export type PrivateKey = ReturnType<typeof wrapPrivateKey>;
