import type CryptoJS from "crypto-js";

/** Port of `@stdlib/crypto` `cryptoJsWordArrayToUint8Array` for recovery-code hashing. */
export function cryptoJsWordArrayToUint8Array(
  wordArray: CryptoJS.lib.WordArray,
): Uint8Array {
  const totalLength = wordArray.sigBytes;
  const words = wordArray.words;
  const result = new Uint8Array(totalLength);

  let i = 0;
  let j = 0;

  while (true) {
    if (i === totalLength) {
      break;
    }

    const w = words[j++]!;

    result[i++] = (w & 0xff000000) >>> 24;

    if (i === totalLength) {
      break;
    }
    result[i++] = (w & 0x00ff0000) >>> 16;

    if (i === totalLength) {
      break;
    }
    result[i++] = (w & 0x0000ff00) >>> 8;

    if (i === totalLength) {
      break;
    }
    result[i++] = w & 0x000000ff;
  }

  return result;
}
