import { argon2id } from "@noble/hashes/argon2.js";

import { wrapSymmetricKey } from "./symmetric-key.js";

/** Fast Argon2 params in test environments; production hardness unchanged. */
const isTestEnv =
  typeof process !== "undefined" && process.env?.VITEST === "true";

/** Legacy nanoid alphabet (must match `@stdlib/misc` / client). */
const alphabet =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

const charMap = new Map<string, number>();
for (let i = 0; i < alphabet.length; i++) {
  charMap.set(alphabet[i]!, i);
}

const nanoidLength = 21;

export function nanoidToBytes(input: string): Uint8Array {
  const bytes = new Uint8Array(16);

  let bitPos = 0;
  let bytePos = 0;

  let oldBitOffset = 0;

  for (let i = 0; i < nanoidLength; i++) {
    bytes[bytePos]! |= charMap.get(input[i]!)! << oldBitOffset;

    bitPos += 6;
    bytePos = bitPos >>> 3;
    const newBitOffset = bitPos % 8;

    if (oldBitOffset > newBitOffset) {
      bytes[bytePos]! |= charMap.get(input[i]!)! >>> (8 - oldBitOffset);
    }

    oldBitOffset = newBitOffset;
  }

  return bytes;
}

/**
 * Derive group password values using the same parameters as legacy
 * `argon2-browser` with time=8, mem=32MB, parallelism=1.
 *
 * Salt is derived from the groupId via `nanoidToBytes` for legacy compatibility.
 */
export function deriveGroupPasswordValues(
  groupId: string,
  password: string,
): {
  passwordHash: Uint8Array;
  passwordKey: ReturnType<typeof wrapSymmetricKey>;
} {
  const salt = nanoidToBytes(groupId);

  const derivedKey = argon2id(new TextEncoder().encode(password), salt, {
    t: isTestEnv ? 1 : 8, // iterations
    m: isTestEnv ? 64 * 1024 : 32 * 1024, // memory in KB
    p: 1, // parallelism
    dkLen: 32 + 64, // output length
  });

  return {
    passwordKey: wrapSymmetricKey(derivedKey.slice(0, 32)),
    passwordHash: derivedKey.slice(32),
  };
}
