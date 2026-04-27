import sodium from "libsodium-wrappers-sumo";

import { wrapSymmetricKey } from "./symmetric-key.js";

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
