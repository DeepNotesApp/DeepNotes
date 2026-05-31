import { nanoidToBytes } from "./crypto/nanoid-bytes.js";
import sodium from "libsodium-wrappers-sumo";

export function getDeviceHash(input: {
  ip: string;
  userAgent: string;
  userId: string;
}): Buffer {
  return Buffer.from(
    sodium.crypto_generichash(
      16,
      `${input.ip} ${input.userAgent}`,
      nanoidToBytes(input.userId),
    ),
  );
}
