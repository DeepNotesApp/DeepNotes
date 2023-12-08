import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';

const baseProcedure = authProcedure;

export const clearRecentPagesProcedure = once(() =>
  baseProcedure.mutation(clearRecentPages),
);

export async function clearRecentPages({
  ctx,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks([[`user-lock:${ctx.userId}`]], async () => {
    await ctx.dataAbstraction.patch('user', ctx.userId, {
      recent_page_ids: [],
    });
  });
}
