export function splitStr(str: string, separator: string, limit?: number) {
  const parts = str.split(separator);

  if (limit != null && parts.length > limit) {
    const rest = parts.splice(limit - 1);

    parts.push(rest.join(separator));
  }

  return parts;
}

const textEncoder = new TextEncoder();
export function textToBytes(text: string): Uint8Array {
  return textEncoder.encode(text);
}

const textDecoder = new TextDecoder();
export function bytesToText(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

export function padZeroes(num: number | string, length: number): string {
  return ('0'.repeat(length) + num).slice(-length);
}
