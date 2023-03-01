import { UserModel } from '@deeplib/db';
import type { CanActivate, ExecutionContext, Type } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import type { FastifyRequest } from 'fastify';
import sodium from 'libsodium-wrappers';
import { mainLogger } from 'src/logger';
import { decryptRehashedLoginHash } from 'src/utils';

export function makePasswordGuard(
  type: 'password' | 'old-password',
): Type<CanActivate> {
  @Injectable()
  class PasswordGuard implements CanActivate {
    async canActivate(context: ExecutionContext) {
      mainLogger().sub('account/PasswordGuard.canActivate').info('Checking');

      const request = context.switchToHttp().getRequest<FastifyRequest>();

      const encryptedRehashedLoginHash = (
        await UserModel.query()
          .findById(request.locals.userId)
          .select('encrypted_rehashed_login_hash')
      )?.encrypted_rehashed_login_hash;

      if (encryptedRehashedLoginHash == null) {
        throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      }

      if (
        !sodium.crypto_pwhash_str_verify(
          decryptRehashedLoginHash(encryptedRehashedLoginHash),
          base64ToBytes(
            (request.body as any)[
              type === 'password' ? 'loginHash' : 'oldLoginHash'
            ],
          ),
        )
      ) {
        throw new HttpException(
          `${type === 'password' ? 'Password' : 'Old password'} is incorrect.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return true;
    }
  }

  return PasswordGuard;
}
