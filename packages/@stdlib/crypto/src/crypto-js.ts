import type CryptoJS from 'crypto-js';

export function cryptoJsWordArrayToUint8Array(
  wordArray: CryptoJS.lib.WordArray,
) {
  const totalLength = wordArray.sigBytes;
  const words = wordArray.words;
  const result = new Uint8Array(totalLength);

  let i = 0 /*dst*/,
    j = 0; /*src*/

  while (true) {
    // here i is a multiple of 4

    if (i === totalLength) {
      break;
    }

    const w = words[j++];

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
