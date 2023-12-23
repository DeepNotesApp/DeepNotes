import { addDays, isNanoID } from '@stdlib/misc';
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

export const deletePermanentlyProcedure = once(() =>
  baseProcedure.mutation(deletePermanently),
);

export async function deletePermanently({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`], [`group-lock:${input.groupId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        // Check permissions

        await ctx.assertSufficientGroupPermissions({
          userId: ctx.userId,
          groupId: input.groupId,
          permission: 'editGroupSettings',
        });

        // Check if group is permanently deleted

        const permanentlyDeletionDate = await ctx.dataAbstraction.hget(
          'group',
          input.groupId,
          'permanent-deletion-date',
        );

        if (
          permanentlyDeletionDate != null &&
          permanentlyDeletionDate < new Date()
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Group is already permanently deleted.',
          });
        }

        // Delete group permanently

        await ctx.dataAbstraction.patch(
          'group',
          input.groupId,
          { permanent_deletion_date: addDays(new Date(), -1) },
          { dtrx },
        );

        checkRedlockSignalAborted(signals);
      });
    },
  );
}
