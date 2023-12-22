import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { once, union } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageIds: z.string().refine(isNanoID).array(),
  }),
);

export const addFavoritePagesProcedure = once(() =>
  baseProcedure.mutation(addFavoritePages),
);

export async function addFavoritePages({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      // Get favorite page IDs

      let favoritePageIds: string[] = await ctx.dataAbstraction.hget(
        'user',
        ctx.userId,
        'favorite-page-ids',
      );

      // Add page ID from favorite page IDs

      favoritePageIds = union(input.pageIds, favoritePageIds);

      checkRedlockSignalAborted(signals);

      // Update favorite page IDs

      await ctx.dataAbstraction.patch('user', ctx.userId, {
        favorite_page_ids: favoritePageIds,
      });
    },
  );
}
