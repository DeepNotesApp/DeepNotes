import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';

const baseProcedure = authProcedure;

export const createPortalSessionProcedure = once(() =>
  baseProcedure.mutation(createPortalSession),
);

export async function createPortalSession({
  ctx,
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

      checkRedlockSignalAborted(signals);

      // Create portal session

      const portalSession = await ctx.stripe.billingPortal.sessions.create({
        customer: customerId,
      });

      // Return portal session URL

      return {
        portalSessionUrl: portalSession.url,
      };
    },
  );
}
