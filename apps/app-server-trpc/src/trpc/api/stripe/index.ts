import { trpc } from 'src/trpc/server';

import { webhookProcedure } from './webhook';

export const stripeRouter = trpc.router({
  webhook: webhookProcedure(),
});
