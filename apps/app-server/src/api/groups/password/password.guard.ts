import { GroupModel } from '@deeplib/db';
import type { CanActivate, ExecutionContext, Type } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import type { FastifyRequest } from 'fastify';
import sodium from 'libsodium-wrappers';
import { mainLogger } from 'src/logger';
import { decryptGroupRehashedPasswordHash } from 'src/utils';

export function makePasswordGuard(
  type: 'password' | 'current-password',
): Type<CanActivate> {
  @Injectable()
  class PasswordGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      mainLogger()
        .sub('groups/password/PasswordGuard.canActivate')
        .info('Checking');

      const request = context.switchToHttp().getRequest<FastifyRequest>();

      const encryptedRehashedPasswordHash = (
        await GroupModel.query()
          .findById((request.params as any)['groupId'])
          .select('encrypted_rehashed_password_hash')
      )?.encrypted_rehashed_password_hash;

      if (encryptedRehashedPasswordHash == null) {
        throw new HttpException(
          'This group is not password protected.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        !sodium.crypto_pwhash_str_verify(
          decryptGroupRehashedPasswordHash(encryptedRehashedPasswordHash),
          base64ToBytes(
            (request.body as any)[
              type === 'password'
                ? 'groupPasswordHash'
                : 'groupCurrentPasswordHash'
            ],
          ),
        )
      ) {
        throw new HttpException(
          `${
            type === 'password' ? 'Group password' : 'Current group password'
          } is incorrect.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return true;
    }
  }

  return PasswordGuard;
}
