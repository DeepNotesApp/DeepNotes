import { nanoidToBytes } from "./crypto/nanoid-bytes.js";
import { sha256 } from "@noble/hashes/sha256";

export function getDeviceHash(input: {
  ip: string;
  userAgent: string;
  userId: string;
}): Buffer {
  const data = new TextEncoder().encode(`${input.ip} ${input.userAgent}`);
  const combined = new Uint8Array(data.length + nanoidToBytes(input.userId).length);
  combined.set(data);
  combined.set(nanoidToBytes(input.userId), data.length);
  const hash = sha256(combined);
  return Buffer.from(hash.slice(0, 16));
}
