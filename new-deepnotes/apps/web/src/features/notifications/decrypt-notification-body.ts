import { unpack } from "msgpackr";

import {
  base64ToBytes,
  createPrivateKeyring,
  ensureSodiumReady,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";

import { readSessionCrypto } from "../auth/crypto-storage";

/**
 * Mirrors legacy realtime `USER_NOTIFICATION`: unwrap session private keyring,
 * box-open symmetric key ciphertext, symmetric-decrypt notification body with
 * `UserNotificationContent` AEAD scope, then unpack msgpack.
 */
export async function tryDecryptNotificationBody(input: {
  encryptedSymmetricKey: string;
  encryptedContent: string;
}): Promise<unknown | null> {
  const stored = readSessionCrypto();
  if (stored == null) {
    return null;
  }
  await ensureSodiumReady();
  const sessionKey = wrapSymmetricKey(base64ToBytes(stored.sessionKeyB64));

  try {
    const privateKeyring = createPrivateKeyring(
      base64ToBytes(stored.encryptedPrivateKeyringB64),
    ).unwrapSymmetric(sessionKey, {
      associatedData: {
        context: "SessionUserPrivateKeyring",
        userId: stored.userId,
      },
    });

    const symmetricKeyMat = privateKeyring.decrypt(
      base64ToBytes(input.encryptedSymmetricKey),
      { padding: true },
    );

    const symmetricKey = wrapSymmetricKey(symmetricKeyMat);

    const plaintext = symmetricKey.decrypt(
      base64ToBytes(input.encryptedContent),
      {
        padding: true,
        associatedData: { context: "UserNotificationContent" },
      },
    );

    return unpack(plaintext);
  } catch {
    return null;
  }
}

/** Present msgpack payloads readably in the UI. */
export function formatNotificationPayload(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
