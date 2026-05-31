import sodium from "libsodium-wrappers-sumo";

import { concatUint8Arrays } from "./bytes.js";

export function wrapSymmetricKey(
  value = sodium.crypto_aead_xchacha20poly1305_ietf_keygen(),
) {
  return new (class SymmetricKey {
    get value() {
      return value;
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
      if (params?.padding) {
        plaintext = sodium.pad(plaintext, 8);
      }

      const nonce =
        params?.nonce ??
        sodium.randombytes_buf(
          sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
        );

      const associatedData = JSON.stringify({
        app: "DeepNotes",
        extra: params?.associatedData ?? {},
      });

      const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        associatedData,
        null,
        nonce,
        value,
      );

      if (params?.includeNonce === false) {
        return ciphertext;
      }
      return concatUint8Arrays(nonce, ciphertext);
    }

    decrypt(
      nonceAndCiphertext: Uint8Array,
      params?: {
        nonce?: Uint8Array;
        associatedData?: object;
        padding?: boolean;
      },
    ): Uint8Array {
      let nonce: Uint8Array;
      let ciphertext: Uint8Array;

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

      const associatedData = JSON.stringify({
        app: "DeepNotes",
        extra: params?.associatedData ?? {},
      });

      let plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        ciphertext,
        associatedData,
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
