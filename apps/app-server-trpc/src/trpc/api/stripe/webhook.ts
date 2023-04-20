import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { dataAbstraction } from 'src/data/data-abstraction';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import type Stripe from 'stripe';

const baseProcedure = publicProcedure;

export const webhookProcedure = once(() => baseProcedure.mutation(webhook));

export async function webhook({
  ctx,
}: InferProcedureOpts<typeof baseProcedure>) {
  const event = ctx.stripe.webhooks.constructEvent(
    ctx.req.rawBody!,
    ctx.req.headers['signature']!,
    process.env.STRIPE_LIVE_WEBHOOK_SECRET,
  );

  switch (event.type) {
    case 'customer.subscription.updated':
      return await customerSubscriptionUpdated({
        event: event,
        dataAbstraction: ctx.dataAbstraction,
      });
    case 'customer.subscription.deleted':
      return await customerSubscriptionDeleted({
        event: event,
        dataAbstraction: ctx.dataAbstraction,
      });
  }
}

async function getUserIdFromEvent(input: {
  event: Stripe.Event;
  dataAbstraction: ReturnType<typeof dataAbstraction>;
}) {
  const userId = await input.dataAbstraction.hget(
    'customer',
    (input.event.data.object as any).customer,
    'user-id',
  );

  if (userId == null) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found.',
    });
  }

  return userId;
}

async function customerSubscriptionUpdated(input: {
  event: Stripe.Event;
  dataAbstraction: ReturnType<typeof dataAbstraction>;
}) {
  const subscription = input.event.data.object as Stripe.Subscription;

  // Ignore cancelation-related updates

  if ('cancel_at' in (input.event.data.previous_attributes as any)) {
    return;
  }

  if (
    'status' in (input.event.data.previous_attributes as any) &&
    subscription.status === 'active'
  ) {
    // Handle a new subscription

    const userId = await getUserIdFromEvent({
      event: input.event,
      dataAbstraction: input.dataAbstraction,
    });

    await input.dataAbstraction.patch('user', userId, {
      plan: 'pro',

      subscription_id: subscription.id,
    });
  }
}

async function customerSubscriptionDeleted(input: {
  event: Stripe.Event;
  dataAbstraction: ReturnType<typeof dataAbstraction>;
}) {
  // Reset the user's plan to Basic

  const subscription = input.event.data.object as Stripe.Subscription;

  if (subscription.status !== 'canceled') {
    return;
  }

  const userId = await getUserIdFromEvent({
    event: input.event,
    dataAbstraction: input.dataAbstraction,
  });

  await dataAbstraction().patch('user', userId, {
    plan: 'basic',

    subscription_id: null,
  });
}
