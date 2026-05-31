import { argon2id } from "@noble/hashes/argon2.js";

import { wrapSymmetricKey } from "./symmetric-key.js";

const SALT_SIZE = 16;

function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  // Fallback for Node.js environments
  const { randomBytes } = require('node:crypto');
  return new Uint8Array(randomBytes(length));
}

export async function ensureSodiumReady(): Promise<void> {
  // No-op for noble - no async initialization needed
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
