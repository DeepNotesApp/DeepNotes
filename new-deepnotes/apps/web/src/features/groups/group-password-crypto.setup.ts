import { randomBytes } from "node:crypto";

import {
  bytesToBase64,
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  ensureSodiumReady,
  wrapKeyPair,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";

import { uint8ToBase64 } from "../auth/bytes";
import { clearSessionCrypto, writeSessionCrypto } from "../auth/crypto-storage";

export async function setupSession(groupId: string, userId: string) {
  await ensureSodiumReady();
  clearSessionCrypto();

  const sessionKey = wrapSymmetricKey(randomBytes(32));
  const publicKeyring = createKeyring(randomBytes(32));
  const privateKeyring = createPrivateKeyring(randomBytes(32));
  const keyPair = wrapKeyPair(publicKeyring, privateKeyring);

  const userEncryptedPrivateKeyring = privateKeyring
    .wrapSymmetric(sessionKey, {
      associatedData: { context: "SessionUserPrivateKeyring", userId },
    })
    .wrappedValue;

  writeSessionCrypto({
    userId,
    sessionId: "s12345678901234567890",
    sessionKeyB64: bytesToBase64(sessionKey.value),
    publicKeyringB64: bytesToBase64(publicKeyring.wrappedValue),
    encryptedPrivateKeyringB64: uint8ToBase64(userEncryptedPrivateKeyring),
    encryptedSymmetricKeyringB64: uint8ToBase64(
      createSymmetricKeyring().wrapSymmetric(sessionKey, {
        associatedData: { context: "SessionUserSymmetricKeyring", userId },
      }).wrappedValue,
    ),
    personalGroupId: groupId,
  });

  return { keyPair };
}
