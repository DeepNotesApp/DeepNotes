import { UserModel } from '@deeplib/db';
import type { CanActivate, ExecutionContext, Type } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { getPasswordHashValues } from '@stdlib/crypto';
import { equalUint8Arrays } from '@stdlib/misc';
import type { FastifyRequest } from 'fastify';
import { derivePasswordValues } from 'src/crypto';
import { mainLogger } from 'src/logger';
import { decryptUserRehashedLoginHash } from 'src/utils';

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

      const passwordHashValues = getPasswordHashValues(
        decryptUserRehashedLoginHash(encryptedRehashedLoginHash),
      );

      const passwordValues = derivePasswordValues(
        base64ToBytes(
          (request.body as any)[
            type === 'password' ? 'loginHash' : 'oldLoginHash'
          ],
        ),
        passwordHashValues.saltBytes,
      );

      const passwordIsCorrect = equalUint8Arrays(
        passwordValues.hash,
        passwordHashValues.hashBytes,
      );

      if (!passwordIsCorrect) {
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
