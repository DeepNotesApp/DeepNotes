import { base64ToBytes } from '@stdlib/base64';
import {
  cryptoJsWordArrayToUint8Array,
  wrapSymmetricKey,
} from '@stdlib/crypto';
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
