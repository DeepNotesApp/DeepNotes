export function isUuid4(text: string) {
  const pattern =
    /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

  return pattern.test(text);
}

export function uuidToBytes(uuid: string): Uint8Array {
  return new Uint8Array(
    (uuid.replace(/-/g, '').match(/.{2}/g) || []).map((b) => parseInt(b, 16)),
  );
}
export function bytesToUUID(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => ('00' + b.toString(16)).slice(-2))
    .join('')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}
