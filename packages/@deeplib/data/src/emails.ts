import { base64ToBytes } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { bytesToText, textToBytes } from '@stdlib/misc';
import CryptoJS from 'crypto-js';
import { once } from 'lodash';

export const emailEncryptionKey = once(() =>
  wrapSymmetricKey(base64ToBytes(process.env.EMAIL_ENCRYPTION_KEY!)),
);

export function encryptEmail(email: string) {
  return emailEncryptionKey().encrypt(textToBytes(email), { padding: true });
}
export function decryptEmail(encryptedEmail: Uint8Array) {
  return bytesToText(
    emailEncryptionKey().decrypt(encryptedEmail, { padding: true }),
  );
}

export function hashEmail(email: string) {
  return cryptoJsWordArrayToUint8Array(
    CryptoJS.HmacSHA256(email, process.env.EMAIL_SECRET!),
  );
}

function cryptoJsWordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray) {
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
