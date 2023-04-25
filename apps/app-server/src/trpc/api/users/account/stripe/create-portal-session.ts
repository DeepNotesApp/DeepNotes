import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { assertNonDemoAccount } from 'src/utils/users';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    returnUrl: z.string().url(),
  }),
);

export const createPortalSessionProcedure = once(() =>
  baseProcedure.mutation(createPortalSession),
);

export async function createPortalSession({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      // Assert non-demo account

      await assertNonDemoAccount({
        userId: ctx.userId,
        dataAbstraction: ctx.dataAbstraction,
      });

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
        return_url: input.returnUrl,
      });

      // Return portal session URL

      return {
        portalSessionUrl: portalSession.url,
      };
    },
  );
}
