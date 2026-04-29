import {
  base64ToBytes,
  createSymmetricKeyring,
  ensureSodiumReady,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";
import { pack } from "msgpackr";

import { uint8ToBase64 } from "../auth/bytes";
import { readSessionCrypto } from "../auth/crypto-storage";

function defaultNotePacked(): Uint8Array {
  return pack({
    root: { noteIdxs: [0] },
    notes: [{ anchor: { y: 0 } }],
  });
}

function defaultArrowPacked(): Uint8Array {
  return pack({ color: "sky" });
}

/**
 * Re-encrypts built-in default note/arrow templates with the logged-in user’s symmetric key
 * (same plaintext shape as registration in {@link buildUserRegisterRequest}).
 */
export async function buildEncryptedUserDefaultTemplatesB64(): Promise<{
  userEncryptedDefaultNote: string;
  userEncryptedDefaultArrow: string;
} | null> {
  const stored = readSessionCrypto();
  if (stored == null) {
    return null;
  }
  await ensureSodiumReady();
  const sessionKey = wrapSymmetricKey(base64ToBytes(stored.sessionKeyB64));
  const userId = stored.userId;

  const symmetricKeyring = createSymmetricKeyring(
    base64ToBytes(stored.encryptedSymmetricKeyringB64),
  ).unwrapSymmetric(sessionKey, {
    associatedData: {
      context: "SessionUserSymmetricKeyring",
      userId,
    },
  });

  const userEncryptedDefaultNote = uint8ToBase64(
    symmetricKeyring.encrypt(defaultNotePacked(), {
      padding: true,
      associatedData: {
        context: "UserDefaultNote",
        userId,
      },
    }),
  );
  const userEncryptedDefaultArrow = uint8ToBase64(
    symmetricKeyring.encrypt(defaultArrowPacked(), {
      padding: true,
      associatedData: {
        context: "UserDefaultArrow",
        userId,
      },
    }),
  );

  return { userEncryptedDefaultNote, userEncryptedDefaultArrow };
}
