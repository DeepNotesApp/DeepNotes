import { concatUint8Arrays } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';

export function wrapSymmetricKey(
  value = sodium.crypto_aead_xchacha20poly1305_ietf_keygen(),
  params?: { locked?: boolean },
) {
  return new (class SymmetricKey {
    get value() {
      if (params?.locked) {
        throw new Error('Symmetric key is locked.');
      }

      return value;
    }

    lock() {
      params ??= {};
      params.locked = true;
    }

    encrypt(
      plaintext: Uint8Array,
      params?: {
        nonce?: Uint8Array;
        includeNonce?: boolean;
        additionalData?: string;
        padding?: boolean;
      },
    ): Uint8Array {
      if (params?.padding) {
        plaintext = sodium.pad(plaintext, 8);
      }

      const nonce =
        params?.nonce ??
        sodium.randombytes_buf(
          sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
        );

      const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        params?.additionalData ?? null,
        null, // Not used by the algorithm
        nonce,
        value,
      );

      if (params?.includeNonce === false) {
        return ciphertext;
      } else {
        return concatUint8Arrays(nonce, ciphertext);
      }
    }
    decrypt(
      nonceAndCiphertext: Uint8Array,
      params?: {
        nonce?: Uint8Array;
        additionalData?: string;
        padding?: boolean;
      },
    ): Uint8Array {
      let nonce;
      let ciphertext;

      if (params?.nonce != null) {
        nonce = params.nonce;
        ciphertext = nonceAndCiphertext;
      } else {
        nonce = nonceAndCiphertext.slice(
          0,
          sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
        );
        ciphertext = nonceAndCiphertext.slice(
          sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
        );
      }

      let plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null, // Not used by the algorithm
        ciphertext,
        params?.additionalData ?? null,
        nonce,
        value,
      );

      if (params?.padding) {
        plaintext = sodium.unpad(plaintext, 8);
      }

      return plaintext;
    }
  })();
}

export type SymmetricKey = ReturnType<typeof wrapSymmetricKey>;
