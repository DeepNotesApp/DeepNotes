import { PageSnapshotModel } from '@deeplib/db';
import type { PageSnapshotInfo } from '@deeplib/misc';
import { isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once, remove } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    pageId: z.string().refine(isNanoID),

    snapshotId: z.string().refine(isNanoID),
  }),
);

export const deleteProcedure = once(() => baseProcedure.mutation(delete_));

export async function delete_({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`page-lock:${input.pageId}`]],
    async (signals) => {
      const groupId = await ctx.dataAbstraction.hget(
        'page',
        input.pageId,
        'group-id',
      );

      checkRedlockSignalAborted(signals);

      return await ctx.usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          return await ctx.dataAbstraction.transaction(async (dtrx) => {
            // Check if user has sufficient permissions

            if (
              !(await ctx.userHasPermission(
                ctx.userId,
                groupId,
                'editGroupPages',
              ))
            ) {
              throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Insufficient permissions.',
              });
            }

            checkRedlockSignalAborted(signals);

            // Load page snapshot infos

            const pageSnapshotInfos: PageSnapshotInfo[] =
              await ctx.dataAbstraction.hget(
                'page-snaphots',
                input.pageId,
                'infos',
              );

            checkRedlockSignalAborted(signals);

            // Remove page snapshot

            await PageSnapshotModel.query(dtrx.trx)
              .findById(input.snapshotId)
              .delete();

            checkRedlockSignalAborted(signals);

            remove(
              pageSnapshotInfos,
              (pageSnapshotInfo) => pageSnapshotInfo.id === input.snapshotId,
            );

            // Update page snapshot infos

            await ctx.dataAbstraction.hmset(
              'page-snaphots',
              input.pageId,
              { infos: pageSnapshotInfos },
              { dtrx },
            );

            checkRedlockSignalAborted(signals);
          });
        },
      );
    },
  );
}
