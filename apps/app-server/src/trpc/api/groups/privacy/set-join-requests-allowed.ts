import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),

    areJoinRequestsAllowed: z.boolean(),
  }),
);

export const setJoinRequestsAllowedProcedure = once(() =>
  baseProcedure.mutation(setJoinRequestsAllowed),
);

export async function setJoinRequestsAllowed({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`], [`group-lock:${input.groupId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Assert agent is subscribed

        await ctx.assertUserSubscribed({ userId: ctx.userId });

        // Check if user has sufficient permissions

        await ctx.assertSufficientGroupPermissions({
          userId: ctx.userId,
          groupId: input.groupId,
          permission: 'editGroupSettings',
        });

        await ctx.dataAbstraction.hmset(
          'group',
          input.groupId,
          { 'are-join-requests-allowed': input.areJoinRequestsAllowed },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);
      });
    },
  );
}
