/**
 * Session/login helpers: password derivation, server-encrypted user fields,
 * and recovery codes. Uses primitives in this folder (`wrapSymmetricKey`, etc.)
 * so stored Postgres blobs remain compatible.
 */
import CryptoJS from "crypto-js";
import { argon2id } from "@noble/hashes/argon2.js";
import { pack, unpack } from "msgpackr";

import {
  base64ToBytes,
  bytesToText,
  concatUint8Arrays,
  textToBytes,
} from "./bytes.js";
import { cryptoJsWordArrayToUint8Array } from "./crypto-js-wordarray.js";
import { wrapSymmetricKey } from "./symmetric-key.js";

export async function ensureSodiumReady(): Promise<void> {
  // No-op for noble - no async initialization needed
}

const SALT_SIZE = 16;

function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  // Fallback for Node.js environments
  const { randomBytes } = require('node:crypto');
  return new Uint8Array(randomBytes(length));
}

export function derivePasswordValues(input: {
  password: Uint8Array;
  salt?: Uint8Array;
}) {
  input.salt ??= getRandomBytes(SALT_SIZE);

  const derivedKey = argon2id(input.password, input.salt, {
    t: 2, // iterations
    m: 32 * 1024, // memory in KB (32MB)
    p: 1, // parallelism
    dkLen: 32 + 64, // output length
  });

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

export function encryptUserRehashedLoginHash(
  userRehashedLoginHashPhc: string,
  encryptionKeyB64: string,
): Uint8Array {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return key.encrypt(textToBytes(userRehashedLoginHashPhc), {
    associatedData: { context: "UserRehashedLoginHash" },
  });
}

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

export function encryptUserAuthenticatorSecret(
  userAuthenticatorSecret: string,
  encryptionKeyB64: string,
): Uint8Array {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return key.encrypt(textToBytes(userAuthenticatorSecret), {
    associatedData: { context: "UserAuthenticatorSecret" },
  });
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
  salt ??= getRandomBytes(16);

  return concatUint8Arrays(
    salt,
    cryptoJsWordArrayToUint8Array(
      CryptoJS.SHA256(Buffer.from(salt).toString('hex') + recoveryCode),
    ),
  );
}

export function verifyRecoveryCode(
  recoveryCode: string,
  hashedRecoveryCode: Uint8Array,
): boolean {
  const salt = hashedRecoveryCode.slice(0, 16);
  const computed = hashRecoveryCode(recoveryCode, salt).slice(16);
  const expected = hashedRecoveryCode.slice(16);

  if (computed.length !== expected.length) {
    return false;
  }

  // Constant-time comparison
  const { timingSafeEqual } = require('node:crypto');
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
  } catch {
    // Fallback for non-Node environments
    let result = 0;
    for (let i = 0; i < computed.length; i++) {
      result |= computed[i]! ^ expected[i]!;
    }
    return result === 0;
  }
}

/** PHC string for a group password (Argon2id, noble). */
export function computeGroupPasswordPhc(groupPasswordPrehash: Uint8Array): string {
  const salt = getRandomBytes(16);
  const hash = argon2id(groupPasswordPrehash, salt, {
    t: 2, // iterations
    m: 32 * 1024, // memory in KB (32MB)
    p: 1, // parallelism
    dkLen: 32, // output length
  });
  
  // Return in PHC format: $argon2id$v=19$m=32768,t=2,p=1$<salt>$<hash>
  const saltB64 = Buffer.from(salt).toString('base64').replace(/=+$/, '');
  const hashB64 = Buffer.from(hash).toString('base64').replace(/=+$/, '');
  return `$argon2id$v=19$m=32768,t=2,p=1$${saltB64}$${hashB64}`;
}

export function encryptGroupRehashedPasswordHash(
  groupRehashedPasswordHashPhc: string,
  encryptionKeyB64: string,
): Uint8Array {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return key.encrypt(textToBytes(groupRehashedPasswordHashPhc), {
    associatedData: { context: "GroupRehashedPasswordHash" },
  });
}

export function decryptGroupRehashedPasswordHash(
  groupEncryptedRehashedPasswordHash: Uint8Array,
  encryptionKeyB64: string,
): string {
  const key = wrapSymmetricKey(base64ToBytes(encryptionKeyB64));
  return bytesToText(
    key.decrypt(groupEncryptedRehashedPasswordHash, {
      associatedData: { context: "GroupRehashedPasswordHash" },
    }),
  );
}
