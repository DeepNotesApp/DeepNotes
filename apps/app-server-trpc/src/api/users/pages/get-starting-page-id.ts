import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';

const baseProcedure = authProcedure;

export const getStartingPageIdProcedure = once(() =>
  baseProcedure.query(getStartingPageId),
);

export async function getStartingPageId({
  ctx,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.dataAbstraction.hget('user', ctx.userId, 'starting-page-id');
}
