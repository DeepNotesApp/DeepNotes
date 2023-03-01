import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { dataAbstraction } from 'src/data/data-abstraction';

@Injectable()
export class ProPlanGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const userPlan = await dataAbstraction().hget(
      'user',
      request.locals.userId,
      'plan',
    );

    if (userPlan == null) {
      throw new HttpException('User plan is invalid.', HttpStatus.BAD_REQUEST);
    }

    if (userPlan !== 'pro') {
      throw new HttpException(
        `This action requires a Pro plan subscription.`,
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
