import { base64ToBytes } from '@stdlib/base64';
import {
  cryptoJsWordArrayToUint8Array,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import { bytesToText, textToBytes } from '@stdlib/misc';
import CryptoJS from 'crypto-js';
import { once } from 'lodash';

const _userEmailEncryptionKey = once(() =>
  wrapSymmetricKey(base64ToBytes(process.env.USER_EMAIL_ENCRYPTION_KEY!)),
);

export function encryptUserEmail(email: string) {
  return _userEmailEncryptionKey().encrypt(
    textToBytes(
      (process.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? '')
        .split(';')
        .includes(email)
        ? email
        : email.toLowerCase(),
    ),
    {
      padding: true,
      associatedData: { context: 'UserEmail' },
    },
  );
}
export function decryptUserEmail(encryptedEmail: Uint8Array) {
  return bytesToText(
    _userEmailEncryptionKey().decrypt(encryptedEmail, {
      padding: true,
      associatedData: { context: 'UserEmail' },
    }),
  );
}

export function hashUserEmail(email: string) {
  return cryptoJsWordArrayToUint8Array(
    CryptoJS.HmacSHA256(
      (process.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? '')
        .split(';')
        .includes(email)
        ? email
        : email.toLowerCase(),
      process.env.USER_EMAIL_SECRET!,
    ),
  );
}
