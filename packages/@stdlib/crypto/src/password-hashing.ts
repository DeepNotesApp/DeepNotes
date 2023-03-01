import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';

export function encodePasswordHash(
  passwordHash: Uint8Array,
  salt: Uint8Array,
  timeCost: number,
  memoryCost: number,
): string {
  return `$argon2id$v=19$m=${memoryCost},t=${timeCost},p=1$${bytesToBase64(
    salt,
    { urlSafe: false },
  )}$${bytesToBase64(passwordHash, { urlSafe: false })}`;
}

export function getPasswordHashValues(encodedPasswordHash: string) {
  const result =
    /^\$(?<algorithm>.+?)\$v=(?<version>\d+?)\$m=(?<memoryCost>\d+?),t=(?<timeCost>\d+?),p=(?<parallelism>\d+?)\$(?<saltBase64>.+?)\$(?<hashBase64>.+?)$/.exec(
      encodedPasswordHash,
    );

  if (result?.groups == null) {
    throw new Error('Invalid password hash.');
  }

  return {
    algorithm: result.groups.algorithm,
    version: parseInt(result.groups.version),

    memoryCost: parseInt(result.groups.memoryCost),
    timeCost: parseInt(result.groups.timeCost),
    parallelism: parseInt(result.groups.parallelism),

    saltBase64: result.groups.saltBase64,
    hashBase64: result.groups.hashBase64,

    saltBytes: base64ToBytes(result.groups.saltBase64),
    hashBytes: base64ToBytes(result.groups.hashBase64),
  };
}
