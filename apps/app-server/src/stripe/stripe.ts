import { once } from 'lodash';
import Stripe from 'stripe';

export const stripe = once(
  () =>
    new Stripe(
      process.env.DEV
        ? process.env.STRIPE_TEST_SECRET_KEY
        : process.env.STRIPE_LIVE_SECRET_KEY,
      {
        apiVersion: '2022-11-15',
        maxNetworkRetries: 2,
      },
    ),
);
