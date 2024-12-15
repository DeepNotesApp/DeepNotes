import { Base64 } from 'js-base64';

export function base64ToText(input: string): string {
  return Base64.decode(input);
}
