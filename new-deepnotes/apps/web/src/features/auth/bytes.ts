/** Standard base64 (OpenAPI `format: byte`) for JSON session bodies. */
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Argon2 preimage: UTF-8 bytes of the account password (same at register and login). */
export function loginPreimageFromPassword(password: string): Uint8Array {
  return new TextEncoder().encode(password);
}
