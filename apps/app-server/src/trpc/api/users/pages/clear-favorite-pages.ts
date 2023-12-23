import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';

const baseProcedure = authProcedure;

export const clearFavoritePagesProcedure = once(() =>
  baseProcedure.mutation(clearFavoritePages),
);

export async function clearFavoritePages({
  ctx,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks([[`user-lock:${ctx.userId}`]], async () => {
    await ctx.dataAbstraction.patch('user', ctx.userId, {
      favorite_page_ids: [],
    });
  });
}
