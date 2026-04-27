import { base64ToBytes, textToBytes } from "./crypto/bytes.js";
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
