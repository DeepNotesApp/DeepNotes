import type { PrivateKey } from './private-key';
import type { PublicKey } from './public-key';

export function wrapKeyPair(publicKey: PublicKey, privateKey: PrivateKey) {
  return new (class KeyPair {
    get publicKey() {
      return publicKey;
    }
    get privateKey() {
      return privateKey;
    }

    encrypt(
      plaintext: Uint8Array,
      recipientsPublicKey: PublicKey,
      params?: { padding?: boolean },
    ): Uint8Array {
      return privateKey.encrypt(
        plaintext,
        recipientsPublicKey,
        publicKey,
        params,
      );
    }
    decrypt(
      ciphertext: Uint8Array,
      params?: { padding?: boolean },
    ): Uint8Array {
      return privateKey.decrypt(ciphertext, params);
    }
  })();
}

export type KeyPair = ReturnType<typeof wrapKeyPair>;
