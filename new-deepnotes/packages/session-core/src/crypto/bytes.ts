export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Standard base64 decode (DeepNotes password-hash strings use non–URL-safe base64). */
export function base64ToBytes(input: string): Uint8Array {
  return new Uint8Array(Buffer.from(input, "base64"));
}

/** Mirrors legacy `@stdlib/base64` `bytesToBase64` (Argon2 PHC strings). */
export function bytesToBase64(
  input: Uint8Array,
  params?: { urlSafe?: boolean; padding?: boolean },
): string {
  const b64 = Buffer.from(input).toString("base64");
  if (!params?.urlSafe && !params?.padding) {
    return b64.replace(/=+$/, "");
  }
  return b64;
}
