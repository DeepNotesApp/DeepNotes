import { hget } from '@deeplib/data';
import { isNanoID } from '@stdlib/misc';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { addPageBacklink } from 'src/utils/pages';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    sourcePageId: z.string().refine(isNanoID),
    targetPageId: z.string().refine(isNanoID),
  }),
);

export const createProcedure = once(() => baseProcedure.mutation(create));

export async function create({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  // Check if user has sufficient permissions

  const [sourceGroupId, targetGroupId] = await ctx.dataAbstraction.mhget([
    hget('page', input.sourcePageId, 'group-id'),
    hget('page', input.targetPageId, 'group-id'),
  ]);

  await ctx.assertSufficientGroupPermissions({
    userId: ctx.userId,
    groupId: sourceGroupId,
    permission: 'editGroupPages',
  });

  await ctx.assertSufficientGroupPermissions({
    userId: ctx.userId,
    groupId: targetGroupId,
    permission: 'editGroupPages',
  });

  // Create page link

  await addPageBacklink({
    targetPageId: input.targetPageId,
    sourcePageId: input.sourcePageId,
    dataAbstraction: ctx.dataAbstraction,
  });
}
