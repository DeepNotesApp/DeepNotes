import { Base64 } from 'js-base64';

export function base64ToBytes(input: string): Uint8Array {
  return Base64.toUint8Array(input);
}
