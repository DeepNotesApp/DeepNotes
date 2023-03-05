import {
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { FastifyReply } from 'fastify';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';
import type Stripe from 'stripe';

import { stripe } from '../../../stripe/stripe';

@Controller()
export class CreateCheckoutSessionController {
  @Post()
  async handle(
    @Headers('origin') origin: string,
    @Locals('userId') userId: string,
    @Res() reply: FastifyReply,
  ) {
    return await usingLocks([[`user-lock:${userId}`]], async (signals) => {
      const customerId = await dataAbstraction().hget(
        'user',
        userId,
        'customer-id',
      );

      checkRedlockSignalAborted(signals);

      let customer: Stripe.Customer | undefined;

      if (customerId != null) {
        try {
          customer = (await stripe().customers.retrieve(customerId, {
            expand: ['subscriptions'],
          })) as Stripe.Customer;
        } catch (error) {
          //
        }
      }

      if (customer == null || customer.deleted) {
        const email = await dataAbstraction().hget('user', userId, 'email');

        checkRedlockSignalAborted(signals);

        customer = (
          await stripe().customers.list({
            email: email!,
            limit: 1,
            expand: ['data.subscriptions'],
          })
        ).data[0];

        if (customer == null) {
          customer = await stripe().customers.create({
            email: email!,
          });
        }

        await dataAbstraction().patch('user', userId, {
          customer_id: customer.id,
        });
      }

      if (customer?.subscriptions?.data?.[0] != null) {
        await dataAbstraction().patch('user', userId, {
          plan: 'pro',
          subscription_id: customer.subscriptions.data[0].id,
        });

        throw new HttpException(
          'You already have an active subscription.',
          HttpStatus.BAD_REQUEST,
        );
      }

      checkRedlockSignalAborted(signals);

      const priceId = process.env.DEV
        ? process.env.STRIPE_TEST_PRO_PLAN_PRICE_ID
        : process.env.STRIPE_LIVE_PRO_PLAN_PRICE_ID;

      const session = await stripe().checkout.sessions.create({
        mode: 'subscription',

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        customer: customer.id,

        success_url: `${origin}/subscribed#/subscribed`,
        cancel_url: `${origin}/pricing#/pricing`,
      });

      checkRedlockSignalAborted(signals);

      await reply.redirect(HttpStatus.SEE_OTHER, session.url!);
    });
  }
}
