import type { Replace } from '@stdlib/misc';

import { base64ToBytes } from './base64-to-bytes';

export function base64ToBytesSafe<T extends string | null | undefined>(
  input: T,
): Replace<T, string, Uint8Array> {
  if (input == null) {
    return input as any;
  } else {
    return base64ToBytes(input) as any;
  }
}
