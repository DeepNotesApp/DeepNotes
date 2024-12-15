import type { Replace } from '@stdlib/misc';

import { bytesToBase64 } from './bytes-to-base64';

export function bytesToBase64Safe<T extends Uint8Array | null | undefined>(
  input: T,
): Replace<T, Uint8Array, string> {
  if (input == null) {
    return input as any;
  } else {
    return bytesToBase64(input) as any;
  }
}
