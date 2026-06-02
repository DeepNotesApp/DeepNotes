/** Tab-shared crypto material for E2EE (stored in `localStorage` so auth survives new tabs). */

const P = "dn.";

export const CRYPTO_KEYS = {
  sessionKey: `${P}sessionKey`,
  encryptedPrivateKeyring: `${P}encryptedPrivateKeyring`,
  encryptedSymmetricKeyring: `${P}encryptedSymmetricKeyring`,
  sessionId: `${P}sessionId`,
  userId: `${P}userId`,
  publicKeyring: `${P}publicKeyring`,
  personalGroupId: `${P}personalGroupId`,
} as const;

export type StoredSessionCrypto = {
  sessionKeyB64: string;
  encryptedPrivateKeyringB64: string;
  encryptedSymmetricKeyringB64: string;
  sessionId: string;
  userId: string;
  publicKeyringB64: string;
  personalGroupId: string;
};

export function writeSessionCrypto(data: StoredSessionCrypto): void {
  localStorage.setItem(CRYPTO_KEYS.sessionKey, data.sessionKeyB64);
  localStorage.setItem(
    CRYPTO_KEYS.encryptedPrivateKeyring,
    data.encryptedPrivateKeyringB64,
  );
  localStorage.setItem(
    CRYPTO_KEYS.encryptedSymmetricKeyring,
    data.encryptedSymmetricKeyringB64,
  );
  localStorage.setItem(CRYPTO_KEYS.sessionId, data.sessionId);
  localStorage.setItem(CRYPTO_KEYS.userId, data.userId);
  localStorage.setItem(CRYPTO_KEYS.publicKeyring, data.publicKeyringB64);
  localStorage.setItem(
    CRYPTO_KEYS.personalGroupId,
    data.personalGroupId,
  );
}

export function readSessionCrypto(): StoredSessionCrypto | null {
  const sessionKeyB64 = localStorage.getItem(CRYPTO_KEYS.sessionKey);
  const encryptedPrivateKeyringB64 = localStorage.getItem(
    CRYPTO_KEYS.encryptedPrivateKeyring,
  );
  const encryptedSymmetricKeyringB64 = localStorage.getItem(
    CRYPTO_KEYS.encryptedSymmetricKeyring,
  );
  const sessionId = localStorage.getItem(CRYPTO_KEYS.sessionId);
  const userId = localStorage.getItem(CRYPTO_KEYS.userId);
  const publicKeyringB64 = localStorage.getItem(CRYPTO_KEYS.publicKeyring);
  const personalGroupId = localStorage.getItem(CRYPTO_KEYS.personalGroupId);
  if (
    sessionKeyB64 == null ||
    encryptedPrivateKeyringB64 == null ||
    encryptedSymmetricKeyringB64 == null ||
    sessionId == null ||
    userId == null ||
    publicKeyringB64 == null ||
    personalGroupId == null
  ) {
    return null;
  }
  return {
    sessionKeyB64,
    encryptedPrivateKeyringB64,
    encryptedSymmetricKeyringB64,
    sessionId,
    userId,
    publicKeyringB64,
    personalGroupId,
  };
}

export function clearSessionCrypto(): void {
  for (const k of Object.values(CRYPTO_KEYS)) {
    localStorage.removeItem(k);
  }
}
