import { Base64 } from 'js-base64';

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
