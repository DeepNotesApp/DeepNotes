import { PageLinkModel } from '@deeplib/db';
import { isNanoID } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import { once, pull } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    sourcePageId: z.string().refine(isNanoID),
    targetPageId: z.string().refine(isNanoID),
  }),
);

export const deleteProcedure = once(() => baseProcedure.mutation(delete_));

export async function delete_({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  // Check if user has sufficient permissions

  const targetGroupId = await ctx.dataAbstraction.hget(
    'page',
    input.targetPageId,
    'group-id',
  );

  if (
    !(await ctx.userHasPermission(ctx.userId, targetGroupId, 'editGroupPages'))
  ) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions.',
    });
  }

  // Delete page link

  await PageLinkModel.query()
    .where('source_page_id', input.sourcePageId)
    .where('target_page_id', input.targetPageId)
    .delete();

  // Update cache

  const pageBacklinks: string[] = await ctx.dataAbstraction.hget(
    'page-backlinks',
    input.targetPageId,
    'list',
  );

  pull(pageBacklinks, input.sourcePageId);

  await ctx.dataAbstraction.hmset('page-backlinks', input.targetPageId, {
    list: pageBacklinks,
  });
}
