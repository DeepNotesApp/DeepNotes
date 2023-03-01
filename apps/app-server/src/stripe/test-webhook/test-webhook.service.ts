import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import type Stripe from 'stripe';

@Injectable()
export class TestWebhookService {
  async getUserIdFromEvent(event: Stripe.Event) {
    const userId = await dataAbstraction().hget(
      'customer',
      (event.data.object as any).customer,
      'user-id',
    );

    if (userId == null) {
      throw new Error('User not found.');
    }

    return userId;
  }

  async customerSubscriptionUpdated(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    // Ignore cancelation-related updates

    if ('cancel_at' in (event.data.previous_attributes as any)) {
      return;
    }

    if (
      'status' in (event.data.previous_attributes as any) &&
      subscription.status === 'active'
    ) {
      // Handle a new subscription

      const userId = await this.getUserIdFromEvent(event);

      await dataAbstraction().patch('user', userId, {
        plan: 'pro',

        subscription_id: subscription.id,
      });
    }
  }

  async customerSubscriptionDeleted(event: Stripe.Event) {
    // Reset the user's plan to Basic

    const subscription = event.data.object as Stripe.Subscription;

    if (subscription.status !== 'canceled') {
      return;
    }

    const userId = await this.getUserIdFromEvent(event);

    await dataAbstraction().patch('user', userId, {
      plan: 'basic',

      subscription_id: null,
    });
  }
}
