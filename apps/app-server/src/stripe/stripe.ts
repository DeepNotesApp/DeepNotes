import { once } from 'lodash';
import Stripe from 'stripe';

export const stripe = once(
  () =>
    new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
      maxNetworkRetries: 2,
    }),
);
