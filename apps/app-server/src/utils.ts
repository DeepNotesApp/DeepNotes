import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { bytesToText, textToBytes } from '@stdlib/misc';
import type { FastifyRequest } from 'fastify';
import { pack, unpack } from 'msgpackr';

// Rehashed login hash

const _rehashedLoginHashEncryptionKey = wrapSymmetricKey(
  base64ToBytes(process.env.REHASHED_LOGIN_HASH_ENCRYPTION_KEY),
);
export function encryptRehashedLoginHash(rehashedLoginHash: string) {
  return _rehashedLoginHashEncryptionKey.encrypt(
    textToBytes(rehashedLoginHash),
  );
}
export function decryptRehashedLoginHash(rehashedLoginHash: Uint8Array) {
  return bytesToText(
    _rehashedLoginHashEncryptionKey.decrypt(rehashedLoginHash),
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
  );
}
export function decryptGroupRehashedPasswordHash(
  groupRehashedPasswordHash: Uint8Array,
) {
  return bytesToText(
    _groupRehashedPasswordHashEncryptionKey.decrypt(groupRehashedPasswordHash),
  );
}

// Authenticator secret

const _authenticatorSecretEncryptionKey = wrapSymmetricKey(
  base64ToBytes(process.env.AUTHENTICATOR_SECRET_ENCRYPTION_KEY),
);
export function encryptAuthenticatorSecret(authenticatorSecret: string) {
  return _authenticatorSecretEncryptionKey.encrypt(
    textToBytes(authenticatorSecret),
  );
}
export function decryptAuthenticatorSecret(
  encryptedAuthenticatorSecret: Uint8Array,
) {
  return bytesToText(
    _authenticatorSecretEncryptionKey.decrypt(encryptedAuthenticatorSecret),
  );
}

// Recovery codes

const _recoveryCodesEncryptionKey = wrapSymmetricKey(
  base64ToBytes(process.env.RECOVERY_CODES_ENCRYPTION_KEY),
);
export function encryptRecoveryCodes(recoveryCodes: string[]) {
  return _recoveryCodesEncryptionKey.encrypt(pack(recoveryCodes));
}
export function decryptRecoveryCodes(encryptedRecoveryCode: Uint8Array) {
  return unpack(_recoveryCodesEncryptionKey.decrypt(encryptedRecoveryCode));
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
