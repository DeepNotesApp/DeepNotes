/** Session-scoped crypto material for E2EE (mirrors legacy `sessionStorage` key names). */

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
  sessionStorage.setItem(CRYPTO_KEYS.sessionKey, data.sessionKeyB64);
  sessionStorage.setItem(
    CRYPTO_KEYS.encryptedPrivateKeyring,
    data.encryptedPrivateKeyringB64,
  );
  sessionStorage.setItem(
    CRYPTO_KEYS.encryptedSymmetricKeyring,
    data.encryptedSymmetricKeyringB64,
  );
  sessionStorage.setItem(CRYPTO_KEYS.sessionId, data.sessionId);
  sessionStorage.setItem(CRYPTO_KEYS.userId, data.userId);
  sessionStorage.setItem(CRYPTO_KEYS.publicKeyring, data.publicKeyringB64);
  sessionStorage.setItem(
    CRYPTO_KEYS.personalGroupId,
    data.personalGroupId,
  );
}

export function readSessionCrypto(): StoredSessionCrypto | null {
  const sessionKeyB64 = sessionStorage.getItem(CRYPTO_KEYS.sessionKey);
  const encryptedPrivateKeyringB64 = sessionStorage.getItem(
    CRYPTO_KEYS.encryptedPrivateKeyring,
  );
  const encryptedSymmetricKeyringB64 = sessionStorage.getItem(
    CRYPTO_KEYS.encryptedSymmetricKeyring,
  );
  const sessionId = sessionStorage.getItem(CRYPTO_KEYS.sessionId);
  const userId = sessionStorage.getItem(CRYPTO_KEYS.userId);
  const publicKeyringB64 = sessionStorage.getItem(CRYPTO_KEYS.publicKeyring);
  const personalGroupId = sessionStorage.getItem(CRYPTO_KEYS.personalGroupId);
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
    sessionStorage.removeItem(k);
  }
}
