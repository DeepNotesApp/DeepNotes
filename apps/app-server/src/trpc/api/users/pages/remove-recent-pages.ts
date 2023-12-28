import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once, pull } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageIds: z.string().refine(isNanoID).array(),
  }),
);

export const removeRecentPagesProcedure = once(() =>
  baseProcedure.mutation(removeRecentPages),
);

export async function removeRecentPages({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      // Get recent page IDs

      const recentPageIds: string[] = await ctx.dataAbstraction.hget(
        'user',
        ctx.userId,
        'recent-page-ids',
      );

      // Remove page ID from recent page IDs

      const originalLength = recentPageIds.length;

      if (pull(recentPageIds, ...input.pageIds).length === originalLength) {
        throw new TRPCError({
          message: 'Recent page not found.',
          code: 'NOT_FOUND',
        });
      }

      checkRedlockSignalAborted(signals);

      // Update recent page IDs

      await ctx.dataAbstraction.patch('user', ctx.userId, {
        recent_page_ids: recentPageIds,
      });
    },
  );
}
