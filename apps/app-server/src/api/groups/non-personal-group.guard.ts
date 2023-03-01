import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { dataAbstraction } from 'src/data/data-abstraction';

@Injectable()
export class NonPersonalGroupGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const groupMemberId = await dataAbstraction().hget(
      'group',
      (request.params as any).groupId,
      'user-id',
    );

    if (groupMemberId != null) {
      throw new HttpException(
        'This action is not available for personal groups.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
