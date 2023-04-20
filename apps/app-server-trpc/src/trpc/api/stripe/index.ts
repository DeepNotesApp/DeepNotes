import { trpc } from 'src/trpc/server';

import { testWebhookProcedure } from './test-webhook';
import { webhookProcedure } from './webhook';

export const stripeRouter = trpc.router({
  webhook: webhookProcedure(),
  testWebhook: testWebhookProcedure(),
});
