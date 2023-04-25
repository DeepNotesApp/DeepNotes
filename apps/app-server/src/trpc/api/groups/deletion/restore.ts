import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),
  }),
);

export const restoreProcedure = once(() => baseProcedure.mutation(restore));

export async function restore({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`], [`group-lock:${input.groupId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Check permissions

        if (
          !(await ctx.userHasPermission(
            ctx.userId,
            input.groupId,
            'editGroupSettings',
          ))
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Insufficient permissions.',
          });
        }

        // Check if group is deleted

        if (
          (await ctx.dataAbstraction.hget(
            'group',
            input.groupId,
            'permanent-deletion-date',
          )) == null
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Group is not deleted.',
          });
        }

        // Restore group

        await ctx.dataAbstraction.patch(
          'group',
          input.groupId,
          { permanent_deletion_date: null },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);
      });
    },
  );
}
