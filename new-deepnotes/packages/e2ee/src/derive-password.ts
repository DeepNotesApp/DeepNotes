import { argon2id } from "@noble/hashes/argon2.js";

import { wrapSymmetricKey } from "./symmetric-key.js";

/** Fast Argon2 params in test environments; production hardness unchanged. */
const isTestEnv =
  typeof process !== "undefined" && process.env?.VITEST === "true";

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
    t: isTestEnv ? 1 : 2, // iterations
    m: isTestEnv ? 64 * 1024 : 32 * 1024, // memory in KB
    p: 1, // parallelism
    dkLen: 32 + 64, // output length
  });

  return {
    key: wrapSymmetricKey(derivedKey.slice(0, 32)),
    hash: derivedKey.slice(32),
    salt: input.salt,
  };
}
