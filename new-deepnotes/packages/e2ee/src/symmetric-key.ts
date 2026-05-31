import { xchacha20poly1305 } from "@noble/ciphers/chacha";

import { concatUint8Arrays, textToBytes } from "./bytes.js";
import { getRandomBytes, pad, unpad, KEY_SIZE } from "./crypto-utils.js";

const XCHACHA20_NONCE_SIZE = 24;

export function wrapSymmetricKey(
  value = getRandomBytes(KEY_SIZE),
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
        plaintext = pad(plaintext, 8);
      }

      const nonce =
        params?.nonce ??
        getRandomBytes(XCHACHA20_NONCE_SIZE);

      const associatedData = JSON.stringify({
        app: "DeepNotes",
        extra: params?.associatedData ?? {},
      });

      const ad = textToBytes(associatedData);
      const ciphertext = xchacha20poly1305(value, nonce, ad).encrypt(plaintext);

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
        nonce = nonceAndCiphertext.slice(0, XCHACHA20_NONCE_SIZE);
        ciphertext = nonceAndCiphertext.slice(XCHACHA20_NONCE_SIZE);
      }

      const associatedData = JSON.stringify({
        app: "DeepNotes",
        extra: params?.associatedData ?? {},
      });

      const ad = textToBytes(associatedData);
      let plaintext = xchacha20poly1305(value, nonce, ad).decrypt(ciphertext) as Uint8Array;

      if (params?.padding) {
        plaintext = unpad(plaintext, 8);
      }

      return plaintext;
    }
  })();
}

export type SymmetricKey = ReturnType<typeof wrapSymmetricKey>;
