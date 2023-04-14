import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once, pull } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageId: z.string().refine(isNanoID),
  }),
);

export const removeRecentPageProcedure = once(() =>
  baseProcedure.mutation(removeRecentPage),
);

export async function removeRecentPage({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      const recentPageIds: string[] = await ctx.dataAbstraction.hget(
        'user',
        ctx.userId,
        'recent-page-ids',
      );

      checkRedlockSignalAborted(signals);

      if (pull(recentPageIds, input.pageId).length === 0) {
        throw new TRPCError({
          message: 'Recent page not found.',
          code: 'NOT_FOUND',
        });
      }

      await ctx.dataAbstraction.patch('user', ctx.userId, {
        recent_page_ids: recentPageIds,
      });
    },
  );
}
