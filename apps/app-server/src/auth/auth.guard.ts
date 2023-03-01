import type { AccessTokenPayload } from '@deeplib/misc';
import type { CanActivate, ExecutionContext, Type } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { dataAbstraction } from 'src/data/data-abstraction';
import { mainLogger } from 'src/logger';

export function makeAuthGuard(params?: {
  optional?: boolean;
}): Type<CanActivate> {
  params ??= {};
  params.optional ??= false;

  @Injectable()
  class AuthGuard implements CanActivate {
    constructor(readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      mainLogger().sub('AuthGuard.canActivate').info('Checking');

      const request = context.switchToHttp().getRequest<FastifyRequest>();

      if (request.cookies['loggedIn'] !== 'true') {
        if (params?.optional) {
          return true;
        } else {
          throw new HttpException(
            'Missing loggedIn cookie.',
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      // Check if access token exists

      const accessToken = request.cookies['accessToken'];

      if (accessToken == null) {
        if (params?.optional) {
          return true;
        } else {
          throw new HttpException(
            'Missing access token.',
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      // Verify JWT

      const jwtPayload = this.jwtService.verify<AccessTokenPayload>(
        accessToken,
        { secret: process.env.ACCESS_SECRET },
      );

      if (jwtPayload == null) {
        if (params?.optional) {
          return true;
        } else {
          throw new HttpException(
            'Invalid access token.',
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      // Check if session is invalidated

      const invalidated = await dataAbstraction().hget(
        'session',
        jwtPayload.sid,
        'invalidated',
      );

      if (invalidated) {
        if (params?.optional) {
          return true;
        } else {
          throw new HttpException(
            'Session was invalidated.',
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      request.locals ??= {} as any;
      request.locals.sessionId = jwtPayload.sid;
      request.locals.userId = jwtPayload.uid;

      return true;
    }
  }

  return AuthGuard;
}
