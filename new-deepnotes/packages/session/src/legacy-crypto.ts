import CryptoJS from "crypto-js";
import sodium from "libsodium-wrappers-sumo";
import { pack, unpack } from "msgpackr";
import {
  base64ToBytes,
  bytesToText,
  concatUint8Arrays,
} from "./crypto/bytes.js";
import { cryptoJsWordArrayToUint8Array } from "./crypto/crypto-js-wordarray.js";
import { wrapSymmetricKey } from "./crypto/symmetric-key.js";

export async function ensureSodiumReady(): Promise<void> {
  await sodium.ready;
}

export function derivePasswordValues(input: {
  password: Uint8Array;
  salt?: Uint8Array;
}) {
  input.salt ??= sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

  const derivedKey = sodium.crypto_pwhash(
    32 + 64,
    input.password,
    input.salt,
    2,
    32 * 1048576,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );

  return {
    key: wrapSymmetricKey(derivedKey.slice(0, 32)),
    hash: derivedKey.slice(32),
    salt: input.salt,
  };
}

export type PasswordValues = ReturnType<typeof derivePasswordValues>;

export function decryptUserRehashedLoginHash(
  userEncryptedRehashedLoginHash: Uint8Array,
  encryptionKeyB64: string,
): string {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return bytesToText(
    key.decrypt(userEncryptedRehashedLoginHash, {
      associatedData: { context: "UserRehashedLoginHash" },
    }),
  );
}

export { getPasswordHashValues } from "./crypto/password-hashing.js";

export function decryptUserAuthenticatorSecret(
  userEncryptedAuthenticatorSecret: Uint8Array,
  encryptionKeyB64: string,
): string {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return bytesToText(
    key.decrypt(userEncryptedAuthenticatorSecret, {
      associatedData: { context: "UserAuthenticatorSecret" },
    }),
  );
}

export function decryptRecoveryCodes(
  userEncryptedRecoveryCodes: Uint8Array,
  encryptionKeyB64: string,
): Uint8Array[] {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return unpack(
    key.decrypt(userEncryptedRecoveryCodes, {
      associatedData: { context: "UserRecoveryCodes" },
    }),
  );
}

export function encryptRecoveryCodes(
  userRecoveryCodes: Uint8Array[],
  encryptionKeyB64: string,
): Uint8Array {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return key.encrypt(pack(userRecoveryCodes), {
    associatedData: { context: "UserRecoveryCodes" },
  });
}

export function hashRecoveryCode(
  recoveryCode: string,
  salt?: Uint8Array,
): Uint8Array {
  salt ??= sodium.randombytes_buf(16);

  return concatUint8Arrays(
    salt,
    cryptoJsWordArrayToUint8Array(
      CryptoJS.SHA256(sodium.to_hex(salt) + recoveryCode),
    ),
  );
}

export function verifyRecoveryCode(
  recoveryCode: string,
  hashedRecoveryCode: Uint8Array,
): boolean {
  const salt = hashedRecoveryCode.slice(0, 16);

  return sodium.memcmp(
    hashedRecoveryCode.slice(16),
    hashRecoveryCode(recoveryCode, salt).slice(16),
  );
}
