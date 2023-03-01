import { Controller, Post, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { clearCookies } from 'src/cookies';
import { dataAbstraction } from 'src/data/data-abstraction';
import { Locals } from 'src/utils';

import { makeAuthGuard } from '../auth.guard';

@Controller()
@UseGuards(makeAuthGuard({ optional: true }))
export class LogoutController {
  @Post()
  async handle(
    @Locals('sessionId') sessionId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (sessionId != null) {
      await dataAbstraction().patch('session', sessionId, {
        invalidated: true,
      });
    }

    clearCookies(reply);
  }
}
