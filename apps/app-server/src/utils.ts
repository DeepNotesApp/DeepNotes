import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import {
  cryptoJsWordArrayToUint8Array,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import { bytesToText, concatUint8Arrays, textToBytes } from '@stdlib/misc';
import CryptoJS from 'crypto-js';
import type { FastifyRequest } from 'fastify';
import sodium from 'libsodium-wrappers';
import { pack, unpack } from 'msgpackr';

// User rehashed login hash

const _userRehashedLoginHashEncryptionKey = wrapSymmetricKey(
  base64ToBytes(process.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY),
);
export function encryptUserRehashedLoginHash(userRehashedLoginHash: string) {
  return _userRehashedLoginHashEncryptionKey.encrypt(
    textToBytes(userRehashedLoginHash),
    { associatedData: { context: 'UserRehashedLoginHash' } },
  );
}
export function decryptUserRehashedLoginHash(
  userEncryptedRehashedLoginHash: Uint8Array,
) {
  return bytesToText(
    _userRehashedLoginHashEncryptionKey.decrypt(
      userEncryptedRehashedLoginHash,
      { associatedData: { context: 'UserRehashedLoginHash' } },
    ),
  );
}

// Group rehashed password hash

const _groupRehashedPasswordHashEncryptionKey = wrapSymmetricKey(
  base64ToBytes(process.env.GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY),
);
export function encryptGroupRehashedPasswordHash(
  groupRehashedPasswordHash: string,
) {
  return _groupRehashedPasswordHashEncryptionKey.encrypt(
    textToBytes(groupRehashedPasswordHash),
    { associatedData: { context: 'GroupRehashedPasswordHash' } },
  );
}
export function decryptGroupRehashedPasswordHash(
  groupEncryptedRehashedPasswordHash: Uint8Array,
) {
  return bytesToText(
    _groupRehashedPasswordHashEncryptionKey.decrypt(
      groupEncryptedRehashedPasswordHash,
      { associatedData: { context: 'GroupRehashedPasswordHash' } },
    ),
  );
}

// User authenticator secret

const _userAuthenticatorSecretEncryptionKey = wrapSymmetricKey(
  base64ToBytes(process.env.USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY),
);
export function encryptUserAuthenticatorSecret(
  userAuthenticatorSecret: string,
) {
  return _userAuthenticatorSecretEncryptionKey.encrypt(
    textToBytes(userAuthenticatorSecret),
    { associatedData: { context: 'UserAuthenticatorSecret' } },
  );
}
export function decryptUserAuthenticatorSecret(
  userEncryptedAuthenticatorSecret: Uint8Array,
) {
  return bytesToText(
    _userAuthenticatorSecretEncryptionKey.decrypt(
      userEncryptedAuthenticatorSecret,
      { associatedData: { context: 'UserAuthenticatorSecret' } },
    ),
  );
}

// User recovery codes

const _userRecoveryCodesEncryptionKey = wrapSymmetricKey(
  base64ToBytes(process.env.USER_RECOVERY_CODES_ENCRYPTION_KEY),
);
export function encryptRecoveryCodes(userRecoveryCodes: Uint8Array[]) {
  return _userRecoveryCodesEncryptionKey.encrypt(pack(userRecoveryCodes), {
    associatedData: { context: 'UserRecoveryCodes' },
  });
}
export function decryptRecoveryCodes(
  userEncryptedRecoveryCodes: Uint8Array,
): Uint8Array[] {
  return unpack(
    _userRecoveryCodesEncryptionKey.decrypt(userEncryptedRecoveryCodes, {
      associatedData: { context: 'UserRecoveryCodes' },
    }),
  );
}

export function hashRecoveryCode(
  recoveryCode: string,
  salt?: Uint8Array,
): Uint8Array {
  salt ??= sodium.randombytes_buf(16);

  return concatUint8Arrays(
    salt,
    cryptoJsWordArrayToUint8Array(
      CryptoJS.SHA256(sodium.to_hex(salt) + recoveryCode),
    ),
  );
}
export function verifyRecoveryCode(
  recoveryCode: string,
  hashedRecoveryCode: Uint8Array,
) {
  const salt = hashedRecoveryCode.slice(0, 16);

  return sodium.memcmp(
    hashedRecoveryCode.slice(16),
    hashRecoveryCode(recoveryCode, salt).slice(16),
  );
}

export const Locals = createParamDecorator(
  (name: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();

    return name != null ? request.locals?.[name] : request.locals;
  },
);

export const Cookies = createParamDecorator(
  (name: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();

    return name != null ? request.cookies?.[name] : request.cookies;
  },
);

export function provideValue(token: any, value?: any) {
  return { provide: token, useValue: value !== undefined ? value : token };
}

export function padZeroes(num: number | string, length: number): string {
  return ('0'.repeat(length) + num).slice(-length);
}
