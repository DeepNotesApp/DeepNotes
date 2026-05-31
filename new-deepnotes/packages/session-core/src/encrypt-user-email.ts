import { base64ToBytes, bytesToText, textToBytes } from "./crypto/bytes.js";
import { wrapSymmetricKey } from "./crypto/symmetric-key.js";

function normalizeEmail(email: string, exceptions: string): string {
  return exceptions.split(";").includes(email) ? email : email.toLowerCase();
}

/**
 * Legacy `@deeplib/data` `encryptUserEmail` (XChaCha20-Poly1305, padding, AAD `UserEmail`).
 */
export function encryptUserEmail(
  email: string,
  encryptionKeyB64: string,
  exceptions: string,
): Uint8Array {
  const normalized = normalizeEmail(email, exceptions);
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return key.encrypt(textToBytes(normalized), {
    padding: true,
    associatedData: { context: "UserEmail" },
  });
}

/**
 * Decrypts ciphertext from {@link encryptUserEmail} (same key and `EMAIL_CASE_SENSITIVITY_EXCEPTIONS` rules).
 */
export function decryptUserEmail(
  encrypted: Uint8Array,
  encryptionKeyB64: string,
  exceptions: string,
): string {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  const plaintext = key.decrypt(encrypted, {
    padding: true,
    associatedData: { context: "UserEmail" },
  });
  return normalizeEmail(bytesToText(plaintext), exceptions);
}
