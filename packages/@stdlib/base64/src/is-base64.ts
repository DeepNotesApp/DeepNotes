import { Base64 } from 'js-base64';

export function isBase64(input: string): boolean {
  return Base64.isValid(input);
}
