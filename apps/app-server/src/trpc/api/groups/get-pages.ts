import { PageModel } from '@deeplib/db';
import { isNanoID } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),

    lastPageId: z.string().refine(isNanoID).optional(),
  }),
);

export const getPagesProcedure = once(() => baseProcedure.query(getPages));

export async function getPages({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  if (!(await ctx.userHasPermission(ctx.userId, input.groupId, 'viewGroup'))) {
    throw new TRPCError({
      message: 'Insufficient permissions.',
      code: 'FORBIDDEN',
    });
  }

  let pagesQuery = PageModel.query().where('group_id', input.groupId);

  if (input.lastPageId != null) {
    pagesQuery = pagesQuery.where(
      'last_activity_date',
      '<',
      PageModel.query().findById(input.lastPageId).select('last_activity_date'),
    );
  }

  pagesQuery = pagesQuery
    .orderBy('last_activity_date', 'DESC')
    .limit(21)
    .select('id');

  const pages = await pagesQuery;

  const hasMore = pages.length > 20;

  if (hasMore) {
    pages.pop();
  }

  return {
    pageIds: pages.map((page) => page.id),
    hasMore,
  };
}
