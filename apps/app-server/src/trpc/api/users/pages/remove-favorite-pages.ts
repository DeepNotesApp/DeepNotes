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

export const removeFavoritePagesProcedure = once(() =>
  baseProcedure.mutation(removeFavoritePage),
);

export async function removeFavoritePage({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      // Get favorite page IDs

      const favoritePageIds: string[] = await ctx.dataAbstraction.hget(
        'user',
        ctx.userId,
        'favorite-page-ids',
      );

      // Remove page ID from favorite page IDs

      const originalLength = favoritePageIds.length;

      if (pull(favoritePageIds, ...input.pageIds).length === originalLength) {
        throw new TRPCError({
          message: 'Favorite page not found.',
          code: 'NOT_FOUND',
        });
      }

      checkRedlockSignalAborted(signals);

      // Update favorite page IDs

      await ctx.dataAbstraction.patch('user', ctx.userId, {
        favorite_page_ids: favoritePageIds,
      });
    },
  );
}
