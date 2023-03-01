import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { FastifyReply } from 'fastify';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { stripe } from 'src/stripe/stripe';
import { Locals } from 'src/utils';

@Controller()
export class CreatePortalSessionController {
  @Post()
  async handle(
    @Body('returnUrl') returnUrl: string,
    @Locals('userId') userId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return await usingLocks([[`user-lock:${userId}`]], async (signals) => {
      const customerId = await dataAbstraction().hget(
        'user',
        userId,
        'customer-id',
      );

      checkRedlockSignalAborted(signals);

      const portalSession = await stripe().billingPortal.sessions.create({
        customer: customerId!,
        return_url: returnUrl,
      });

      await reply.redirect(HttpStatus.SEE_OTHER, portalSession.url);
    });
  }
}
