import { x25519 } from "@noble/curves/ed25519.js";
import { xsalsa20poly1305 } from "@noble/ciphers/salsa";

import { concatUint8Arrays } from "./bytes.js";
import { getRandomBytes, pad, unpad } from "@deepnotes/e2ee";

import type { PublicKey } from "./public-key.js";

const NONCE_SIZE = 24;
const PUBLIC_KEY_SIZE = 32;

export function wrapPrivateKey(value: Uint8Array) {
  return new (class PrivateKey {
    get value() {
      return value;
    }

    encrypt(
      plaintext: Uint8Array,
      recipientsPublicKey: PublicKey,
      sendersPublicKey: PublicKey,
      params?: { padding?: boolean },
    ): Uint8Array {
      if (params?.padding) {
        plaintext = pad(plaintext, 8);
      }

      const nonce = getRandomBytes(NONCE_SIZE);

      // Compute shared secret using X25519
      const sharedSecret = x25519.getSharedSecret(value, recipientsPublicKey.value);
      
      // Encrypt using XSalsa20-Poly1305
      const ciphertext = xsalsa20poly1305(sharedSecret, nonce).encrypt(plaintext);

      return concatUint8Arrays(sendersPublicKey.value, nonce, ciphertext);
    }

    decrypt(message: Uint8Array, params?: { padding?: boolean }): Uint8Array {
      const sendersPublicKey = message.slice(0, PUBLIC_KEY_SIZE);
      const nonce = message.slice(
        sendersPublicKey.length,
        sendersPublicKey.length + NONCE_SIZE,
      );
      const ciphertext = message.slice(sendersPublicKey.length + nonce.length);

      // Compute shared secret using X25519
      const sharedSecret = x25519.getSharedSecret(value, sendersPublicKey);
      
      // Decrypt using XSalsa20-Poly1305
      let plaintext = xsalsa20poly1305(sharedSecret, nonce).decrypt(ciphertext) as Uint8Array;

      if (params?.padding) {
        plaintext = unpad(plaintext, 8);
      }

      return plaintext;
    }
  })();
}

export type PrivateKey = ReturnType<typeof wrapPrivateKey>;
