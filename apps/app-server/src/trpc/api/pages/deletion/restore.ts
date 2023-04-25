import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageId: z.string().refine(isNanoID),
  }),
);

export const restoreProcedure = once(() => baseProcedure.mutation(restore));

export async function restore({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`], [`page-lock:${input.pageId}`]],
    async (signals) => {
      const groupId = await ctx.dataAbstraction.hget(
        'page',
        input.pageId,
        'group-id',
      );

      return await ctx.usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          return await ctx.dataAbstraction.transaction(async (dtrx) => {
            // Check permissions

            if (
              !(await ctx.userHasPermission(
                ctx.userId,
                groupId,
                'editGroupPages',
              ))
            ) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Insufficient permissions.',
              });
            }

            // Check if page is deleted

            if (
              (await ctx.dataAbstraction.hget(
                'page',
                input.pageId,
                'permanent-deletion-date',
              )) == null
            ) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Page is not deleted.',
              });
            }

            // Restore page

            await ctx.dataAbstraction.patch(
              'page',
              input.pageId,
              { permanent_deletion_date: null },
              { dtrx },
            );

            checkRedlockSignalAborted(signals);
          });
        },
        signals,
      );
    },
  );
}
