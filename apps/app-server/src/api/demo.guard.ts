import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { dataAbstraction } from 'src/data/data-abstraction';

@Injectable()
export class DemoGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const demo = await dataAbstraction().hget(
      'user',
      request.locals.userId,
      'demo',
    );

    if (demo) {
      throw new HttpException(
        `This action is unavailable on demo accounts.`,
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
