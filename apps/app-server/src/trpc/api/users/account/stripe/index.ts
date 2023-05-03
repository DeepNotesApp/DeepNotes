import { trpc } from 'src/trpc/server';

import { createCheckoutSessionProcedure } from './create-checkout-session';
import { createPortalSessionProcedure } from './create-portal-session';

export const stripeRouter = trpc.router({
  createCheckoutSession: createCheckoutSessionProcedure(),
  createPortalSession: createPortalSessionProcedure(),
});
