import type { SymmetricKey } from '@stdlib/crypto';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { nanoidToBytes } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';

import { mainLogger } from './logger';

export interface PasswordValues {
  key: SymmetricKey;
  hash: Uint8Array;
  salt: Uint8Array;
}

export function derivePasswordValues(
  password: Uint8Array,
  salt?: Uint8Array,
): PasswordValues {
  mainLogger().info('Started hashing password');

  salt ??= sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

  const derivedKey = sodium.crypto_pwhash(
    32 + 64,
    password,
    salt,
    2,
    32 * 1048576,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );

  mainLogger().info('Finished hashing password');

  return {
    key: wrapSymmetricKey(derivedKey.slice(0, 32)),
    hash: derivedKey.slice(32),
    salt,
  };
}

export function computePasswordHash(password: Uint8Array) {
  mainLogger().info('Started hashing password');

  const result = sodium.crypto_pwhash_str(password, 2, 32 * 1048576);

  mainLogger().info('Finished hashing password');

  return result;
}

export function getDeviceHash(input: {
  ip: string;
  userAgent: string;
  userId: string;
}) {
  return Buffer.from(
    sodium.crypto_generichash(
      16,
      `${input.ip} ${input.userAgent}`,
      nanoidToBytes(input.userId),
    ),
  );
}
