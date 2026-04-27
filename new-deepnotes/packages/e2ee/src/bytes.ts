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

/** Standard base64 decode (OpenAPI `format: byte`, Argon2 PHC strings). */
export function base64ToBytes(input: string): Uint8Array {
  const bin = atob(input);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

/** Standard base64 encode (non–URL-safe). */
export function bytesToBase64(
  input: Uint8Array,
  params?: { urlSafe?: boolean; padding?: boolean },
): string {
  let binary = "";
  for (let i = 0; i < input.byteLength; i++) {
    binary += String.fromCharCode(input[i]!);
  }
  const b64 = btoa(binary);
  if (!params?.urlSafe && !params?.padding) {
    return b64.replace(/=+$/, "");
  }
  return b64;
}
