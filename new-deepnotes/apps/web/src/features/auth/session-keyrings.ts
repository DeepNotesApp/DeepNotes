import {
  base64ToBytes,
  createPrivateKeyring,
  createSymmetricKeyring,
  derivePasswordValues,
  ensureSodiumReady,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";

import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";
import {
  clearSessionCrypto,
  readSessionCrypto,
  writeSessionCrypto,
  type StoredSessionCrypto,
} from "./crypto-storage";

export type LoginSuccessPayload = {
  userId: string;
  sessionId: string;
  sessionKey: string;
  personalGroupId: string;
  publicKeyring: string;
  encryptedPrivateKeyring: string;
  encryptedSymmetricKeyring: string;
  passwordSalt?: string;
};

/**
 * After password login: unwrap `User*Keyring` with the password-derived key,
 * re-wrap with `SessionUser*Keyring`, and persist (plus raw session key for unwrap).
 */
export async function persistSessionKeyringsFromLogin(input: {
  login: LoginSuccessPayload;
  password: string;
}): Promise<void> {
  const { login, password } = input;
  if (login.passwordSalt == null || login.passwordSalt === "") {
    return;
  }
  await ensureSodiumReady();
  const preimage = loginPreimageFromPassword(password);
  const masterKey = derivePasswordValues({
    password: preimage,
    salt: base64ToBytes(login.passwordSalt),
  }).key;
  const sessionKey = wrapSymmetricKey(base64ToBytes(login.sessionKey));

  const encPrivB64 = uint8ToBase64(
    createPrivateKeyring(base64ToBytes(login.encryptedPrivateKeyring))
      .unwrapSymmetric(masterKey, {
        associatedData: {
          context: "UserPrivateKeyring",
          userId: login.userId,
        },
      })
      .wrapSymmetric(sessionKey, {
        associatedData: {
          context: "SessionUserPrivateKeyring",
          userId: login.userId,
        },
      }).wrappedValue,
  );

  const encSymB64 = uint8ToBase64(
    createSymmetricKeyring(base64ToBytes(login.encryptedSymmetricKeyring))
      .unwrapSymmetric(masterKey, {
        associatedData: {
          context: "UserSymmetricKeyring",
          userId: login.userId,
        },
      })
      .wrapSymmetric(sessionKey, {
        associatedData: {
          context: "SessionUserSymmetricKeyring",
          userId: login.userId,
        },
      }).wrappedValue,
  );

  writeSessionCrypto({
    sessionKeyB64: login.sessionKey,
    encryptedPrivateKeyringB64: encPrivB64,
    encryptedSymmetricKeyringB64: encSymB64,
    sessionId: login.sessionId,
    userId: login.userId,
    publicKeyringB64: login.publicKeyring,
    personalGroupId: login.personalGroupId,
  });
}

/** Rotate session-wrapped keyrings after `POST /api/sessions/refresh` (cookie rotation). */
export async function applyRefreshToStoredKeyrings(input: {
  oldSessionKey: string;
  newSessionKey: string;
}): Promise<void> {
  const stored = readSessionCrypto();
  if (stored == null) {
    return;
  }
  await ensureSodiumReady();
  const oldSk = wrapSymmetricKey(base64ToBytes(input.oldSessionKey));
  const newSk = wrapSymmetricKey(base64ToBytes(input.newSessionKey));
  const { userId } = stored;

  const privateKeyring = createPrivateKeyring(
    base64ToBytes(stored.encryptedPrivateKeyringB64),
  ).unwrapSymmetric(oldSk, {
    associatedData: {
      context: "SessionUserPrivateKeyring",
      userId,
    },
  });

  const symmetricKeyring = createSymmetricKeyring(
    base64ToBytes(stored.encryptedSymmetricKeyringB64),
  ).unwrapSymmetric(oldSk, {
    associatedData: {
      context: "SessionUserSymmetricKeyring",
      userId,
    },
  });

  const next: StoredSessionCrypto = {
    ...stored,
    sessionKeyB64: input.newSessionKey,
    encryptedPrivateKeyringB64: uint8ToBase64(
      privateKeyring.wrapSymmetric(newSk, {
        associatedData: {
          context: "SessionUserPrivateKeyring",
          userId,
        },
      }).wrappedValue,
    ),
    encryptedSymmetricKeyringB64: uint8ToBase64(
      symmetricKeyring.wrapSymmetric(newSk, {
        associatedData: {
          context: "SessionUserSymmetricKeyring",
          userId,
        },
      }).wrappedValue,
    ),
  };
  writeSessionCrypto(next);
}

export { clearSessionCrypto, readSessionCrypto };
export type { StoredSessionCrypto };
