import { mainLogger } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import type Stripe from 'stripe';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    billingFrequency: z.enum(['monthly', 'yearly']).optional(),
  }),
);

export const createCheckoutSessionProcedure = once(() =>
  baseProcedure.mutation(createCheckoutSession),
);

export async function createCheckoutSession({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      // Assert non-demo account

      await ctx.assertNonDemoAccount({ userId: ctx.userId });

      // Get customer ID

      const customerId = await ctx.dataAbstraction.hget(
        'user',
        ctx.userId,
        'customer-id',
      );

      let customer: Stripe.Customer | undefined;

      if (customerId != null) {
        // Got customer ID, get subscription information

        try {
          customer = (await ctx.stripe.customers.retrieve(customerId, {
            expand: ['subscriptions'],
          })) as Stripe.Customer;
        } catch (error) {
          mainLogger.error(error);
        }
      }

      if (customer == null || customer.deleted) {
        // Failed to get customer ID, try to get customer by email

        const email = await ctx.dataAbstraction.hget(
          'user',
          ctx.userId,
          'email',
        );

        customer = (
          await ctx.stripe.customers.list({
            email,
            limit: 1,
            expand: ['data.subscriptions'],
          })
        ).data[0];

        if (customer == null) {
          // Failed to get customer by email, create new customer

          customer = await ctx.stripe.customers.create({
            email,
          });
        }

        // Update user with customer ID

        await ctx.dataAbstraction.patch('user', ctx.userId, {
          customer_id: customer.id,
        });
      }

      // Check if user already has an active subscription

      if (customer?.subscriptions?.data?.[0] != null) {
        // User already has an active subscription
        // Update database with subscription ID

        await ctx.dataAbstraction.patch('user', ctx.userId, {
          plan: 'pro',
          subscription_id: customer.subscriptions.data[0].id,
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You already have an active subscription.',
        });
      }

      checkRedlockSignalAborted(signals);

      // Create checkout session

      const session = await ctx.stripe.checkout.sessions.create({
        mode: 'subscription',

        line_items: [
          {
            price:
              input.billingFrequency === 'yearly'
                ? process.env.STRIPE_YEARLY_PRICE_ID
                : process.env.STRIPE_MONTHLY_PRICE_ID,
            quantity: 1,
          },
        ],

        customer: customer.id,

        success_url: `${ctx.req.headers['origin']}/subscribed#/subscribed`,
      });

      if (session.url == null) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session.',
        });
      }

      // Return checkout session URL

      return {
        checkoutSessionUrl: session.url,
      };
    },
  );
}
