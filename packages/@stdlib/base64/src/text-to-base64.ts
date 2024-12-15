import { Base64 } from 'js-base64';

export function textToBase64(
  input: string,
  params?: { urlSafe?: boolean },
): string {
  return Base64.encode(input, params?.urlSafe ?? true);
}
