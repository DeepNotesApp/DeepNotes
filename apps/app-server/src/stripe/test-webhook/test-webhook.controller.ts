import { Controller, Headers, Post, RawBodyRequest, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';

import { stripe } from '../stripe';
import { TestWebhookService } from './test-webhook.service';

@SkipThrottle()
@Controller()
export class TestWebhookController {
  constructor(readonly endpointService: TestWebhookService) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = stripe().webhooks.constructEvent(
      req.rawBody!,
      signature,
      process.env.STRIPE_TEST_WEBHOOK_SECRET,
    );

    switch (event.type) {
      case 'customer.subscription.updated':
        return await this.endpointService.customerSubscriptionUpdated(event);
      case 'customer.subscription.deleted':
        return await this.endpointService.customerSubscriptionDeleted(event);
    }
  }
}
