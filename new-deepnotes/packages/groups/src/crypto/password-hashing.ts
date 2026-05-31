import { base64ToBytes, bytesToBase64 } from "./bytes.js";

export function encodePasswordHash(
  passwordHash: Uint8Array,
  salt: Uint8Array,
  timeCost: number,
  memoryCost: number,
): string {
  return `$argon2id$v=19$m=${String(memoryCost)},t=${String(timeCost)},p=1$${bytesToBase64(salt, { urlSafe: false })}$${bytesToBase64(passwordHash, { urlSafe: false })}`;
}

export function getPasswordHashValues(encodedPasswordHash: string) {
  const result =
    /^\$(?<algorithm>.+?)\$v=(?<version>\d+?)\$m=(?<memoryCost>\d+?),t=(?<timeCost>\d+?),p=(?<parallelism>\d+?)\$(?<saltBase64>.+?)\$(?<hashBase64>.+?)$/.exec(
      encodedPasswordHash,
    );

  if (result?.groups == null) {
    throw new Error("Invalid password hash.");
  }

  const g = result.groups;

  return {
    algorithm: g.algorithm!,
    version: parseInt(g.version!, 10),

    memoryCost: parseInt(g.memoryCost!, 10),
    timeCost: parseInt(g.timeCost!, 10),
    parallelism: parseInt(g.parallelism!, 10),

    saltBase64: g.saltBase64!,
    hashBase64: g.hashBase64!,

    saltBytes: base64ToBytes(g.saltBase64!),
    hashBytes: base64ToBytes(g.hashBase64!),
  };
}
