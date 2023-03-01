import type { Replace } from '@stdlib/misc';
import { Base64 } from 'js-base64';

export function base64ToBytes(input: string): Uint8Array {
  return Base64.toUint8Array(input);
}
export function bytesToBase64(
  input: Uint8Array,
  params?: { urlSafe?: boolean; padding?: boolean },
): string {
  let result = Base64.fromUint8Array(
    new Uint8Array(input),
    params?.urlSafe ?? true,
  );

  if (!params?.urlSafe && !params?.padding) {
    result = result.replace(/=+$/, '');
  }

  return result;
}

export function base64ToBytesSafe<T extends string | null | undefined>(
  input: T,
): Replace<T, string, Uint8Array> {
  if (input == null) {
    return input as any;
  } else {
    return base64ToBytes(input) as any;
  }
}
export function bytesToBase64Safe<T extends Uint8Array | null | undefined>(
  input: T,
): Replace<T, Uint8Array, string> {
  if (input == null) {
    return input as any;
  } else {
    return bytesToBase64(input) as any;
  }
}

export function base64ToText(input: string): string {
  return Base64.decode(input);
}
export function textToBase64(
  input: string,
  params?: { urlSafe?: boolean },
): string {
  return Base64.encode(input, params?.urlSafe ?? true);
}

export function isBase64(input: string): boolean {
  return Base64.isValid(input);
}
